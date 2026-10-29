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

const refreshRouteMarker = 'app.post("/api/auth/refresh"';
const refreshRouteIndexes = [];
let refreshRouteIndex = server.indexOf(refreshRouteMarker);
while (refreshRouteIndex !== -1) {
  refreshRouteIndexes.push(refreshRouteIndex);
  refreshRouteIndex = server.indexOf(refreshRouteMarker, refreshRouteIndex + refreshRouteMarker.length);
}
assert.equal(refreshRouteIndexes.length, 2,
  "refresh route must have one rate-limit middleware and one account-aware handler");
const middlewareEnd = server.indexOf("\n});", refreshRouteIndexes[0]) + 4;
const refreshMiddleware = server.slice(refreshRouteIndexes[0], middlewareEnd);
const handlerEnd = server.indexOf("\n});", refreshRouteIndexes[1]) + 4;
const refreshHandler = server.slice(refreshRouteIndexes[1], handlerEnd);
assert.match(refreshMiddleware, /checkAuthRateLimit\(req, "refresh"\)/,
  "refresh middleware must rate-limit renewal requests");
assert.match(refreshMiddleware, /return next\(\)/,
  "refresh middleware must delegate without consuming the rotating refresh token");
assert.doesNotMatch(refreshMiddleware, /supabaseAuth\.auth\.refreshSession/,
  "only the account-aware handler may consume the rotating refresh token");
assert.match(refreshHandler, /getAccount\(authData\.user\.id\)/,
  "refresh handler must resolve the authenticated account");
assert.match(refreshHandler, /account,\s*role,\s*profile,/,
  "refresh response must preserve account, role, and profile when saved auth is replaced");

console.log("Persistent authentication session smoke test passed.");
