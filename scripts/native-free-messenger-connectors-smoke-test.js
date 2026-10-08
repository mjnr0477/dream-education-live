"use strict";

const assert = require("assert");
const { buildNativeMessengerConnectors } = require("../product/native_messenger_connectors");

function find(connectors, platform) {
  return connectors.find((connector) => connector.platform === platform);
}

async function main() {
  const env = {
    MATRIX_ACCESS_TOKEN: "matrix-token",
    MATRIX_BROADCAST_ROOM_IDS: "!room:example.org,!room2:example.org",
    MATRIX_HOMESERVER_URL: "https://matrix.example.org",
    MASTODON_ACCESS_TOKEN: "mastodon-token",
    MASTODON_BASE_URL: "https://mastodon.example",
    BLUESKY_IDENTIFIER: "dream.test",
    BLUESKY_APP_PASSWORD: "app-password",
    BLUESKY_SERVICE_URL: "https://bsky.example",
    DISCORD_BROADCAST_WEBHOOK_URLS: "https://discord.example/a, https://discord.example/b"
  };

  const connectors = buildNativeMessengerConnectors(env);

  assert.ok(find(connectors, "matrix"));
  assert.ok(find(connectors, "mastodon"));
  assert.ok(find(connectors, "bluesky"));
  assert.ok(find(connectors, "discord"));

  const matrix = find(connectors, "matrix");
  assert.strictEqual(matrix.recipients.length, 2);
  assert.strictEqual(matrix.channels[0].broadcast, undefined);
  assert.strictEqual(matrix.channels[0].authorized, true);

  const mastodon = find(connectors, "mastodon");
  assert.strictEqual(mastodon.channels[0].broadcast, true);
  assert.strictEqual(mastodon.channels[0].type, "post");

  const bluesky = find(connectors, "bluesky");
  assert.strictEqual(bluesky.channels[0].broadcast, true);

  const discord = find(connectors, "discord");
  assert.strictEqual(discord.recipients.length, 2);

  assert.deepStrictEqual(buildNativeMessengerConnectors({}), []);

  console.log("Native free/open messenger connectors smoke test: PASS");
}

main().catch((error) => {
  console.error("Native free/open messenger connectors smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
