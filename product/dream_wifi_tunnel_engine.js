"use strict";

const crypto = require("node:crypto");
const { WebSocket, WebSocketServer } = require("ws");

const MAX_MESSAGE_BYTES = 4096;
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

function attachDreamWifiTunnel(server, options = {}) {
  const supabaseAuth = options.supabaseAuth;
  const isOwnerAccount = options.isOwnerAccount;
  const sourceToken = String(options.sourceToken || "");
  const owners = new Set();
  const pendingPings = new Map();
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

    socket.on("message", async (raw) => {
      if (raw.length > MAX_MESSAGE_BYTES) {
        reject(socket, "Message too large.");
        return;
      }

      let message;
      try {
        message = JSON.parse(raw.toString("utf8"));
      } catch (_) {
        reject(socket, "Invalid message format.");
        return;
      }

      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        reject(socket, "Invalid message.");
        return;
      }

      if (!socket.dreamRole) {
        if (message.type !== "register") {
          reject(socket, "Register a verified endpoint first.");
          return;
        }

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

      if (socket.dreamRole === "source" && message.type === "pong" && typeof message.id === "string") {
        const entry = pendingPings.get(message.id);
        if (!entry) return;
        clearTimeout(entry.timeout);
        pendingPings.delete(message.id);
        send(entry.owner, {
          type: "ping-result",
          success: true,
          latency_ms: Math.max(0, Date.now() - entry.sentAt)
        });
        return;
      }

      send(socket, { type: "error", error: "Unsupported control message." });
    });

    socket.on("close", () => {
      clearPingsFor(socket);
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
