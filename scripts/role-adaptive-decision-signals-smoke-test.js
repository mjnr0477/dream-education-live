"use strict";

const assert = require("assert");
const {
  learnerSummary
} = require("../product/role_intelligence_engine");

const summary = learnerSummary(
  { learner_id: "l1", name: "Learner" },
  [{ learner_id: "l1", score: 80, topic: "math", created_at: "2026-10-03T10:00:00Z" }],
  [{ learner_id: "l1", evidence_type: "assessment", confidence: 0.9 }],
  [
    { learner_id: "l1", decision_type: "adaptive_next_action", created_at: "2026-10-03T11:00:00Z" },
    { learner_id: "l1", decision_type: "adaptive_next_action", created_at: "2026-10-03T10:00:00Z" }
  ]
);

assert.strictEqual(summary.adaptive_decisions.count, 2);
assert.strictEqual(summary.adaptive_decisions.by_type.adaptive_next_action, 2);
assert.strictEqual(summary.adaptive_decisions.latest_at, "2026-10-03T11:00:00Z");

console.log("Role adaptive decision signals smoke test passed.");
