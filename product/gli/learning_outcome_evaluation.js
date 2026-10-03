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



const {
  persistEvidence,
  persistDecision,
  listLearnerEvidence,
  hashPayload
} = require("./evidence_ledger");

const DEFAULT_MAX_GAP_MS = 24 * 60 * 60 * 1000;

function normalizeOutcomeAssessment({
  score = null,
  understanding = null,
  observed_at = null,
  concept_key = null,
  session_id = null,
  question = null
} = {}) {
  const numericScore = Number(score);
  return {
    score: Number.isFinite(numericScore)
      ? Math.max(0, Math.min(1, numericScore > 1 ? numericScore / 100 : numericScore))
      : null,
    understanding: understanding ? String(understanding) : null,
    observed_at: observed_at || new Date().toISOString(),
    concept_key: normalizeKey(concept_key),
    session_id: session_id ? String(session_id) : null,
    question_hash: question ? hashPayload({ question }) : null
  };
}

function selectTeachingEvaluation({
  evaluations = [],
  assessment = {},
  maxGapMs = DEFAULT_MAX_GAP_MS
} = {}) {
  const assessmentTime = normalizeTimestamp(assessment.observed_at);
  const assessmentConcept = normalizeKey(assessment.concept_key);
  const assessmentQuestionHash = assessment.question_hash || null;

  const candidates = (Array.isArray(evaluations) ? evaluations : [])
    .filter(item => item && item.evidence && item.evidence.evaluation)
    .map(item => {
      const evaluatedAt = normalizeTimestamp(item.observed_at || item.created_at);
      const conceptMatch =
        Boolean(assessmentConcept && normalizeKey(item.concept_key)) &&
        assessmentConcept === normalizeKey(item.concept_key);
      const questionMatch =
        Boolean(assessmentQuestionHash && item.metadata?.question_hash) &&
        assessmentQuestionHash === item.metadata.question_hash;
      const chronologicalMatch =
        assessmentTime !== null &&
        evaluatedAt !== null &&
        evaluatedAt <= assessmentTime &&
        assessmentTime - evaluatedAt <= maxGapMs;

      return { item, evaluatedAt, conceptMatch, questionMatch, chronologicalMatch };
    })
    .filter(candidate => candidate.chronologicalMatch)
    .sort((a, b) => {
      const aPriority = (a.questionMatch ? 4 : 0) + (a.conceptMatch ? 2 : 0);
      const bPriority = (b.questionMatch ? 4 : 0) + (b.conceptMatch ? 2 : 0);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return (b.evaluatedAt || 0) - (a.evaluatedAt || 0);
    });

  const best = candidates.find(candidate =>
    candidate.questionMatch || candidate.conceptMatch
  );

  return best ? best.item : null;
}

async function findRecentTeachingEvaluation({
  learnerId,
  assessment,
  maxGapMs = DEFAULT_MAX_GAP_MS
} = {}) {
  const evaluations = await listLearnerEvidence(learnerId, {
    evidenceType: "outcome",
    limit: 100
  });

  return selectTeachingEvaluation({ evaluations, assessment, maxGapMs });
}

async function recordLearningOutcomeFeedback({
  learnerId,
  question = null,
  sessionId = null,
  conceptKey = null,
  score = null,
  understanding = null,
  observedAt = null,
  maxGapMs = DEFAULT_MAX_GAP_MS
} = {}) {
  const normalizedLearnerId = String(learnerId || "").trim();
  if (!normalizedLearnerId) {
    return { persisted: false, reason: "learner_id_required" };
  }

  const assessment = normalizeOutcomeAssessment({
    score,
    understanding,
    observed_at: observedAt || new Date().toISOString(),
    concept_key: conceptKey,
    session_id: sessionId,
    question
  });

  let evaluation = await findRecentTeachingEvaluation({
    learnerId: normalizedLearnerId,
    assessment,
    maxGapMs
  });

  if (!evaluation) {
    await new Promise(resolve => setTimeout(resolve, 150));
    evaluation = await findRecentTeachingEvaluation({
      learnerId: normalizedLearnerId,
      assessment,
      maxGapMs
    });
  }

  if (!evaluation) {
    return { persisted: false, reason: "teaching_evaluation_not_found" };
  }

  const feedback = buildOutcomeFeedback({ evaluation, assessment, maxGapMs });

  if (!feedback.matched || !feedback.outcome_available) {
    return {
      persisted: false,
      reason: feedback.matched ? "assessment_outcome_unavailable" : "evaluation_not_correlated",
      feedback
    };
  }

  const evidenceResult = await persistEvidence({
    learner_id: normalizedLearnerId,
    session_id: assessment.session_id || evaluation.session_id || null,
    evidence_type: "outcome",
    concept_key: assessment.concept_key || evaluation.concept_key || null,
    source: "learning_outcome",
    evidence: {
      outcome: {
        score: assessment.score,
        understanding: assessment.understanding,
        match_basis: feedback.match_basis,
        gap_ms: feedback.gap_ms
      },
      teaching_evaluation_evidence_id: evaluation.evidence_id
    },
    confidence: feedback.correctness,
    metadata: {
      source: "api/session",
      outcome_basis: "actual_assessment_result",
      teaching_evaluation_evidence_id: evaluation.evidence_id,
      match_basis: feedback.match_basis
    }
  });

  if (!evidenceResult.persisted) return evidenceResult;

  const decisionResult = await persistDecision({
    learnerId: normalizedLearnerId,
    decisionType: "learning_outcome_feedback",
    decision: {
      outcome: {
        score: assessment.score,
        understanding: assessment.understanding
      },
      teaching_evaluation_evidence_id: evaluation.evidence_id
    },
    evidenceIds: [evaluation.evidence_id, evidenceResult.evidence.evidence_id],
    modelProvider: evaluation.source || null,
    modelName: evaluation.evidence?.model || null
  });

  return {
    persisted: decisionResult.persisted,
    evaluation_evidence_id: evaluation.evidence_id,
    evidence: evidenceResult.evidence,
    decision: decisionResult.decision || null,
    feedback,
    reason: decisionResult.reason || null
  };
}

module.exports = {
  normalizeKey,
  normalizeTimestamp,
  correlateTeachingOutcome,
  buildOutcomeFeedback,
  normalizeOutcomeAssessment,
  selectTeachingEvaluation,
  findRecentTeachingEvaluation,
  recordLearningOutcomeFeedback
};
