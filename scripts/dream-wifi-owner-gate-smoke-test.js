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
assert.match(server, /app\.get\(["']\/api\/dream-wifi\/provider-test["']/);
assert.match(server, /process\.env\.IRONWIFI_API_KEY/);
assert.match(server, /https:\/\/console\.ironwifi\.com\/api/);
assert.match(server, /Authorization:\s*"Bearer " \+ apiKey/);
assert.match(server, /insufficient_permissions/);
assert.match(server, /invalid_api_key/);
assert.match(server, /readCollection\("\/networks\?page=1&page_size=1", "networks"\)/);
assert.match(server, /readCollection\("\/captive-portals\?page=1&page_size=1", "captive-portals"\)/);
assert.match(server, /network_configured:\s*hasNetwork/);
assert.match(server, /captive_portal_configured:\s*hasPortal/);
assert.match(server, /ready_for_hardware_test:\s*readyForHardwareTest/);
assert.match(server, /networkResult\.count !== null && networkResult\.count > 0/);
assert.match(server, /portalResult\.count !== null && portalResult\.count > 0/);
assert.match(client, /fetch\(["']\/api\/dream-wifi\/provider-test["']/);
assert.match(page, /Check network setup/);
assert.match(page, /class="dream-wifi-nav-setup"/);
assert.match(page, /Open setup \/ sign in/);
assert.equal((page.match(/class="dream-wifi-nav-popover"/g) || []).length, 2, "Desktop and mobile Dream Wi-Fi actions must share a contained popover.");
assert.match(fs.readFileSync(path.join(root, "public", "dream-wifi.css"), "utf8"), /\.dream-wifi-nav-popover/);
assert.match(client, /querySelectorAll\("\.dream-wifi-nav-setup"\)/);
assert.match(client, /section\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
assert.match(client, /data-panel="signin"/);


assert.match(client, /fetch\(["']\/api\/dream-wifi\/owner-status["']/);
assert.match(client, /Authorization:\s*["']Bearer ["']\s*\+\s*token/);
assert.doesNotMatch(client, /mathiassimiyu52@gmail\.com/i);
assert.match(page, /id=["']dream-wifi-section["']/);
assert.ok(page.indexOf('id="dream-wifi-section"') < page.indexOf('id="dream-search"'),
  "Dream Wi-Fi must appear above Public Search in the landing page.");
assert.match(page, /data-wifi-provider-status/);
assert.match(page, /dream-wifi\.css\?v=20261019h/);
assert.match(page, /dream-wifi\.js\?v=20261019e/);
assert.match(page, /Setup checklist/);
assert.match(page, /data-wifi-check-api/);
assert.match(page, /data-wifi-check-network/);
assert.match(page, /data-wifi-check-portal/);
assert.match(page, /data-wifi-check-hardware/);
assert.match(client, /Create network in IronWiFi/);
assert.match(client, /Create captive portal in IronWiFi/);
assert.match(client, /Ready for authorized device test/);

assert.match(page, /data-wifi-access-status/);
assert.match(page, /data-wifi-package-status/);

console.log("Dream Wi-Fi owner-gate smoke test passed.");
