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

// A shared session must not attribute an assessment that predates teaching.
const preTeaching = correlateTeachingOutcome({
  evaluation: { session_id: "s-2", concept_key: "fractions", observed_at: "2026-10-03T10:10:00Z" },
  assessment: { session_id: "s-2", concept_key: "fractions", observed_at: "2026-10-03T10:00:00Z", correct: true }
});
assert.strictEqual(preTeaching.matched, false);

// A same-session assessment beyond the correlation window is not causal either.
const staleSession = correlateTeachingOutcome({
  evaluation: { session_id: "s-3", concept_key: "fractions", observed_at: "2026-10-01T10:00:00Z" },
  assessment: { session_id: "s-3", concept_key: "fractions", observed_at: "2026-10-03T10:00:00Z", correct: true }
});
assert.strictEqual(staleSession.matched, false);

// A session match is still useful when a legacy record lacks timestamps.
const legacySession = correlateTeachingOutcome({
  evaluation: { session_id: "s-4", concept_key: null },
  assessment: { session_id: "s-4", concept_key: null, correct: true }
});
assert.strictEqual(legacySession.matched, true);
assert.strictEqual(legacySession.match_basis, "session");

// Evaluation selection supports session-only records and prefers the same session.
const sessionEvaluation = {
  evidence_id: "session-eval",
  session_id: "s-5",
  observed_at: "2026-10-03T10:00:00Z",
  evidence: { evaluation: { metrics: {} } }
};
const selectedBySession = selectTeachingEvaluation({
  evaluations: [sessionEvaluation],
  assessment: { session_id: "s-5", observed_at: "2026-10-03T10:05:00Z" }
});
assert.strictEqual(selectedBySession, sessionEvaluation);

// Even when session IDs match, a future evaluation cannot be selected.
assert.strictEqual(selectTeachingEvaluation({
  evaluations: [sessionEvaluation],
  assessment: { session_id: "s-5", observed_at: "2026-10-03T09:55:00Z" }
}), null);

console.log("Learning outcome evaluation correlation smoke test passed.");
