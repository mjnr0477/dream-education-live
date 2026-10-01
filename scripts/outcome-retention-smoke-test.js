"use strict";

const assert = require("assert");
const { buildOutcomeRetentionIntelligence } = require("../product/gli/outcome_retention_intelligence");

const now = new Date("2026-10-01T00:00:00.000Z");
const data = {
  activities: [
    { learner_id: "a", created_at: "2026-08-01T10:00:00.000Z" },
    { learner_id: "a", created_at: "2026-08-09T10:00:00.000Z" },
    { learner_id: "b", created_at: "2026-09-01T10:00:00.000Z" },
    { learner_id: "b", created_at: "2026-09-08T10:00:00.000Z" },
    { learner_id: "c", created_at: "2026-09-29T10:00:00.000Z" }
  ],
  outcomes: [
    { baseline: 40, current: 60, improvement: 20 },
    { baseline: 50, current: 45, improvement: -5 }
  ]
};

const result = buildOutcomeRetentionIntelligence(data, now);

assert.strictEqual(result.cohorts.total_cohorts, 3);
assert.strictEqual(result.cohorts.retention.day_7_eligible_learners, 2);
assert.strictEqual(result.cohorts.retention.day_7, 0.5);
assert.strictEqual(result.cohorts.retention.day_30_eligible_learners, 1);
assert.strictEqual(result.cohorts.retention.day_30, 0);
assert.strictEqual(result.outcome_quality.measured_outcomes, 2);
assert.strictEqual(result.outcome_quality.positive_improvement_rate, 0.5);
assert.strictEqual(result.outcome_quality.average_improvement, 7.5);

console.log("outcome-retention-smoke-test: PASS");
