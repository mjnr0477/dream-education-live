"use strict";

const crypto = require("crypto");

function hashId(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildLearnerGraph(learner, profile = {}, intelligence = {}) {
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

  const evidenceConcepts = new Map(
    (Array.isArray(intelligence.concepts) ? intelligence.concepts : [])
      .filter(concept => concept && concept.concept_key)
      .map(concept => [normalizeConcept(concept.concept_key), concept])
  );

  const enrichedConcepts = concepts.map(concept => {
    const evidence = evidenceConcepts.get(normalizeConcept(concept.label));
    if (!evidence) return concept;
    return {
      ...concept,
      evidence_confidence: evidence.confidence ?? null,
      evidence_signal: evidence.signal || "insufficient_evidence",
      evidence_count: Number(evidence.evidence_count || 0),
      evidence_types: {
        assessment: Number(evidence.assessment_count || 0),
        retrieval: Number(evidence.retrieval_count || 0),
        outcome: Number(evidence.outcome_count || 0)
      },
      evidence_latest_observed_at: evidence.latest_observed_at || null
    };
  });

  const patterns = profile.patterns || {};
  return {
    version: "1.1.0",
    graph_type: "derived_learner_state",
    learner_id: learnerId,
    subject_nodes: subjectNodes,
    concept_nodes: enrichedConcepts,
    patterns: {
      misconception_count: Number(patterns.misconception_count || 0),
      recovered_topics: Array.isArray(patterns.recovered_topics) ? patterns.recovered_topics : [],
      current_misconception_topics: Array.isArray(patterns.current_misconception_topics) ? patterns.current_misconception_topics : []
    },
    relationships: enrichedConcepts.map(concept => ({
      from: "learner:" + learnerId,
      to: concept.id,
      type: "learning_state",
      state: concept.current_state,
      mastery_status: concept.mastery_status
    })),
    generated_at: new Date().toISOString()
  };
}

function normalizeConcept(value) {
  return String(value || "").trim().toLowerCase().replace(/\\s+/g, " ");
}

function buildPortableLearnerId(learnerId) {
  return "did:dream:" + hashId(learnerId).slice(0, 32);
}

module.exports = {
  buildLearnerGraph,
  buildPortableLearnerId
};
