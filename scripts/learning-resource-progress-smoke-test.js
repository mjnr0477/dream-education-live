"use strict";

const assert = require("assert");
const fs = require("node:fs");
const path = require("node:path");
const {
  normalizeResourceEvent,
  buildResourceEvidence
} = require("../product/learning_resource_progress");

const event = normalizeResourceEvent({
  learner_id: "test-learner",
  completed: true,
  resource: {
    title: "Photosynthesis video",
    type: "video",
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=test"
  },
  topic: "photosynthesis",
  subject: "biology"
});

assert.strictEqual(event.learner_id, "test-learner");
assert.strictEqual(event.completed, true);
assert.strictEqual(event.type, "video");

const evidence = buildResourceEvidence(event);
assert.strictEqual(evidence.understanding, "resource_completed");
assert.strictEqual(evidence.score, 1);

assert.throws(
  () => normalizeResourceEvent({ learner_id: "test-learner", resource: {} }),
  /resource_url_required/
);

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const routeMarker = 'app.post("/api/v1/learning/resources/progress", async (req, res) => {';
const routeStart = serverSource.indexOf(routeMarker);
assert.notStrictEqual(routeStart, -1, "Resource progress endpoint must exist");
const routeEnd = serverSource.indexOf("\napp.", routeStart + routeMarker.length);
const route = serverSource.slice(routeStart, routeEnd < 0 ? serverSource.length : routeEnd);
assert.ok(route.includes("getAuthenticatedAccount(req)"), "Resource progress must require authenticated account");
assert.ok(route.includes('auth.account.role === "learner" && auth.account.learner_id === event.learner_id'),
  "Only the matching learner role and learner ID may submit self progress");
assert.ok(route.includes("auth.account.owner_account === true"), "Verified platform owner access must remain available");
assert.ok(route.includes("if (!isOwner && !isSelf)"), "All other resource progress writes must be denied");
assert.ok(route.indexOf("if (!isOwner && !isSelf)") < route.indexOf("safelyObserveLearningEvent"),
  "Authorization must run before learning evidence is recorded");

console.log("Learning resource progress smoke test passed.");
