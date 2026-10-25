"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const cases = [
  ['app.post("/api/product/parent/:parent_id/child-progress", async (req, res) => {', "parent"],
  ['app.get("/api/product/school/:school_id/overview", async (req, res) => {', "school"]
];
for (const [marker, role] of cases) {
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing protected route " + marker);
  const end = source.indexOf("\napp.", start + marker.length);
  const body = source.slice(start, end < 0 ? source.length : end);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), "Route must verify authentication.");
  assert.ok(body.includes("isOwner = auth.account.owner_account === true") || body.includes("auth.account.owner_account === true"), "Verified owner access must remain available.");
  assert.ok(body.includes('auth.account.role !== "' + role + '"'), "Route must enforce the matching role.");
  assert.ok(body.includes("status(403)"), "Route must reject unrelated accounts.");
}
const parentRoute = source.slice(source.indexOf(cases[0][0]), source.indexOf("\napp.", source.indexOf(cases[0][0]) + cases[0][0].length));
assert.ok(parentRoute.includes("chatGroupConnectionExists"), "Parent progress must require an existing relationship before linking a child.");
assert.ok(parentRoute.includes("store.learners"), "Parent progress must use server-owned learner data, not client-supplied progress.");
console.log("parent-school-overview-access-smoke-test: PASS");
