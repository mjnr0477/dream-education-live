"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const sql = fs.readFileSync(path.join(root, "database/security/lock_down_learner_records.sql"), "utf8");

function routeSource(route) {
  const marker = 'app.post("' + route + '", async (req, res) => {';
  const start = server.indexOf(marker);
  assert.notEqual(start, -1, "Missing route " + route);
  const next = server.indexOf("\napp.", start + marker.length);
  return server.slice(start, next < 0 ? server.length : next);
}

for (const route of ["/api/assess", "/api/learning-cycle"]) {
  const body = routeSource(route);
  const authAt = body.indexOf("getAuthenticatedAccount(req)");
  const ownershipAt = body.indexOf("canAccessLearnerRecord(auth.account, req.body?.learner_id, accessStore)");
  const payloadAt = body.indexOf("const {");
  assert.ok(authAt >= 0, route + " must verify a Supabase access token");
  assert.ok(ownershipAt > authAt, route + " must authorize the requested learner after authentication");
  assert.ok(payloadAt > ownershipAt, route + " must not process learner data before authorization");
  assert.match(body, /status\(auth\.status \|\| 401\)/, route + " must reject missing or invalid sessions");
  assert.match(body, /status\(403\)/, route + " must reject cross-learner writes");
}

for (const statement of [
  'DROP POLICY IF EXISTS "Allow public learner registration" ON public.dream_learners',
  'DROP POLICY IF EXISTS "Allow learning assessment insert" ON public.learning_assessments',
  'DROP POLICY IF EXISTS "Allow learning assessment read" ON public.learning_assessments',
  "REVOKE ALL ON TABLE",
  "public.dream_learners",
  "public.learning_history",
  "public.learning_assessments",
  "FROM anon, authenticated",
  "TO service_role"
]) assert.ok(sql.includes(statement), "Missing privacy migration statement: " + statement);

assert.doesNotMatch(sql, /\b(TRUNCATE|DELETE FROM|DROP TABLE)\b/i,
  "Privacy hardening must preserve existing learner records and progress");

console.log("legacy-assessment-access-smoke-test: PASS");
