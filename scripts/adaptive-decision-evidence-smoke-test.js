"use strict";

const assert = require("assert");
const {
  normalizeDecision,
  buildAdaptiveDecisionRecord
} = require("../product/gli/adaptive_decision_evidence");

const normalized = normalizeDecision({
  action: "consolidate",
  topic: "Algebra",
  reason: "Recent evidence shows partial mastery.",
  internal_detail: "not persisted"
});

assert.deepStrictEqual(normalized, {
  action: "consolidate",
  topic: "Algebra",
  reason: "Recent evidence shows partial mastery."
});

const record = buildAdaptiveDecisionRecord({
  learnerId: "learner-1",
  sessionId: "session-1",
  decision: {
    action: "consolidate",
    topic: "Algebra",
    reason: "Recent evidence shows partial mastery."
  },
  learningState: "CONSOLIDATION",
  difficulty: "intermediate",
  nextQuestion: "Solve a related equation.",
  subject: "Mathematics",
  topic: "Algebra"
});

assert.strictEqual(record.learnerId, "learner-1");
assert.strictEqual(record.sessionId, "session-1");
assert.strictEqual(record.decisionType, "adaptive_next_action");
assert.strictEqual(record.decision.learning_state, "CONSOLIDATION");
assert.strictEqual(record.decision.difficulty, "intermediate");
assert.strictEqual(record.decision.next_question, "Solve a related equation.");
assert.deepStrictEqual(record.decision.selected, {
  action: "consolidate",
  topic: "Algebra",
  reason: "Recent evidence shows partial mastery."
});

console.log("Adaptive decision evidence smoke test passed.");
