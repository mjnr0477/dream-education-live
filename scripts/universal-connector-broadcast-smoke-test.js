"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { broadcastMessage } = require("../product/connect_messenger_engine");

async function main() {
  const calls = [];

  const connectors = [
    {
      id: "email",
      name: "Email",
      platform: "email",
      recipients: [{ type: "person", email: "owner@example.com", platform: "email" }],
      channels: [{
        type: "email",
        platform: "email",
        authorized: true,
        send: async ({ body, recipient }) => {
          calls.push({ platform: "email", body, recipient });
          return { success: true, status: 200 };
        }
      }]
    },
    {
      id: "telegram",
      name: "Telegram",
      platform: "telegram",
      recipients: [{ type: "group", address: "-100123", platform: "telegram" }],
      channels: [{
        type: "direct_message",
        platform: "telegram",
        authorized: true,
        send: async ({ body, recipient }) => {
          calls.push({ platform: "telegram", body, recipient });
          return { success: true, status: 200 };
        }
      }]
    },
    {
      id: "failed",
      name: "Failed Connector",
      platform: "example",
      recipients: [{ type: "group", address: "blocked", platform: "example" }],
      channels: [{
        type: "message",
        platform: "example",
        authorized: true,
        send: async () => ({ success: false, status: 403 })
      }]
    },
    {
      id: "unauthorized",
      name: "Unauthorized",
      platform: "private",
      recipients: [{ type: "person", address: "secret", platform: "private" }],
      channels: [{
        type: "message",
        platform: "private",
        authorized: false,
        send: async () => {
          throw new Error("must not be called");
        }
      }]
    }
  ];

  const result = await broadcastMessage(
    { message_id: "msg_test_broadcast", body: "Dream Education" },
    connectors
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.attempted, 3);
  assert.strictEqual(result.delivered, 2);
  assert.strictEqual(result.failed, 1);
  assert.strictEqual(calls.length, 2);
  assert.ok(calls.every((call) => call.body === "Dream Education"));

  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  const connectorStart = app.indexOf("function openUniversalConnector()");
  assert.ok(connectorStart >= 0, "Universal Connector function must exist");
  const connectorSource = app.slice(connectorStart);
  assert.ok(connectorSource.includes("/api/product/connect/messenger/broadcast"));
  assert.ok(connectorSource.includes('id="messenger-body"'));
  assert.ok(connectorSource.includes('id="messenger-send"'));
  assert.ok(!connectorSource.includes('id="messenger-platform"'));
  assert.ok(!connectorSource.includes('id="messenger-channel"'));
  assert.ok(!connectorSource.includes('id="messenger-name"'));
  assert.ok(!connectorSource.includes('id="messenger-address"'));

  console.log("Universal Connector one-message broadcast smoke test: PASS");
}

main().catch((error) => {
  console.error("Universal Connector one-message broadcast smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
