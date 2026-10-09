"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function main() {
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "universal_connector_email_recipients.json"), "utf8"));
  assert.ok(Array.isArray(registry.contacts), "Registry contacts must be an array");
  assert.ok(registry.contacts.length >= 100, "Registry must contain the reviewed global institutional contact set");
  const emails = registry.contacts.map(contact => String(contact.email || "").trim().toLowerCase());
  assert.strictEqual(new Set(emails).size, emails.length, "Registry email addresses must be unique");
  for (const contact of registry.contacts) {
    assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email || ""), "Every contact must have a valid email shape");
    assert.ok(contact.organization, "Every contact must identify an organization");
    assert.ok(contact.source_url, "Every contact must retain source provenance");
  }

  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.ok(server.includes('/api/product/connect/messenger/email-contacts'), "Server must expose the owner-only contact registry endpoint");
  assert.ok(server.includes('auth.account?.owner_account !== true'), "Contact registry must remain owner-only");
  assert.ok(server.includes('Math.min(requestedLimit, 100)'), "Registry endpoint must cap each batch at 100 contacts");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  assert.ok(app.includes('id="messenger-load-contacts"'), "Owner UI must expose contact loading");
  assert.ok(app.includes('/api/product/connect/messenger/email-contacts?offset='), "UI must load registry batches");
  assert.ok(app.includes('email_recipients: emailRecipientsInput?.value.trim() || undefined'), "Loaded contacts must be passed into the existing owner broadcast route");

  console.log("Public education email contact registry smoke test: PASS");
}

try {
  main();
} catch (error) {
  console.error("Public education email contact registry smoke test: FAIL");
  console.error(error);
  process.exit(1);
}
