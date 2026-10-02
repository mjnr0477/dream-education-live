"use strict";

const crypto = require("crypto");
const { persistEvidence, persistDecision, hashPayload } = require("./evidence_ledger");

function normalizeConceptKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 160);
}

function confidenceFromAssessment(assessment = {}) {
  const score = Number(assessment.score);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(1, score / 100));
}

function summarizeAssessment(assessment = {}) {
  return {
    score: Number.isFinite(Number(assessment.score)) ? Number(assessment.score) : null,
    understanding: assessment.understanding || null,
    question_type: assessment.questionType || null,
    strengths: assessment.strengths || null,
    gaps: assessment.gaps || null,
    misconceptions: assessment.misconceptions || null,
    feedback: assessment.feedback || null,
    evidence_analysis: assessment.evidenceAnalysis
      ? {
          reasoning_quality: assessment.evidenceAnalysis.reasoningQuality || null,
          completeness: assessment.evidenceAnalysis.completeness ?? null,
          factor_correct: assessment.evidenceAnalysis.factorCorrect ?? null,
          process_correct: assessment.evidenceAnalysis.processCorrect ?? null,
          outcome_present: assessment.evidenceAnalysis.outcomePresent ?? null,
          evidence: Array.isArray(assessment.evidenceAnalysis.evidence)
            ? assessment.evidenceAnalysis.evidence.slice(0, 20)
            : []
        }
      : null
  };
}

function buildAssessmentEvidence({
  learnerId,
  sessionId = null,
  question,
  learnerAnswer,
  subject = "",
  topic = "",
  level = "",
  assessment = {},
  retrievedKnowledge = null
} = {}) {
  const conceptKey = normalizeConceptKey(topic || subject || "general_learning");
  const summary = summarizeAssessment(assessment);
  const retrievalSources = Array.isArray(retrievedKnowledge?.trusted_sources)
    ? retrievedKnowledge.trusted_sources
        .map(source => ({
          source: source?.source || null,
          uri: source?.uri || source?.source_uri || null
        }))
        .filter(source => source.source || source.uri)
        .slice(0, 20)
    : [];

  return {
    learner_id: String(learnerId || "").trim(),
    session_id: sessionId,
    evidence_type: "assessment",
    concept_key: conceptKey || null,
    source: "dream_assessment_engine",
    source_uri: null,
    content_hash: hashPayload({
      question: String(question || ""),
      assessment: summary,
      retrieval_sources: retrievalSources
    }),
    confidence: confidenceFromAssessment(assessment),
    evidence: {
      question_hash: crypto.createHash("sha256").update(String(question || "")).digest("hex"),
      learner_answer: learnerAnswer,
      subject: String(subject || "").slice(0, 160),
      topic: String(topic || "").slice(0, 160),
      level: String(level || "").slice(0, 160),
      assessment: summary,
      retrieval_sources: retrievalSources
    },
    metadata: {
      schema: "dream.assessment-evidence.v1",
      privacy: "learner_answer_is_hashed_by_ledger"
    }
  };
}

async function recordAssessmentEvidence(input = {}) {
  const evidence = buildAssessmentEvidence(input);
  if (!evidence.learner_id) return { persisted: false, reason: "learner_id_required" };

  const storedEvidence = await persistEvidence(evidence);
  const evidenceId = storedEvidence?.evidence?.evidence_id;

  const decision = await persistDecision({
    learnerId: evidence.learner_id,
    decisionType: "assessment",
    decision: {
      concept_key: evidence.concept_key,
      confidence: evidence.confidence,
      assessment: summarizeAssessment(input.assessment || {})
    },
    evidenceIds: evidenceId ? [evidenceId] : [],
    modelProvider: "dream_assessment_engine",
    modelName: "assessment_engine"
  });

  return {
    evidence: storedEvidence,
    decision,
    concept_key: evidence.concept_key,
    confidence: evidence.confidence
  };
}

module.exports = {
  normalizeConceptKey,
  confidenceFromAssessment,
  summarizeAssessment,
  buildAssessmentEvidence,
  recordAssessmentEvidence
};
