"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "public/chat-workspace.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const apiStart = workspace.indexOf("async function api(url, options)");
const apiEnd = workspace.indexOf("\n  function showPanel()", apiStart);
assert.notEqual(apiStart, -1);
assert.notEqual(apiEnd, -1);
const api = workspace.slice(apiStart, apiEnd);
assert.match(api, /setTimeout\(function \(\) \{ controller\.abort\(\); \}, 15000\)/);
assert.ok(api.indexOf("data = await response.json()") < api.indexOf("window.clearTimeout(timeoutId)"),
  "Chat timeout must remain active while the response body is parsed.");
assert.match(api, /Chat request timed out/);
assert.match(index, /chat-workspace\.js\?v=20261022c/);
console.log("Chat response timeout smoke test passed.");
