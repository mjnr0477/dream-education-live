"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");

assert.match(server, /app\.post\(["']\/api\/auth\/refresh["']/,
  "server must expose the session refresh endpoint.");
assert.match(server, /supabaseAuth\.auth\.refreshSession\(\s*\{\s*refresh_token:\s*refreshToken\s*\}\s*\)/,
  "refresh endpoint must use Supabase's refresh-token flow.");
assert.match(server, /access_token:\s*authData\.session\.access_token[\s\S]*?refresh_token:\s*authData\.session\.refresh_token/,
  "refresh endpoint must return both rotated tokens.");
assert.match(app, /fetch\(["']\/api\/auth\/refresh["']/,
  "browser must call the refresh endpoint.");
assert.match(app, /scheduleSavedSessionRefresh\(data\)/,
  "browser must schedule the next refresh after token rotation.");
assert.match(app, /initializePersistentSession\(\)/,
  "browser must initialize saved-session renewal on startup.");
assert.match(app, /clearAuth\(\)/,
  "browser must clear locally saved auth when the server explicitly rejects renewal.");

console.log("Persistent authentication session smoke test passed.");
