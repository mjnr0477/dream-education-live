"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const server = fs.readFileSync("server.js", "utf8");
const routeStart = server.indexOf('app.get("/api/health", (req, res) => {');
assert.notEqual(routeStart, -1, "health endpoint must exist");
const routeEnd = server.indexOf("\n});", routeStart) + 4;
const route = server.slice(routeStart, routeEnd);
assert.match(route, /const supabaseConfigured = Boolean\(process\.env\.SUPABASE_URL && process\.env\.SUPABASE_KEY\)/);
assert.match(route, /supabase: supabaseConfigured \? "configured" : "not_configured"/);
assert.match(route, /learning_history: supabaseConfigured \? "configured" : "not_configured"/);
assert.match(route, /status: "ok"/);
assert.match(route, /Configuration status is not a live connectivity check/);
assert.doesNotMatch(route, /supabase: "enabled"/, "health must not claim Supabase is enabled when only configuration is unknown");

// The public health payload must never expose environment values or credentials.
const payloadMatch = route.match(/res\.json\(\s*(\{[\s\S]*?\})\s*\);/);
assert.ok(payloadMatch, "health endpoint must have an explicit JSON response payload");
assert.doesNotMatch(
  payloadMatch[1],
  /process\.env|SUPABASE_KEY|OPENAI_API_KEY|API_KEY|secret|token/i,
  "public health payload must not expose environment variables or credential fields"
);

// Keep the live production monitor aligned with the endpoint's documented contract.
const monitor = fs.readFileSync(".github/workflows/production-health-monitor.yml", "utf8");
assert.match(monitor, /status:\s*'ok'/, "production monitor must check the API status");
assert.match(monitor, /supabase:\s*'configured'/, "production monitor must check configuration, not claim live connectivity");
assert.match(monitor, /learning_history:\s*'configured'/, "production monitor must match the health endpoint contract");
assert.doesNotMatch(monitor, /supabase:\s*'enabled'/, "monitor must not confuse configuration with live connectivity");
assert.match(monitor, /\/offline\.html/, "production monitor must verify the offline fallback");
assert.match(monitor, /\/service-worker\.js/, "production monitor must verify the service worker");
assert.match(monitor, /\/manifest\.webmanifest/, "production monitor must verify the install manifest");
assert.match(monitor, /addAll\\\\?\(SHELL_URLS\)/, "production monitor must check app-shell precaching");
assert.match(monitor, /request\\\\?\.mode === \"navigate\"/, "production monitor must check navigation fallback behavior");
assert.match(monitor, /caches\\\\?\.match/, "production monitor must check offline cache fallback");
console.log("Health endpoint and production-monitor contract smoke test passed.");
