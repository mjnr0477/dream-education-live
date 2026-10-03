"use strict";

const assert = require("assert");
const {
  correlateTeachingOutcome,
  buildOutcomeFeedback,
  normalizeOutcomeAssessment,
  selectTeachingEvaluation
} = require("../product/gli/learning_outcome_evaluation");

const evaluation = {
  session_id: "session-1",
  concept_key: "Photosynthesis",
  observed_at: "2026-10-03T10:00:00Z"
};

const assessment = {
  session_id: "session-1",
  concept_key: "photosynthesis",
  observed_at: "2026-10-03T10:05:00Z",
  correct: true
};

const matched = correlateTeachingOutcome({ evaluation, assessment });
assert.strictEqual(matched.matched, true);
assert.strictEqual(matched.match_basis, "session");

const feedback = buildOutcomeFeedback({ evaluation, assessment });
assert.strictEqual(feedback.outcome_available, true);
assert.strictEqual(feedback.correctness, 1);

const normalized = normalizeOutcomeAssessment({
  score: 80,
  understanding: "strong",
  concept_key: "photosynthesis"
});
assert.strictEqual(normalized.score, 0.8);

const unmatched = buildOutcomeFeedback({
  evaluation,
  assessment: {
    session_id: "different-session",
    concept_key: "algebra",
    observed_at: "2026-10-03T10:05:00Z",
    correct: false
  }
});
assert.strictEqual(unmatched.matched, false);
assert.strictEqual(unmatched.correctness, null);
const questionCorrelated = correlateTeachingOutcome({
  evaluation: {
    concept_key: null,
    question_hash: "q-1",
    observed_at: "2026-10-03T10:00:00Z"
  },
  assessment: {
    concept_key: null,
    question_hash: "q-1",
    observed_at: "2026-10-03T10:05:00Z"
  }
});
assert.strictEqual(questionCorrelated.matched, true);
assert.strictEqual(questionCorrelated.match_basis, "question_and_time");

const normalizedOutcome = normalizeOutcomeAssessment({
  score: 80,
  understanding: "strong",
  concept_key: "photosynthesis"
});
assert.strictEqual(normalizedOutcome.score, 0.8);


console.log("Learning outcome evaluation correlation smoke test passed.");
