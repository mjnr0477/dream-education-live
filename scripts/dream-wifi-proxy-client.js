"use strict";

// Local SOCKS5 client for owner-authorized HTTP/HTTPS traffic through the source endpoint.
// This is not an Android VPNService and does not automatically route all device traffic.
const net = require("node:net");
const crypto = require("node:crypto");
const { WebSocket } = require("ws");

const tunnelUrl = String(process.env.DREAM_WIFI_TUNNEL_URL || "").trim();
const accessToken = String(process.env.DREAM_WIFI_OWNER_ACCESS_TOKEN || "").trim();
const port = Number(process.env.DREAM_WIFI_PROXY_PORT || 1080);
const MAX_CHUNK = 12 * 1024;
const MAX_BUFFER_BYTES = 1024 * 1024;
const streams = new Map();

if (!tunnelUrl || !accessToken) {
  console.error("Set DREAM_WIFI_TUNNEL_URL and DREAM_WIFI_OWNER_ACCESS_TOKEN before starting the proxy client.");
  process.exit(1);
}
if (!/^wss:\/\//i.test(tunnelUrl)) {
  console.error("DREAM_WIFI_TUNNEL_URL must use wss://.");
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("DREAM_WIFI_PROXY_PORT must be an available port between 1024 and 65535.");
  process.exit(1);
}

let socket = null;
let ownerReady = false;
let stopped = false;
let reconnectTimer = null;
let heartbeatTimer = null;
let proxyServer = null;

function send(payload) {
  if (ownerReady && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }
  return false;
}
function sendChunk(id, buffer) {
  for (let offset = 0; offset < buffer.length; offset += MAX_CHUNK) {
    if (!send({ type: "tcp-data", id, data: buffer.subarray(offset, offset + MAX_CHUNK).toString("base64") })) return false;
  }
  return true;
}
function removeStream(id, notifyServer) {
  const entry = streams.get(id);
  if (!entry) return;
  streams.delete(id);
  if (notifyServer) send({ type: "tcp-close", id });
  entry.state = "closed";
}
function failSocks(entry, code) {
  if (entry.state !== "connected") {
    try { entry.local.write(Buffer.from([5, code || 1, 0, 1, 0, 0, 0, 0, 0, 0])); } catch (_) {}
  }
  try { entry.local.end(); } catch (_) {}
  removeStream(entry.id, true);
}
function handleLocalSocket(local) {
  local.setNoDelay(true);
  let state = "greeting";
  let buffer = Buffer.alloc(0);
  let entry = null;
  let closed = false;

  function onData(chunk) {
    if (state === "connected") {
      if (entry && entry.local.writableLength > MAX_BUFFER_BYTES) return failSocks(entry, 1);
      if (!sendChunk(entry.id, chunk)) return failSocks(entry, 1);
      return;
    }
    if (state === "connecting") {
      entry.pending = Buffer.concat([entry.pending, chunk]);
      if (entry.pending.length > MAX_BUFFER_BYTES) failSocks(entry, 1);
      return;
    }
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 4096) return local.destroy();

    while (true) {
      if (state === "greeting") {
        if (buffer.length < 2) return;
        const count = buffer[1];
        if (buffer.length < 2 + count) return;
        const methods = buffer.subarray(2, 2 + count);
        buffer = buffer.subarray(2 + count);
        if (!methods.includes(0)) {
          local.end(Buffer.from([5, 255]));
          return;
        }
        local.write(Buffer.from([5, 0]));
        state = "request";
        continue;
      }

      if (state === "request") {
        if (buffer.length < 4) return;
        if (buffer[0] !== 5 || buffer[1] !== 1 || buffer[2] !== 0) {
          local.end(Buffer.from([5, 7, 0, 1, 0, 0, 0, 0, 0, 0]));
          return;
        }
        const atyp = buffer[3];
        let host, consumed;
        if (atyp === 1) {
          if (buffer.length < 10) return;
          host = Array.from(buffer.subarray(4, 8)).join(".");
          consumed = 10;
        } else if (atyp === 3) {
          if (buffer.length < 5) return;
          const length = buffer[4];
          if (buffer.length < 7 + length) return;
          host = buffer.subarray(5, 5 + length).toString("utf8");
          consumed = 7 + length;
        } else {
          local.end(Buffer.from([5, 8, 0, 1, 0, 0, 0, 0, 0, 0]));
          return;
        }
        const targetPort = buffer.readUInt16BE(consumed - 2);
        buffer = buffer.subarray(consumed);
        if (!host || /\s/.test(host) || host.includes("/") || host.includes("\\") || ![80, 443].includes(targetPort)) {
          local.end(Buffer.from([5, 2, 0, 1, 0, 0, 0, 0, 0, 0]));
          return;
        }
        if (!ownerReady || !socket || socket.readyState !== WebSocket.OPEN) {
          local.end(Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]));
          return;
        }
        const id = crypto.randomUUID();
        entry = { id, local, state: "connecting", pending: buffer, finished: false, setState: value => { state = value; } };
        streams.set(id, entry);
        state = "connecting";
        buffer = Buffer.alloc(0);
        local.pause();
        if (!send({ type: "tcp-open", id, host, port: targetPort })) failSocks(entry, 1);
        return;
      }
      return;
    }
  }

  local.on("data", onData);
  local.on("close", () => {
    closed = true;
    if (entry) removeStream(entry.id, true);
  });
  local.on("error", () => {
    if (entry) removeStream(entry.id, true);
  });
  local.on("end", () => {
    if (entry && entry.state === "connected") send({ type: "tcp-close", id: entry.id });
  });
  // Avoid an unused closed-state ambiguity if the socket closes during handshake.
  local.on("close", () => { if (!closed) closed = true; });
}

