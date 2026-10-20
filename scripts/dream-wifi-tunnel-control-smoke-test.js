"use strict";
const assert = require("node:assert/strict");
const http = require("node:http");
const { WebSocket } = require("ws");
const { attachDreamWifiTunnel } = require("../product/dream_wifi_tunnel_engine");

function waitOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
}
function waitMessage(socket, predicate, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for expected WebSocket message."));
    }, timeoutMs);
    function onMessage(raw) {
      let message;
      try { message = JSON.parse(raw.toString("utf8")); } catch (_) { return; }
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(message);
    }
    socket.on("message", onMessage);
  });
}

async function main() {
  const server = http.createServer((req, res) => { res.writeHead(200); res.end("ok"); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const wss = attachDreamWifiTunnel(server, {
    sourceToken: "test-source-secret",
    supabaseAuth: {
      auth: {
        async getUser(token) {
          if (token === "valid-owner-token") return { data: { user: { email: "owner@example.test" } }, error: null };
          if (token === "valid-user-token") return { data: { user: { email: "learner@example.test" } }, error: null };
          return { data: { user: null }, error: new Error("invalid token") };
        }
      }
    },
    isOwnerAccount: ({ email }) => email === "owner@example.test"
  });

  const url = "ws://127.0.0.1:" + address.port + "/api/dream-education/dream-wifi/tunnel";
  let source, owner, nonOwner;
  try {
    source = new WebSocket(url);
    await waitOpen(source);
    const sourceRegistered = waitMessage(source, m => m.type === "registered");
    source.send(JSON.stringify({ type: "register", role: "source", sourceToken: "test-source-secret" }));
    assert.equal((await sourceRegistered).role, "source");

    owner = new WebSocket(url);
    await waitOpen(owner);
    const ownerRegistered = waitMessage(owner, m => m.type === "registered");
    owner.send(JSON.stringify({ type: "register", role: "owner", accessToken: "valid-owner-token" }));
    assert.equal((await ownerRegistered).role, "owner");

    const pingResult = waitMessage(owner, m => m.type === "ping-result");
    owner.send(JSON.stringify({ type: "ping-source" }));
    const sourcePing = await waitMessage(source, m => m.type === "ping");
    source.send(JSON.stringify({ type: "pong", id: sourcePing.id }));
    const result = await pingResult;
    assert.equal(result.success, true);
    assert.equal(typeof result.latency_ms, "number");

    nonOwner = new WebSocket(url);
    await waitOpen(nonOwner);
    const denied = waitMessage(nonOwner, m => m.type === "error");
    nonOwner.send(JSON.stringify({ type: "register", role: "owner", accessToken: "valid-user-token" }));
    assert.match((await denied).error, /Owner access is required/);

    console.log("Dream Tunnel control-plane smoke test passed.");
  } finally {
    for (const socket of [source, owner, nonOwner]) {
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    }
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
