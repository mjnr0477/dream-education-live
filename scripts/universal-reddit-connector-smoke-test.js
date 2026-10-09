"use strict";

const assert = require("assert");
const { buildNativeMessengerConnectors } = require("../product/native_messenger_connectors");

async function main() {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url === "https://www.reddit.com/api/v1/access_token") {
      return { ok: true, status: 200, json: async () => ({ access_token: "test-access-token", token_type: "bearer" }) };
    }
    if (url === "https://oauth.reddit.com/api/submit") {
      return { ok: true, status: 200, json: async () => ({ json: { errors: [], data: { url: "https://www.reddit.com/r/learnprogramming/comments/example", name: "t3_example" } } }) };
    }
    if (url === "https://oauth.reddit.com/api/compose") {
      return { ok: true, status: 200, json: async () => ({ json: { errors: [] } }) };
    }
    throw new Error("Unexpected fetch URL: " + url);
  };

  const env = {
    REDDIT_CLIENT_ID: "client-id",
    REDDIT_CLIENT_SECRET: "client-secret",
    REDDIT_REFRESH_TOKEN: "refresh-token",
    REDDIT_USER_AGENT: "web:dream-education:test (by /u/test-owner)",
    REDDIT_BROADCAST_SUBREDDITS: "r/learnprogramming, education",
    REDDIT_MESSAGE_TO: "example_user"
  };
  const connectors = buildNativeMessengerConnectors(env, { fetchImpl });
  const reddit = connectors.find((item) => item.platform === "reddit");
  assert.ok(reddit, "Reddit connector should register when OAuth credentials and targets exist");
  assert.strictEqual(reddit.recipients.length, 3);
  assert.deepStrictEqual(reddit.recipients.map((item) => item.address), ["learnprogramming", "education", "example_user"]);

  const postChannel = reddit.channels.find((item) => item.type === "post");
  assert.ok(postChannel, "Reddit publishing channel should exist");
  const postResult = await postChannel.send({
    body: "A useful educational post for the community.",
    subject: "Learning resources",
    recipient: reddit.recipients[0]
  });
  assert.strictEqual(postResult.success, true);
  assert.strictEqual(postResult.data.url, "https://www.reddit.com/r/learnprogramming/comments/example");

  const messageChannel = reddit.channels.find((item) => item.type === "message");
  assert.ok(messageChannel, "Reddit messaging channel should exist when recipients are configured");
  const messageResult = await messageChannel.send({
    body: "Hello from Dream Education.",
    subject: "Introduction",
    recipient: reddit.recipients[2]
  });
  assert.strictEqual(messageResult.success, true);
  assert.strictEqual(messageResult.data.recipient, "example_user");

  assert.strictEqual(calls.filter((call) => call.url === "https://www.reddit.com/api/v1/access_token").length, 2);
  assert.ok(calls.some((call) => call.url === "https://oauth.reddit.com/api/submit"));
  assert.ok(calls.some((call) => call.url === "https://oauth.reddit.com/api/compose"));

  const withoutCredentials = buildNativeMessengerConnectors({});
  assert.strictEqual(withoutCredentials.some((item) => item.platform === "reddit"), false);

  console.log("Universal Reddit connector smoke test: PASS");
}

main().catch((error) => {
  console.error("Universal Reddit connector smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
