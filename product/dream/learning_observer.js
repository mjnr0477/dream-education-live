"use strict";

const dream = require("./index");

function capabilityId(subject, topic) {
  const subjectPart = String(subject || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const topicPart = String(topic || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return topicPart
    ? `learning_${subjectPart}_${topicPart}`
    : `learning_${subjectPart}`;
}

function observeLearningEvent({
  learner,
  question,
  learner_answer,
  subject,
  topic,
  score,
  understanding,
  feedback
}) {
  if (!learner || !learner.learner_id) {
    throw new Error("learner_required");
  }

  const base = learner;
  const identity = dream.core.ensureIdentity(base, learner);

  const cid = capabilityId(subject, topic);

  const evidence = dream.core.ingestEvidence(identity, {
    type: "assessment",
    title: `${subject || "Learning"}${topic ? ` — ${topic}` : ""} assessment`,
    description: feedback || "Learning assessment evidence.",
    source: "dream_learning_cycle",
    capability_ids: [cid],
    confidence: 0.8,
    verified: false,
    metadata: {
      question: String(question || ""),
      learner_answer: String(learner_answer || ""),
      subject: subject || null,
      topic: topic || null,
      score: Number(score) || 0,
      understanding: understanding || null
    }
  });

  return {
    capability_id: cid,
    evidence_id: evidence.id,
    capability: identity.capabilities[cid],
    evidence_count: identity.evidence.length,
    next_action: identity.next_actions?.[0] || null
  };
}

async function safelyObserveLearningEvent(input, onError) {
  try {
    return observeLearningEvent(input);
  } catch (error) {
    if (typeof onError === "function") {
      onError(error);
    }
    return null;
  }
}

module.exports = {
  capabilityId,
  observeLearningEvent,
  safelyObserveLearningEvent
};
