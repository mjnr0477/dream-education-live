"use strict";

const crypto = require("crypto");

function hashId(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildLearnerGraph(learner, profile = {}) {
  const learnerId = learner?.learner_id || null;
  const topics = profile.topics || {};
  const subjects = profile.subjects || {};

  const concepts = Object.entries(topics).map(([topic, data]) => ({
    id: "concept_" + hashId(topic).slice(0, 16),
    label: topic,
    mastery_status: data.mastery_status || data.status || "unknown",
    current_state: data.current_state || null,
    average_score: data.average_score ?? null,
    assessments: Number(data.assessments || 0)
  }));

  const subjectNodes = Object.entries(subjects).map(([subject, data]) => ({
    id: "subject_" + hashId(subject).slice(0, 16),
    label: subject,
    average_score: data.average_score ?? null,
    assessments: Number(data.assessments || 0)
  }));

  const patterns = profile.patterns || {};
  return {
    version: "1.1.0",
    graph_type: "derived_learner_state",
    learner_id: learnerId,
    subject_nodes: subjectNodes,
    concept_nodes: concepts,
    patterns: {
      misconception_count: Number(patterns.misconception_count || 0),
      recovered_topics: Array.isArray(patterns.recovered_topics) ? patterns.recovered_topics : [],
      current_misconception_topics: Array.isArray(patterns.current_misconception_topics) ? patterns.current_misconception_topics : []
    },
    relationships: concepts.map(concept => ({
      from: "learner:" + learnerId,
      to: concept.id,
      type: "learning_state",
      state: concept.current_state,
      mastery_status: concept.mastery_status
    })),
    generated_at: new Date().toISOString()
  };
}

function buildPortableLearnerId(learnerId) {
  return "did:dream:" + hashId(learnerId).slice(0, 32);
}

module.exports = {
  buildLearnerGraph,
  buildPortableLearnerId
};
