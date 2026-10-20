"use strict";

// Authorized source-side connector. It can open public HTTP/HTTPS TCP streams only.
// This is not a general LAN proxy: private, loopback and link-local destinations are blocked.
const dns = require("node:dns").promises;
const net = require("node:net");
const { WebSocket } = require("ws");

const tunnelUrl = String(process.env.DREAM_WIFI_TUNNEL_URL || "").trim();
const sourceToken = String(process.env.DREAM_WIFI_SOURCE_TOKEN || "");
const MAX_CHUNK = 12 * 1024;
const MAX_WS_BUFFERED_BYTES = 1024 * 1024;
const streams = new Map();
const pendingOpens = new Set();

if (!tunnelUrl || !sourceToken) {
  console.error("Set DREAM_WIFI_TUNNEL_URL and DREAM_WIFI_SOURCE_TOKEN before starting the source agent.");
  process.exit(1);
}
if (!/^wss:\/\//i.test(tunnelUrl)) {
  console.error("DREAM_WIFI_TUNNEL_URL must use wss:// so the source token is encrypted in transit.");
  process.exit(1);
}

let stopped = false;
let socket = null;
let reconnectTimer = null;

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}
function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const p = address.split(".").map(Number);
    if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    const [a, b, c] = p;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a === 255 && b === 255 && c === 255) return false;
    return true;
  }
  if (family === 6) {
    const value = address.toLowerCase();
    if (value.startsWith("::ffff:")) return false;
    const first = parseInt(value.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff && !value.startsWith("2001:db8:");
  }
  return false;
}
async function resolvePublicHost(host) {
  if (net.isIP(host)) {
    if (!isPublicAddress(host)) throw new Error("Private or reserved destination is blocked.");
    return { address: host, family: net.isIP(host) };
  }
  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some(answer => !isPublicAddress(answer.address))) {
    throw new Error("Destination did not resolve exclusively to public IP addresses.");
  }
  return answers[0];
}
function closeStream(id, sendClose) {
  const entry = streams.get(id);
  if (!entry) return;
  streams.delete(id);
  entry.finished = true;
  if (sendClose) send({ type: "tcp-close", id });
  try { entry.socket.destroy(); } catch (_) {}
}
async function openStream(message) {
  const id = message.id;
  const host = typeof message.host === "string" ? message.host.trim() : "";
  const port = Number(message.port);
  if (!validId(id) || !host || host.length > 253 || ![80, 443].includes(port) || streams.has(id)) {
    send({ type: "tcp-error", id: validId(id) ? id : "", error: "Invalid or unsupported TCP destination." });
    return;
  }
  if (streams.size >= 8) {
    send({ type: "tcp-error", id, error: "Source endpoint stream limit reached." });
    return;
  }

  pendingOpens.add(id);
  try {
    const target = await resolvePublicHost(host);
    if (!pendingOpens.has(id) || !socket || socket.readyState !== WebSocket.OPEN) return;
    pendingOpens.delete(id);
    const tcp = net.connect({ host: target.address, family: target.family, port });
    const entry = { socket: tcp, opened: false, finished: false };
    streams.set(id, entry);
    tcp.setTimeout(15000, () => tcp.destroy(new Error("TCP connection timed out.")));

    tcp.once("connect", () => {
      if (entry.finished) return;
      entry.opened = true;
      tcp.setTimeout(5 * 60 * 1000, () => tcp.destroy(new Error("TCP stream idle timeout.")));
      send({ type: "tcp-opened", id });
    });
    tcp.on("data", chunk => {
      if (entry.finished) return;
      tcp.setTimeout(5 * 60 * 1000, () => tcp.destroy(new Error("TCP stream idle timeout.")));
      if (socket && socket.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
        closeStream(id, true);
        return;
      }
      for (let offset = 0; offset < chunk.length; offset += MAX_CHUNK) {
        send({ type: "tcp-data", id, data: chunk.subarray(offset, offset + MAX_CHUNK).toString("base64") });
      }
    });
    tcp.on("error", error => {
      if (entry.finished) return;
      entry.finished = true;
      streams.delete(id);
      if (!entry.opened) send({ type: "tcp-error", id, error: String(error.message || "TCP connection failed").slice(0, 180) });
      else send({ type: "tcp-close", id });
    });
    tcp.on("close", () => {
      if (entry.finished) return;
      entry.finished = true;
      streams.delete(id);
      if (entry.opened) send({ type: "tcp-close", id });
    });
  } catch (error) {
    pendingOpens.delete(id);
    send({ type: "tcp-error", id, error: String(error.message || "Destination rejected").slice(0, 180) });
  }
}

function connect() {
  if (stopped) return;
  socket = new WebSocket(tunnelUrl, { perMessageDeflate: false, maxPayload: 24 * 1024 });
  socket.on("open", () => {
    socket.send(JSON.stringify({ type: "register", role: "source", sourceToken }));
  });
  socket.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch (_) { return; }
    if (message.type === "registered" && message.role === "source") {
      console.log("Dream Tunnel source authenticated; public HTTP/HTTPS relay is ready for owner-authorized tests.");
    } else if (message.type === "ping" && typeof message.id === "string") {
      send({ type: "pong", id: message.id });
    } else if (message.type === "tcp-open") {
      openStream(message);
    } else if (message.type === "tcp-data" && validId(message.id)) {
      const entry = streams.get(message.id);
      if (!entry || entry.finished || typeof message.data !== "string") return;
      const data = Buffer.from(message.data, "base64");
      if (data.length > MAX_CHUNK) return closeStream(message.id, true);
      if (entry.socket.writableLength > MAX_WS_BUFFERED_BYTES) return closeStream(message.id, true);
      entry.socket.write(data);
      entry.socket.setTimeout(5 * 60 * 1000, () => entry.socket.destroy(new Error("TCP stream idle timeout.")));
    } else if (message.type === "tcp-close" && validId(message.id)) {
      pendingOpens.delete(message.id);
      closeStream(message.id, false);
    } else if (message.type === "error") {
      console.error("Dream Tunnel source rejected:", String(message.error || "unknown error"));
      socket.close(1008, "Source rejected");
    }
  });
  socket.on("close", () => {
    pendingOpens.clear();
    for (const id of [...streams.keys()]) closeStream(id, false);
    if (!stopped) {
      console.log("Dream Tunnel source disconnected; retrying in 5 seconds.");
      reconnectTimer = setTimeout(connect, 5000);
    }
  });
  socket.on("error", () => {});
}

function shutdown() {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  for (const id of [...streams.keys()]) closeStream(id, false);
  if (socket) socket.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
connect();
