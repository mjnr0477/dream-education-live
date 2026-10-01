"use strict";

const assert = require("assert");
const { buildValueEvidence } = require("../product/gli/value_evidence_engine");

const evidence = buildValueEvidence({
  outcomes: [
    { baseline: 40, current: 70, improvement: 30, mastered: true },
    { baseline: 60, current: 55, improvement: -5, mastered: false },
    { baseline: 50, current: 80, improvement: 30, mastered: true },
    { baseline: null, current: 90, improvement: null, mastered: false }
  ],
  activities: [
    { learner_id: "a", created_at: new Date().toISOString() },
    { learner_id: "b", created_at: new Date().toISOString() }
  ],
  payments: [
    { learner_id: "a", amount: 350, status: "successful", owner_exempt: false }
  ]
});

assert.strictEqual(evidence.evidence_quality.measured_outcomes, 3);
assert.strictEqual(evidence.learning_impact.average_improvement, 18.33);
assert.strictEqual(evidence.learning_impact.mastered_outcomes, 2);
assert.strictEqual(evidence.learner_engagement.active_learners_30d, 2);
assert.strictEqual(evidence.commercial_signal.paying_customers, 1);
assert.strictEqual(evidence.value_proof_status, "early_evidence");

const { getMetrics } = require("../product/traction_engine");
const metrics = getMetrics();
assert(metrics.value_evidence);
assert.strictEqual(typeof metrics.value_evidence.value_proof_status, "string");

console.log("Value evidence smoke test passed");
