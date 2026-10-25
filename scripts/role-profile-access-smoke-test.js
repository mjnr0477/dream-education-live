"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const routes = [
  ["/api/product/teacher/:teacher_id", "teacher", "teacher_id"],
  ["/api/product/parent/:parent_id", "parent", "parent_id"],
  ["/api/product/school/:school_id", "school", "school_id"]
];

for (const [route, role, idField] of routes) {
  const marker = 'app.get("' + route + '", async (req, res) => {';
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing protected route " + route);
  const end = source.indexOf("\napp.", start + marker.length);
  const body = source.slice(start, end < 0 ? source.length : end);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), route + " must verify authentication.");
  assert.ok(body.includes("auth.account.owner_account !== true"), route + " must preserve verified owner access.");
  assert.ok(body.includes('auth.account.role !== "' + role + '"'), route + " must enforce the matching role.");
  assert.ok(body.includes("auth.account." + idField), route + " must enforce self-ownership.");
  assert.ok(body.includes("status(403)"), route + " must reject cross-account profile access.");
}

console.log("role-profile-access-smoke-test: PASS");
