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


// Future activity must not inflate retention/adoption, and owner-exempt
// accounts must not be represented as commercial revenue evidence.
const fixedNow = new Date("2026-10-15T12:00:00.000Z");
const guarded = buildValueEvidence({
  activities: [
    { learner_id: "current", created_at: "2026-10-15T11:00:00.000Z" },
    { learner_id: "future", created_at: "2026-10-16T11:00:00.000Z" },
    { learner_id: "old", created_at: "2026-09-01T11:00:00.000Z" }
  ],
  payments: [
    { learner_id: "paid", amount: 350, status: "successful", owner_exempt: false },
    { learner_id: "owner", amount: 350, status: "successful", owner_exempt: true },
    { learner_id: "failed", amount: 350, status: "failed", owner_exempt: false },
    { learner_id: "zero", amount: 0, status: "successful", owner_exempt: false }
  ]
}, fixedNow);
assert.strictEqual(guarded.learner_engagement.active_learners_30d, 1);
assert.strictEqual(guarded.learner_engagement.active_learners_7d, 1);
assert.strictEqual(guarded.commercial_signal.paying_customers, 1);
assert.strictEqual(guarded.commercial_signal.revenue_evidence, 1);

console.log("Value evidence smoke test passed");
