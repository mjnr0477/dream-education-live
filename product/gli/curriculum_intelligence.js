"use strict";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function buildCurriculumIntelligence({ concepts = [], profile = {} } = {}) {
  const topicState = profile.topics || {};
  const nodes = (Array.isArray(concepts) ? concepts : []).map((concept, index) => {
    const name = typeof concept === "string"
      ? concept
      : concept.name || concept.topic || concept.title || "Concept " + (index + 1);
    const state = Object.entries(topicState).find(([topic]) => normalize(topic) === normalize(name));
    const evidence = state ? state[1] || {} : {};
    const mastered = evidence.mastered === true || evidence.mastery_status === "mastered";
    return {
      id: String(concept.id || "concept_" + (index + 1)),
      name: String(name),
      status: mastered ? "mastered" : evidence.current_state || "not_observed",
      ready: mastered,
      prerequisites: Array.isArray(concept.prerequisites) ? concept.prerequisites : []
    };
  });

  const next = nodes.find(node => !node.ready) || null;
  return {
    version: "1.0.0",
    nodes,
    mastered_count: nodes.filter(n => n.ready).length,
    next_concept: next,
    progression_complete: Boolean(nodes.length && !next)
  };
}

module.exports = { buildCurriculumIntelligence };
