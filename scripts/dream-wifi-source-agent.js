"use strict";

// Control-plane probe only: this agent authenticates a source endpoint and
// answers reachability checks. It does not proxy user traffic or create a VPN.
const { WebSocket } = require("ws");

const tunnelUrl = String(process.env.DREAM_WIFI_TUNNEL_URL || "").trim();
const sourceToken = String(process.env.DREAM_WIFI_SOURCE_TOKEN || "");

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

function connect() {
  if (stopped) return;
  socket = new WebSocket(tunnelUrl, { perMessageDeflate: false });

  socket.on("open", () => {
    socket.send(JSON.stringify({
      type: "register",
      role: "source",
      sourceToken
    }));
  });

  socket.on("message", (raw) => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch (_) { return; }

    if (message.type === "registered" && message.role === "source") {
      console.log("Dream Tunnel source control connection authenticated.");
    } else if (message.type === "ping" && typeof message.id === "string") {
      socket.send(JSON.stringify({ type: "pong", id: message.id }));
    } else if (message.type === "error") {
      console.error("Dream Tunnel source rejected:", String(message.error || "unknown error"));
      socket.close(1008, "Source rejected");
    }
  });

  socket.on("close", () => {
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
  if (socket) socket.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
connect();
