"use strict";

const assert = require("assert");
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

console.log("Learning resource progress smoke test passed.");
