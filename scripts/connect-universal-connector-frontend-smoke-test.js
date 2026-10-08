"use strict";

const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "public", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const required = [
  'title: "Universal Connector"',
  'action === "universal-connector"',
  "function openUniversalConnector()",
  "/api/product/connect/messenger/broadcast",
  'id="messenger-body"',
  'id="messenger-send"',
  "Sending through every connected and authorized destination",
  "Delivery confirmed:",
  "function openUniversalMessenger()"
];

for (const fragment of required.slice(0, 7)) {
  if (!source.includes(fragment)) {
    throw new Error("Universal Connector frontend requirement missing: " + fragment);
  }
}

if (source.includes(required[7])) {
  throw new Error("Legacy Universal Messenger frontend function still active.");
}

if (source.includes('id="messenger-platform"') ||
    source.includes('id="messenger-channel"') ||
    source.includes('id="messenger-name"') ||
    source.includes('id="messenger-address"')) {
  throw new Error("Universal Connector must not require platform or recipient selection at send time.");
}

console.log("Universal Connector one-message frontend smoke test passed.");
