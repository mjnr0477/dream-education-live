"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildNativeMessengerConnectors } = require("../product/native_messenger_connectors");
const { broadcastMessage, createUniversalMessage } = require("../product/connect_messenger_engine");

async function main() {
  const noCredentials = buildNativeMessengerConnectors({}, { emailRecipients: ["buyer@example.com"] });
  assert.ok(!noCredentials.some((connector) => connector.platform === "email"),
    "Email must remain unavailable without provider credentials");

  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "email_test_" + requests.length })
    };
  };

  try {
    const connectors = buildNativeMessengerConnectors({
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "Dream Education <verified@example.com>"
    }, { emailRecipients: ["buyer@example.com", "school@example.org", "buyer@example.com"] });
    const email = connectors.find((connector) => connector.platform === "email");
    assert.ok(email, "Resend Email connector should be configured");
    assert.strictEqual(email.recipients.length, 2, "Email recipients should be deduplicated");
    assert.strictEqual(email.channels[0].authorized, true);

    const result = await broadcastMessage(
      createUniversalMessage({
        body: "Dream Education acquisition opportunity",
        subject: "Dream Education platform",
        recipient: {}
      }),
      [email]
    );
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.attempted, 2);
    assert.strictEqual(result.delivered, 2);
    assert.strictEqual(requests.length, 2);
    assert.ok(requests.every((request) => request.url === "https://api.resend.com/emails"));
    assert.ok(requests.every((request) => request.options.headers.Authorization === "Bearer re_test_key"));
    assert.ok(requests.every((request) => request.body.subject === "Dream Education platform"));
    assert.deepStrictEqual(requests.map((request) => request.body.to[0]).sort(), ["buyer@example.com", "school@example.org"]);
    assert.ok(requests.every((request) => request.body.text === "Dream Education acquisition opportunity"));

    const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
    assert.ok(app.includes('id="messenger-email-recipients"'));
    assert.ok(app.includes('id="messenger-subject"'));
    assert.ok(app.includes("email_recipients: emailRecipientsInput"));
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.ok(server.includes("Owner access is required to broadcast to an ad hoc email list."));
    assert.ok(server.includes("at most 100 recipients."));
    assert.ok(server.includes('connectors.filter((connector) => String(connector.platform || "").toLowerCase() !== "email")'));

    console.log("Universal Connector Resend email delivery smoke test: PASS");
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error("Universal Connector Resend email delivery smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
