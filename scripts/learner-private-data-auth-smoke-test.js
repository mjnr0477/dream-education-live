"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

function routeSource(route) {
  const marker = 'app.get("' + route + '", async (req, res) => {';
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "Missing route: " + route);
  const nextRoute = source.indexOf("\napp.", start + marker.length);
  return source.slice(start, nextRoute === -1 ? source.length : nextRoute);
}

for (const route of ["/api/progress/:learner_id", "/api/profile/:learner_id", "/api/product/learner/:learner_id", "/api/product/results/learner/:learner_id", "/api/product/learner/:learner_id/overview"]) {
  const body = routeSource(route);
  assert.ok(body.includes("getAuthenticatedAccount(req)"), route + " must verify the bearer token.");
  assert.ok(body.includes("status(403)"), route + " must reject unauthorized access.");
  if (route === "/api/progress/:learner_id" || route === "/api/profile/:learner_id") {
    assert.ok(body.includes("auth.account.owner_account !== true"), route + " must preserve verified platform-owner access.");
    assert.ok(body.includes('auth.account.role !== "learner"'), route + " must restrict ordinary access to learner accounts.");
    assert.ok(body.includes('String(auth.account.learner_id || "") !== learnerId'), route + " must enforce learner ownership.");
  } else {
    assert.ok(body.includes("canAccessLearnerRecord(auth.account, req.params.learner_id, store)"), route + " must check role and relationship access.");
  }
}

assert.ok(source.includes("function canAccessLearnerRecord(account, learnerId, store)"), "Shared learner record authorization helper must exist.");
assert.ok(source.includes("chatGroupConnectionExists(store, \"teacher\", teacherId, \"learner\", targetId)"), "Teacher access must require a verified learner connection or class assignment.");
console.log("learner-private-data-auth-smoke-test: PASS");
