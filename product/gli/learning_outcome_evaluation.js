"use strict";

/**
 * Correlates an AI teaching evaluation with the learner outcome observed
 * after that teaching event. This module is pure: it does not alter the
 * adaptive engine or persist data.
 */

function normalizeKey(value) {
  return value == null ? null : String(value).trim().toLowerCase() || null;
}

function normalizeTimestamp(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

function correlateTeachingOutcome({
  evaluation = {},
  assessment = {},
  maxGapMs = 24 * 60 * 60 * 1000
} = {}) {
  const evaluationSession = normalizeKey(evaluation.session_id);
  const assessmentSession = normalizeKey(assessment.session_id);
  const evaluationConcept = normalizeKey(evaluation.concept_key);
  const assessmentConcept = normalizeKey(assessment.concept_key);

  const sessionMatch =
    Boolean(evaluationSession && assessmentSession) &&
    evaluationSession === assessmentSession;

  const conceptMatch =
    Boolean(evaluationConcept && assessmentConcept) &&
    evaluationConcept === assessmentConcept;

  const evaluatedAt = normalizeTimestamp(
    evaluation.observed_at || evaluation.created_at
  );
  const assessedAt = normalizeTimestamp(
    assessment.observed_at || assessment.created_at
  );

  const chronologicalMatch =
    evaluatedAt !== null &&
    assessedAt !== null &&
    assessedAt >= evaluatedAt &&
    assessedAt - evaluatedAt <= maxGapMs;

  const matched = sessionMatch || (conceptMatch && chronologicalMatch);

  return {
    matched,
    match_basis: sessionMatch
      ? "session"
      : conceptMatch && chronologicalMatch
        ? "concept_and_time"
        : null,
    session_match: sessionMatch,
    concept_match: conceptMatch,
    chronological_match: chronologicalMatch,
    gap_ms:
      evaluatedAt !== null && assessedAt !== null
        ? Math.max(0, assessedAt - evaluatedAt)
        : null
  };
}

function buildOutcomeFeedback({
  evaluation = {},
  assessment = {},
  maxGapMs
} = {}) {
  const correlation = correlateTeachingOutcome({
    evaluation,
    assessment,
    maxGapMs
  });

  if (!correlation.matched) {
    return {
      ...correlation,
      outcome_available: false,
      correctness: null
    };
  }

  const correctness =
    typeof assessment.correct === "boolean"
      ? (assessment.correct ? 1 : 0)
      : typeof assessment.score === "number"
        ? Math.max(0, Math.min(1, assessment.score))
        : null;

  return {
    ...correlation,
    outcome_available: correctness !== null,
    correctness
  };
}

module.exports = {
  normalizeKey,
  normalizeTimestamp,
  correlateTeachingOutcome,
  buildOutcomeFeedback
};
