"use strict";

const assert = require("assert");
const { buildLearningOutcomeSummary } = require("../product/gli/outcome_intelligence");

const summary = buildLearningOutcomeSummary({
  evidence: {
    concepts: {
      photosynthesis: {
        confidence: 0.9,
        evidence_types: { outcome: 2 }
      }
    }
  },
  decisions: [
    { decision_type: "learning_outcome_feedback", created_at: "2026-10-03T12:00:00Z" }
  ]
});

assert.strictEqual(summary.outcome_evidence_concepts, 1);
assert.strictEqual(summary.feedback_decisions, 1);
assert.strictEqual(summary.status, "strong_outcome_signal");
console.log("Learning outcome intelligence smoke test passed.");
