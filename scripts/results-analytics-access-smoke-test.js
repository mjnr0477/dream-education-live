"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const cases = [
  ["/api/product/results/teacher/:teacher_id", "teacher", "teacher_id", "get"],
  ["/api/product/results/school/:school_id", "school", "school_id", "get"],
  ["/api/product/teacher/:teacher_id/analytics", "teacher", "teacher_id", "post"],
  ["/api/product/school/:school_id/analytics", "school", "school_id", "post"]
];
for (const [route, role, idField, method] of cases) {
  const marker = 'app.' + method + '("' + route + '", async (req, res) => {';
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing protected route " + route);
  const end = source.indexOf("\napp.", start + marker.length);
  const body = source.slice(start, end < 0 ? source.length : end);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), route + " must verify authentication.");
  assert.ok(body.includes("auth.account.owner_account !== true"), route + " must preserve verified owner access.");
  assert.ok(body.includes('auth.account.role !== "' + role + '"'), route + " must enforce role.");
  assert.ok(body.includes("auth.account." + idField), route + " must enforce self-ownership.");
  assert.ok(body.includes("status(403)"), route + " must reject cross-account access.");
}
const classMarker = 'app.get("/api/product/results/class/:class_id", async (req, res) => {';
const classStart = source.indexOf(classMarker);
assert.notStrictEqual(classStart, -1, "Class results route must exist.");
const classEnd = source.indexOf("\napp.", classStart + classMarker.length);
const classBody = source.slice(classStart, classEnd < 0 ? source.length : classEnd);
assert.ok(classBody.includes("getAuthenticatedAccount(req)"), "Class results must verify authentication.");
assert.ok(classBody.includes("classData.teacher_id"), "Class results must check teacher ownership.");
assert.ok(classBody.includes("classData.school_id"), "Class results must check school ownership.");
assert.ok(classBody.includes("status(403)"), "Class results must reject unrelated accounts.");
console.log("results-analytics-access-smoke-test: PASS");
