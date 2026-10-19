"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const page = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "public", "dream-wifi.js"), "utf8");

assert.match(server, /app\.get\(["']\/api\/dream-wifi\/owner-status["']/);
assert.match(server, /supabaseAuth\.auth\.getUser\(match\[1\]\.trim\(\)\)/);
assert.match(server, /isOwnerAccount\(\{ email: user\.email \}\)/);
assert.match(server, /status\(401\)\.json/);
assert.match(server, /status\(403\)\.json/);
assert.match(server, /live_access_enabled:\s*false/);
assert.match(server, /packages_enabled:\s*false/);
assert.match(client, /fetch\(["']\/api\/dream-wifi\/owner-status["']/);
assert.match(client, /Authorization:\s*["']Bearer ["']\s*\+\s*token/);
assert.doesNotMatch(client, /mathiassimiyu52@gmail\.com/i);
assert.match(page, /id=["']dream-wifi-section["']/);
assert.ok(page.indexOf('id="dream-wifi-section"') < page.indexOf('id="dream-search"'),
  "Dream Wi-Fi must appear above Public Search in the landing page.");
assert.match(page, /data-wifi-provider-status/);
assert.match(page, /data-wifi-access-status/);
assert.match(page, /data-wifi-package-status/);

console.log("Dream Wi-Fi owner-gate smoke test passed.");
