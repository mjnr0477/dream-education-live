"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

function routeSource(marker, label) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, "Missing protected route " + label);
  const end = source.indexOf("\napp.", start + marker.length);
  return source.slice(start, end < 0 ? source.length : end);
}

const parentMarker = 'app.post("/api/product/parent/:parent_id/child-progress", async (req, res) => {';
const parentRoute = routeSource(parentMarker, "parent child-progress");
assert.ok(parentRoute.includes("getAuthenticatedAccount(req)"), "Parent progress must verify authentication");
assert.ok(parentRoute.includes("const isOwner = auth.account.owner_account === true"), "Only verified owner identity may bypass parent ownership");
assert.ok(parentRoute.includes('auth.account.role !== "parent"'), "Parent progress must require the parent role for non-owners");
assert.ok(parentRoute.includes('String(auth.account.parent_id || "") !== String(req.params.parent_id || "")'),
  "Parent progress must enforce parent account ownership");
assert.ok(parentRoute.includes("chatGroupConnectionExists"), "Parent progress must verify a parent-child relationship");
assert.ok(parentRoute.includes("store.learners?.[requestedLearnerId]"), "Parent progress must read the learner from server-owned data");
assert.ok(parentRoute.includes("buildChildProgress(learnerRecord)"), "Parent progress must derive progress from server-owned learner data");
assert.ok(parentRoute.indexOf("if (!isOwner && !alreadyLinked && !activeConnection)") < parentRoute.indexOf("buildChildProgress(learnerRecord)"),
  "Parent-child relationship authorization must precede reading and returning progress");

const schoolMarker = 'app.get("/api/product/school/:school_id/overview", async (req, res) => {';
const schoolRoute = routeSource(schoolMarker, "school overview");
assert.ok(schoolRoute.includes("getAuthenticatedAccount(req)"), "School overview must verify authentication");
assert.ok(schoolRoute.includes("auth.account.owner_account !== true"), "Only verified owner identity may bypass school ownership");
assert.ok(schoolRoute.includes('auth.account.role !== "school"'), "School overview must require the school role for non-owners");
assert.ok(schoolRoute.includes('String(auth.account.school_id || "") !== String(req.params.school_id || "")'),
  "School overview must enforce school account ownership");
assert.ok(schoolRoute.includes("status(403)"), "School overview must reject unrelated accounts");

const adaptiveMarker = 'app.get("/api/adaptive-question/:learner_id", async (req, res) => {';
const adaptiveRoute = routeSource(adaptiveMarker, "adaptive question history");
assert.ok(adaptiveRoute.includes("getAuthenticatedAccount(req)"), "Adaptive history must authenticate");
assert.ok(adaptiveRoute.includes("auth.account.owner_account !== true"), "Only verified owner identity may bypass learner ownership");
assert.ok(adaptiveRoute.includes('auth.account.role !== "learner"'), "Adaptive history must require learner role for non-owners");
assert.ok(adaptiveRoute.includes('String(auth.account.learner_id || "") !== String(req.params.learner_id || "")'),
  "Adaptive history must enforce learner self-ownership");
assert.ok(adaptiveRoute.includes("status(403)"), "Adaptive history must reject cross-account access");
assert.ok(adaptiveRoute.indexOf("getAuthenticatedAccount(req)") < adaptiveRoute.indexOf('.from("learning_assessments")'),
  "Adaptive assessment data must not be queried before authentication");
assert.ok(adaptiveRoute.indexOf("getAuthenticatedAccount(req)") < adaptiveRoute.indexOf('.from("learning_history")'),
  "Adaptive history data must not be queried before authentication");

console.log("parent-school-overview-access-smoke-test: PASS");
