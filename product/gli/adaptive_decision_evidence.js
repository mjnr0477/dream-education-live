"use strict";

const { recordLearningDecision } = require("./gli_intelligence_service");

function normalizeDecision(decision = {}) {
  return {
    action: decision.action || null,
    topic: decision.topic || null,
    reason: decision.reason || null
  };
}

function buildAdaptiveDecisionRecord({
  learnerId,
  sessionId = null,
  decision = {},
  learningState = null,
  difficulty = null,
  nextQuestion = null,
  subject = null,
  topic = null
} = {}) {
  return {
    learnerId: String(learnerId || "").trim(),
    sessionId: sessionId ? String(sessionId) : null,
    decisionType: "adaptive_next_action",
    decision: {
      selected: normalizeDecision(decision),
      learning_state: learningState || null,
      difficulty: difficulty || null,
      next_question: nextQuestion || null,
      subject: subject || null,
      topic: topic || decision.topic || null
    }
  };
}

async function recordAdaptiveDecision(input = {}) {
  const record = buildAdaptiveDecisionRecord(input);
  if (!record.learnerId) {
    return { persisted: false, reason: "learner_id_required" };
  }

  return recordLearningDecision(record);
}

module.exports = {
  normalizeDecision,
  buildAdaptiveDecisionRecord,
  recordAdaptiveDecision
};