function startProxy() {
  if (proxyServer || !ownerReady) return;
  proxyServer = net.createServer(handleLocalSocket);
  proxyServer.on("error", error => {
    console.error("Local SOCKS proxy could not start:", error.message);
    proxyServer = null;
  });
  proxyServer.listen(port, "127.0.0.1", () => {
    console.log("Dream Tunnel SOCKS5 proxy listening on 127.0.0.1:" + port);
    console.log("Only HTTP/HTTPS destinations on TCP ports 80 and 443 are allowed.");
  });
}

function closeAllStreams() {
  for (const [id, entry] of streams.entries()) {
    streams.delete(id);
    entry.state = "closed";
    try { entry.local.destroy(); } catch (_) {}
  }
}
function connect() {
  if (stopped) return;
  socket = new WebSocket(tunnelUrl, { perMessageDeflate: false, maxPayload: 24 * 1024 });
  const currentSocket = socket;
  currentSocket.on("open", () => {
    // Keep intermediary proxies from expiring an otherwise healthy idle WebSocket.
    heartbeatTimer = setInterval(() => {
      if (currentSocket.readyState !== WebSocket.OPEN) return;
      try {
        currentSocket.ping();
      } catch (error) {
        console.error("Dream Tunnel heartbeat failed:", error.message);
      }
    }, 25000);
    currentSocket.send(JSON.stringify({ type: "register", role: "owner", accessToken }));
  });
  currentSocket.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch (_) { return; }
    if (message.type === "registered" && message.role === "owner") {
      ownerReady = true;
      startProxy();
      console.log("Dream Tunnel owner client authenticated.");
    } else if (message.type === "tcp-opened" && typeof message.id === "string") {
      const entry = streams.get(message.id);
      if (!entry || entry.state !== "connecting") return;
      entry.state = "connected";
      entry.setState("connected");
      entry.local.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
      entry.local.resume();
      if (entry.pending.length) {
        const pending = entry.pending;
        entry.pending = Buffer.alloc(0);
        if (!sendChunk(entry.id, pending)) failSocks(entry, 1);
      }
    } else if (message.type === "tcp-data" && typeof message.id === "string") {
      const entry = streams.get(message.id);
      if (!entry || entry.state !== "connected" || typeof message.data !== "string") return;
      const data = Buffer.from(message.data, "base64");
      if (data.length > MAX_CHUNK || entry.local.writableLength > MAX_BUFFER_BYTES) return failSocks(entry, 1);
      if (!entry.local.write(data)) {
        entry.local.pause();
        entry.local.once("drain", () => entry.local.resume());
      }
    } else if (message.type === "tcp-error" && typeof message.id === "string") {
      const entry = streams.get(message.id);
      if (entry) failSocks(entry, 1);
    } else if (message.type === "tcp-close" && typeof message.id === "string") {
      const entry = streams.get(message.id);
      if (entry) {
        streams.delete(message.id);
        entry.state = "closed";
        entry.local.end();
      }
    } else if (message.type === "error") {
      console.error("Dream Tunnel client rejected:", String(message.error || "unknown error"));
      currentSocket.close(1008, "Owner rejected");
    }
  });
  currentSocket.on("close", (code, reason) => {
    // A late close event from an older socket must not affect the current connection.
    if (socket !== currentSocket) return;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    ownerReady = false;
    closeAllStreams();

    // Stop accepting local SOCKS connections while the relay is disconnected.
    // Drop the server reference immediately so the next successful registration
    // can create a fresh listener instead of retaining a stale Server object.
    const previousProxyServer = proxyServer;
    proxyServer = null;
    if (previousProxyServer) {
      try { previousProxyServer.close(); } catch (_) {}
    }

    if (!stopped) {
      const detail = reason && reason.length ? reason.toString("utf8") : "no reason supplied";
      console.error("Dream Tunnel WebSocket closed (code " + code + "; " + detail + ").");
      console.log("Dream Tunnel disconnected; reconnecting in 5 seconds.");
      reconnectTimer = setTimeout(connect, 5000);
    }
  });
  currentSocket.on("error", error => {
    console.error("Dream Tunnel WebSocket error:", error.message);
  });
}

function shutdown() {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  ownerReady = false;
  closeAllStreams();
  const previousProxyServer = proxyServer;
  proxyServer = null;
  if (previousProxyServer) {
    try { previousProxyServer.close(); } catch (_) {}
  }
  if (socket) socket.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
connect();
