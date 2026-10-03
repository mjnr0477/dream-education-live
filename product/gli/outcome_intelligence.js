"use strict";

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, numeric));
}

function buildLearningOutcomeSummary({
  evidence = {},
  decisions = []
} = {}) {
  const concepts = evidence?.concepts || evidence?.signals || {};
  const rows = Object.values(concepts).filter(Boolean);

  const outcomeEvidence = rows.filter(row =>
    Number(row?.evidence_types?.outcome || row?.by_type?.outcome || 0) > 0
  );

  const confidenceValues = outcomeEvidence
    .map(row => clamp(row.confidence))
    .filter(value => value !== null);

  const averageOutcomeConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : null;

  const correctnessValues = outcomeEvidence
    .map(row => clamp(row?.evidence?.evaluation?.metrics?.correctness))
    .filter(value => value !== null);

  const averageObservedCorrectness = correctnessValues.length
    ? correctnessValues.reduce((sum, value) => sum + value, 0) / correctnessValues.length
    : null;

  const feedbackDecisions = Array.isArray(decisions)
    ? decisions.filter(item => item?.decision_type === "learning_outcome_feedback")
    : [];

  return {
    version: "1.0.0",
    outcome_evidence_concepts: outcomeEvidence.length,
    feedback_decisions: feedbackDecisions.length,
    average_outcome_confidence: averageOutcomeConfidence,
    observed_outcomes: correctnessValues.length,
    average_observed_correctness: averageObservedCorrectness,
    latest_feedback_at: feedbackDecisions
      .map(item => item.created_at)
      .filter(Boolean)
      .sort()
      .pop() || null,
    status: outcomeEvidence.length === 0
      ? "insufficient_outcome_evidence"
      : averageOutcomeConfidence !== null && averageOutcomeConfidence >= 0.8
        ? "strong_outcome_signal"
        : "developing_outcome_signal"
  };
}

module.exports = {
  clamp,
  buildLearningOutcomeSummary
};
