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
console.log("Health endpoint configuration-report smoke test passed.");
