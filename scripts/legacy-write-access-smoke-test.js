"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const cases = [
  ["/api/product/learner", "learner", "learner_id"],
  ["/api/product/teacher", "teacher", "teacher_id"],
  ["/api/product/parent", "parent", "parent_id"],
  ["/api/product/school", "school", "school_id"]
];
for (const [route, role, idField] of cases) {
  const marker = 'app.post("' + route + '", async (req, res) => {';
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing protected write route " + route);
  const end = source.indexOf("\napp.", start + marker.length);
  const body = source.slice(start, end < 0 ? source.length : end);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), route + " must verify authentication.");
  assert.ok(body.includes("auth.account.owner_account !== true"), route + " must preserve verified owner access.");
  assert.ok(body.includes('auth.account.role !== "' + role + '"'), route + " must enforce role.");
  assert.ok(body.includes("auth.account." + idField), route + " must enforce identity ownership.");
  assert.ok(body.includes("status(403)"), route + " must reject cross-account writes.");
}
const classRoute = source.slice(source.indexOf('app.post("/api/product/class"'), source.indexOf('app.get("/api/product/class/:class_id"'));
assert.ok(classRoute.includes("getAuthenticatedAccount(req)"), "Class creation must verify authentication.");
assert.ok(classRoute.includes("requestedTeacherId"), "Class creation must check teacher ownership.");
assert.ok(classRoute.includes("requestedSchoolId"), "Class creation must check school ownership.");
const resultRoute = source.slice(source.indexOf('app.post("/api/product/results"'), source.indexOf('app.get("/api/product/results/learner/:learner_id"'));
assert.ok(resultRoute.includes("getAuthenticatedAccount(req)"), "Result creation must verify authentication.");
assert.ok(resultRoute.includes("classData.teacher_id"), "Teachers must only record results for their own classes.");
assert.ok(resultRoute.includes("status(403)"), "Unauthorized result writes must be rejected.");
console.log("legacy-write-access-smoke-test: PASS");
