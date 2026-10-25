"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const routes = [
  "/api/adaptive/:learner_id",
  "/api/next-question/:learner_id",
  "/api/difficulty/:learner_id",
  "/api/intelligence/:learner_id",
  "/api/mastery/:learner_id/:topic"
];
for (const route of routes) {
  const marker = 'app.get("' + route + '", async (req, res) => {';
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing protected route " + route);
  const end = source.indexOf("\napp.", start + marker.length);
  const body = source.slice(start, end < 0 ? source.length : end);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), route + " must authenticate.");
  assert.ok(body.includes("canAccessLearnerRecord(auth.account, req.params.learner_id, accessStore)"), route + " must enforce learner relationship access.");
  assert.ok(body.includes("status(403)"), route + " must reject unauthorized access.");
}
console.log("legacy-adaptive-access-smoke-test: PASS");
