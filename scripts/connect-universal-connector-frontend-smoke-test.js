"use strict";

const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "public", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const required = [
  'title: "Universal Connector"',
  'action: "universal-connector"',
  "function openUniversalConnector()",
  "/api/product/connect/messenger/platforms",
  "/api/product/connect/messenger/send",
  "Connected and authorized",
  "Delivered through ",
  'if (action === "universal-connector")'
];

for (const fragment of required) {
  if (!source.includes(fragment)) {
    throw new Error("Universal Connector frontend requirement missing: " + fragment);
  }
}

if (source.includes("function openUniversalMessenger()")) {
  throw new Error("Legacy Universal Messenger frontend function still active.");
}

console.log("Universal Connector frontend smoke test passed.");
