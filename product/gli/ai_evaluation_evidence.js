"use strict";

const {
  evaluateTeachingResponse
} = require("./ai_evaluation_engine");
const {
  persistEvidence,
  persistDecision,
  hashPayload
} = require("./evidence_ledger");

function buildAIEvaluationEvidence({
  learnerId,
  sessionId = null,
  conceptKey = null,
  question = null,
  provider = null,
  model = null,
  correctness = null,
  evidenceGrounding = null,
  learnerAlignment = null,
  latencyMs = null,
  metadata = {}
} = {}) {
  const evaluation = evaluateTeachingResponse({
    correctness,
    evidenceGrounding,
    learnerAlignment,
    latencyMs
  });

  return {
    learner_id: String(learnerId || "").trim(),
    session_id: sessionId ? String(sessionId) : null,
    evidence_type: "outcome",
    concept_key: conceptKey ? String(conceptKey).trim() : null,
    source: provider ? String(provider).trim() : "ai_evaluation",
    evidence: {
      evaluation,
      model: model ? String(model).trim() : null
    },
    confidence: evaluation.quality,
    metadata: {
      ...metadata,
      question_hash: question ? hashPayload({ question }) : null
    }
  };
}

async function recordAIEvaluationEvidence(input = {}) {
  const record = buildAIEvaluationEvidence(input);
  if (!record.learner_id) {
    return { persisted: false, reason: "learner_id_required" };
  }

  const evidenceResult = await persistEvidence(record);
  if (!evidenceResult.persisted) return evidenceResult;

  const decisionResult = await persistDecision({
    learnerId: record.learner_id,
    decisionType: "ai_teaching_evaluation",
    decision: record.evidence,
    evidenceIds: [evidenceResult.evidence.evidence_id],
    modelProvider: input.provider || null,
    modelName: input.model || null
  });

  return {
    persisted: decisionResult.persisted,
    evidence: evidenceResult.evidence,
    decision: decisionResult.decision || null,
    reason: decisionResult.reason || null
  };
}

module.exports = {
  buildAIEvaluationEvidence,
  recordAIEvaluationEvidence
};
