"use strict";

const assert = require("assert");
const { buildNativeMessengerConnectors } = require("../product/native_messenger_connectors");

async function main() {
  assert.ok(!buildNativeMessengerConnectors({}).some((item) => item.platform === "postwire"));

  const calls = [];
  const connectors = buildNativeMessengerConnectors({
    POSTWIRE_API_KEY: "pw_live_test_secret",
    POSTWIRE_PLATFORMS: "bluesky, mastodon"
  }, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          posted: 2,
          results: [
            { ok: true, platform: "bluesky", url: "https://example.test/post/1" },
            { ok: true, platform: "mastodon", url: "https://example.test/post/2" }
          ]
        })
      };
    }
  });

  const connector = connectors.find((item) => item.platform === "postwire");
  assert.ok(connector, "PostWire connector should register when the server key exists");
  assert.strictEqual(connector.channels[0].broadcast, true);
  const delivered = await connector.channels[0].send({
    body: "Dream Education helps learners learn adaptively.",
    message_id: "postwire-smoke-test"
  });
  assert.strictEqual(delivered.success, true);
  assert.strictEqual(delivered.data.platforms_posted.length, 2);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, "https://postwire.io/api/post");
  assert.strictEqual(calls[0].options.headers.Authorization, "Bearer pw_live_test_secret");
  const request = JSON.parse(calls[0].options.body);
  assert.deepStrictEqual(request.platforms, ["bluesky", "mastodon"]);
  assert.strictEqual(request.text, "Dream Education helps learners learn adaptively.");
  assert.strictEqual(request.idempotency_key, "postwire-smoke-test");

  let step = 0;
  const discovered = buildNativeMessengerConnectors({
    POSTWIRE_API_KEY: "pw_live_test_secret"
  }, {
    fetchImpl: async (url, options) => {
      step += 1;
      if (step === 1) {
        assert.strictEqual(url, "https://postwire.io/api/connections");
        assert.strictEqual(options.headers.Authorization, "Bearer pw_live_test_secret");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            connections: [
              { platform: "telegram", connected: true },
              { network: "discord", status: "connected" },
              { platform: "linkedin", connected: false }
            ]
          })
        };
      }
      assert.strictEqual(url, "https://postwire.io/api/post");
      assert.deepStrictEqual(JSON.parse(options.body).platforms, ["telegram", "discord"]);
      return { ok: true, status: 200, json: async () => ({ posted: 1, results: [{ ok: true, platform: "telegram" }, { ok: false, platform: "discord", code: "not_connected" }] }) };
    }
  });
  const discoveryConnector = discovered.find((item) => item.platform === "postwire");
  const partial = await discoveryConnector.channels[0].send({ body: "Test", message_id: "discovery-test" });
  assert.strictEqual(step, 2);
  assert.strictEqual(partial.success, true);
  assert.deepStrictEqual(partial.data.platforms_posted, ["telegram"]);

  const pending = buildNativeMessengerConnectors({
    POSTWIRE_API_KEY: "pw_live_test_secret",
    POSTWIRE_PLATFORMS: "bluesky"
  }, {
    fetchImpl: async () => ({
      ok: true,
      status: 202,
      json: async () => ({ ok: true, posted: 0, status: "pending_approval" })
    })
  });
  const held = await pending.find((item) => item.platform === "postwire").channels[0].send({ body: "Needs approval" });
  assert.strictEqual(held.success, false, "pending approval must not be reported as published");
  assert.strictEqual(held.data.pending_approval, true);

  console.log("PostWire universal broadcast connector smoke test: PASS");
}

main().catch((error) => {
  console.error("PostWire universal broadcast connector smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
