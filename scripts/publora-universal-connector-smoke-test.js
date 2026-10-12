"use strict";

const assert = require("assert");
const { buildNativeMessengerConnectors } = require("../product/native_messenger_connectors");
const { broadcastMessage } = require("../product/connect_messenger_engine");
const { getPlatform, supportsAction } = require("../product/connect_platform_registry");

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

async function main() {
  assert.strictEqual(getPlatform("publora").name, "Publora");
  assert.strictEqual(supportsAction("publora", "post"), true);

  const calls = [];
  const connectors = buildNativeMessengerConnectors({ PUBLORA_API_KEY: "publora-test-key" }, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === "https://api.publora.com/api/v1/platform-connections") {
        assert.strictEqual(options.method, "GET");
        assert.strictEqual(options.headers["x-publora-key"], "publora-test-key");
        return response(200, {
          connections: [
            { platformId: "bluesky-did:plc:example", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "linkedin-123", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "facebook-456", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "tiktok--video-account", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "youtube-channel-123", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "instagram-789", connectionStatus: "active", tokenStatus: "valid" },
            { platformId: "mastodon-222", connectionStatus: "disconnected", tokenStatus: "invalid" }
          ]
        });
      }
      assert.strictEqual(url, "https://api.publora.com/api/v1/create-post");
      assert.strictEqual(options.method, "POST");
      assert.strictEqual(options.headers["x-publora-key"], "publora-test-key");
      const payload = JSON.parse(options.body);
      assert.strictEqual(payload.content, "Dream Education is a powerful education platform.");
      assert.ok(Date.parse(payload.scheduledTime) > Date.now() + 4 * 60 * 1000);
      assert.deepStrictEqual(payload.platforms, [
        "bluesky-did:plc:example",
        "linkedin-123",
        "facebook-456"
      ]);
      return response(200, {
        success: true,
        postGroupId: "507f1f77bcf86cd799439011",
        scheduledTime: payload.scheduledTime
      });
    }
  });

  const publora = connectors.find((connector) => connector.platform === "publora");
  assert.ok(publora, "Publora connector should register only when an API key exists");
  assert.strictEqual(publora.channels[0].broadcast, true);
  const scheduled = await publora.channels[0].send({
    body: "Dream Education is a powerful education platform.",
    message_id: "publora-smoke-test"
  });
  assert.strictEqual(scheduled.success, true);
  assert.strictEqual(scheduled.data.status, "scheduled");
  assert.strictEqual(scheduled.data.postGroupId, "507f1f77bcf86cd799439011");
  assert.strictEqual(calls.length, 2);

  const withoutKey = buildNativeMessengerConnectors({}, {
    fetchImpl: async () => { throw new Error("Publora must not call without a key"); }
  });
  assert.ok(!withoutKey.some((connector) => connector.platform === "publora"));

  const noTextTargets = buildNativeMessengerConnectors({ PUBLORA_API_KEY: "key" }, {
    fetchImpl: async () => response(200, {
      connections: [
        { platformId: "tiktok--video-account", connectionStatus: "active", tokenStatus: "valid" },
        { platformId: "youtube-channel-123", connectionStatus: "active", tokenStatus: "valid" }
      ]
    })
  }).find((connector) => connector.platform === "publora");
  const rejected = await noTextTargets.channels[0].send({ body: "Text only" });
  assert.strictEqual(rejected.success, false);
  assert.strictEqual(rejected.data.code, "publora_no_text_platforms");

  const broadcast = await broadcastMessage(
    { message_id: "scheduled-receipt-test", body: "A scheduled post" },
    [{
      id: "publora-test",
      name: "Publora",
      platform: "publora",
      channels: [{
        type: "post",
        platform: "publora",
        enabled: true,
        authorized: true,
        broadcast: true,
        send: async () => ({ success: true, status: 200, data: { scheduledTime: "2026-10-13T00:00:00.000Z" } })
      }]
    }]
  );
  assert.strictEqual(broadcast.success, true);
  assert.strictEqual(broadcast.delivered, 0);
  assert.strictEqual(broadcast.scheduled, 1);
  assert.strictEqual(broadcast.failed, 0);
  assert.strictEqual(broadcast.receipts[0].status, "scheduled");

  console.log("Publora Universal Connector smoke test: PASS");
}

main().catch((error) => {
  console.error("Publora Universal Connector smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
