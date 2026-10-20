"use strict";

const crypto = require("node:crypto");
const { WebSocket, WebSocketServer } = require("ws");

const MAX_MESSAGE_BYTES = 24 * 1024;
const MAX_TCP_CHUNK_BYTES = 12 * 1024;
const MAX_STREAMS_PER_OWNER = 8;
const MAX_WS_BUFFERED_BYTES = 1024 * 1024;
const PING_TIMEOUT_MS = 5000;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function send(socket, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}
function validStreamId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
function decodeChunk(value) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_TCP_CHUNK_BYTES * 4 / 3) + 8 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return null;
  const decoded = Buffer.from(value, "base64");
  return decoded.length <= MAX_TCP_CHUNK_BYTES ? decoded : null;
}

function attachDreamWifiTunnel(server, options = {}) {
  const supabaseAuth = options.supabaseAuth;
  const isOwnerAccount = options.isOwnerAccount;
  const sourceToken = String(options.sourceToken || "");
  const owners = new Set();
  const pendingPings = new Map();
  const streams = new Map();
  let sourceSocket = null;

  const wss = new WebSocketServer({
    server,
    path: "/api/dream-education/dream-wifi/tunnel",
    maxPayload: MAX_MESSAGE_BYTES,
    perMessageDeflate: false
  });

  function sourceConnected() {
    return Boolean(sourceSocket && sourceSocket.readyState === WebSocket.OPEN);
  }
  function broadcastSourceState() {
    const payload = { type: "source-state", connected: sourceConnected() };
    for (const owner of owners) send(owner, payload);
  }
  function reject(socket, message) {
    send(socket, { type: "error", error: message });
    try { socket.close(1008, "Dream Wi-Fi authorization failed"); } catch (_) {}
  }
  function closeStream(id, reason, notifyOwner = true, notifySource = true) {
    const entry = streams.get(id);
    if (!entry) return;
    streams.delete(id);
    if (notifySource) send(entry.source, { type: "tcp-close", id, reason: reason || "closed" });
    if (notifyOwner) send(entry.owner, { type: "tcp-close", id, reason: reason || "closed" });
  }
  function closeStreamsFor(socket, reason) {
    for (const [id, entry] of streams.entries()) {
      if (entry.owner === socket || entry.source === socket) {
        closeStream(id, reason, entry.owner !== socket, entry.source !== socket);
      }
    }
  }
  function clearPingsFor(socket) {
    for (const [id, entry] of pendingPings.entries()) {
      if (entry.owner === socket) {
        clearTimeout(entry.timeout);
        pendingPings.delete(id);
      }
    }
  }

  wss.on("connection", (socket) => {
    socket.dreamRole = null;
    socket.registering = false;

    socket.on("message", async (raw) => {
      if (raw.length > MAX_MESSAGE_BYTES) {
        reject(socket, "Message too large.");
        return;
      }
      let message;
      try { message = JSON.parse(raw.toString("utf8")); }
      catch (_) { reject(socket, "Invalid message format."); return; }
      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        reject(socket, "Invalid message.");
        return;
      }

      if (!socket.dreamRole) {
        if (socket.registering || message.type !== "register") {
          reject(socket, "Register a verified endpoint first.");
          return;
        }
        socket.registering = true;

        if (message.role === "source") {
          if (!sourceToken || !safeEqual(message.sourceToken, sourceToken)) {
            reject(socket, "Source endpoint is not authorized or not configured.");
            return;
          }
          if (sourceSocket && sourceSocket !== socket) {
            try { sourceSocket.close(1012, "Source endpoint replaced"); } catch (_) {}
          }
          sourceSocket = socket;
          socket.dreamRole = "source";
          send(socket, { type: "registered", role: "source" });
          broadcastSourceState();
          return;
        }

        if (message.role === "owner") {
          const accessToken = typeof message.accessToken === "string" ? message.accessToken.trim() : "";
          if (!accessToken || !supabaseAuth || typeof isOwnerAccount !== "function") {
            reject(socket, "Owner authentication is unavailable.");
            return;
          }
          try {
            const result = await supabaseAuth.auth.getUser(accessToken);
            const user = result && result.data ? result.data.user : null;
            if (result.error || !user || !isOwnerAccount({ email: user.email })) {
              reject(socket, "Owner access is required.");
              return;
            }
          } catch (_) {
            reject(socket, "Owner authentication failed.");
            return;
          }
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.dreamRole = "owner";
          owners.add(socket);
          send(socket, { type: "registered", role: "owner" });
          send(socket, { type: "source-state", connected: sourceConnected() });
          return;
        }
        reject(socket, "Unsupported endpoint role.");
        return;
      }

      if (socket.dreamRole === "owner" && message.type === "ping-source") {
        if (!sourceConnected()) {
          send(socket, { type: "ping-result", success: false, error: "Source endpoint is not connected." });
          return;
        }
        const id = crypto.randomUUID();
        const sentAt = Date.now();
        const timeout = setTimeout(() => {
          pendingPings.delete(id);
          send(socket, { type: "ping-result", success: false, error: "Source endpoint did not respond in time." });
        }, PING_TIMEOUT_MS);
        pendingPings.set(id, { owner: socket, sentAt, timeout });
        send(sourceSocket, { type: "ping", id });
        return;
      }

      if (socket.dreamRole === "owner" && message.type === "tcp-open") {
        const id = message.id;
        const host = typeof message.host === "string" ? message.host.trim() : "";
        const port = Number(message.port);
        const activeForOwner = [...streams.values()].filter(entry => entry.owner === socket).length;
        if (!validStreamId(id) || !host || host.length > 253 || /[\s/\\]/.test(host) ||
            ![80, 443].includes(port)) {
          send(socket, { type: "tcp-error", id: validStreamId(id) ? id : "", error: "Only public HTTP/HTTPS TCP destinations are allowed." });
          return;
        }
        if (activeForOwner >= MAX_STREAMS_PER_OWNER) {
          send(socket, { type: "tcp-error", id, error: "Too many concurrent streams." });
          return;
        }
        if (!sourceConnected()) {
          send(socket, { type: "tcp-error", id, error: "Source endpoint is not connected." });
          return;
        }
        if (streams.has(id)) {
          send(socket, { type: "tcp-error", id, error: "Duplicate stream identifier." });
          return;
        }
        streams.set(id, { owner: socket, source: sourceSocket });
        send(sourceSocket, { type: "tcp-open", id, host, port });
        return;
      }

      if (socket.dreamRole === "owner" && message.type === "tcp-data") {
        const entry = streams.get(message.id);
        const chunk = decodeChunk(message.data);
        if (!entry || entry.owner !== socket || !chunk) {
          if (entry && entry.owner === socket) closeStream(message.id, "invalid-data-frame");
          else send(socket, { type: "tcp-error", id: validStreamId(message.id) ? message.id : "", error: "Invalid stream or data frame." });
          return;
        }
        if (entry.source.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
          closeStream(message.id, "source-backpressure-limit");
          return;
        }
        send(entry.source, { type: "tcp-data", id: message.id, data: chunk.toString("base64") });
        return;
      }

      if (socket.dreamRole === "owner" && message.type === "tcp-close") {
        if (validStreamId(message.id)) closeStream(message.id, "owner-closed", false, true);
        return;
      }

      if (socket.dreamRole === "source" && message.type === "pong" && typeof message.id === "string") {
        const entry = pendingPings.get(message.id);
        if (!entry) return;
        clearTimeout(entry.timeout);
        pendingPings.delete(message.id);
        send(entry.owner, { type: "ping-result", success: true, latency_ms: Math.max(0, Date.now() - entry.sentAt) });
        return;
      }

      if (socket.dreamRole === "source" && ["tcp-opened", "tcp-error", "tcp-data", "tcp-close"].includes(message.type)) {
        if (!validStreamId(message.id)) return;
        const entry = streams.get(message.id);
        if (!entry || entry.source !== socket) return;
        if (message.type === "tcp-data") {
          const chunk = decodeChunk(message.data);
          if (!chunk || entry.owner.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
            closeStream(message.id, "owner-backpressure-or-invalid-frame");
            return;
          }
          send(entry.owner, { type: "tcp-data", id: message.id, data: chunk.toString("base64") });
        } else {
          send(entry.owner, message);
          if (message.type === "tcp-close" || message.type === "tcp-error") {
            closeStream(message.id, message.type, false, false);
          }
        }
        return;
      }

      send(socket, { type: "error", error: "Unsupported control message." });
    });

    socket.on("close", () => {
      clearPingsFor(socket);
      closeStreamsFor(socket, "endpoint-disconnected");
      owners.delete(socket);
      if (sourceSocket === socket) {
        sourceSocket = null;
        broadcastSourceState();
      }
    });
    socket.on("error", () => {});
  });

  return wss;
}

module.exports = { attachDreamWifiTunnel };
