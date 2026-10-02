"use strict";

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function buildEvidenceMap(evidenceIntelligence = {}) {
  return new Map(
    (Array.isArray(evidenceIntelligence.concepts) ? evidenceIntelligence.concepts : [])
      .filter(concept => concept && normalize(concept.concept_key))
      .map(concept => [normalize(concept.concept_key), concept])
  );
}

function buildCurriculumIntelligence({
  concepts = [],
  profile = {},
  evidenceIntelligence = {}
} = {}) {
  const topicState = profile.topics || {};
  const evidenceMap = buildEvidenceMap(evidenceIntelligence);

  const nodes = (Array.isArray(concepts) ? concepts : []).map((concept, index) => {
    const name = typeof concept === "string"
      ? concept
      : concept.name || concept.topic || concept.title || "Concept " + (index + 1);

    const normalizedName = normalize(name);
    const state = Object.entries(topicState)
      .find(([topic]) => normalize(topic) === normalizedName);
    const profileEvidence = state ? state[1] || {} : {};
    const evidence = evidenceMap.get(normalizedName) || null;

    const mastered =
      profileEvidence.mastered === true ||
      profileEvidence.mastery_status === "mastered";

    const evidenceSignal = evidence?.signal || "insufficient_evidence";
    const evidenceConfidence =
      evidence?.confidence === null || evidence?.confidence === undefined
        ? null
        : clamp(evidence.confidence);

    /*
     * Evidence is additive to the existing curriculum/profile state.
     * It never overwrites the protected adaptive engine's mastery state.
     * "ready" remains conservative: explicit profile mastery or strong
     * evidence can indicate readiness, while missing evidence never does.
     */
    const ready = mastered || evidenceSignal === "strong";

    return {
      id: String(concept.id || "concept_" + (index + 1)),
      name: String(name),
      status: mastered
        ? "mastered"
        : evidenceSignal !== "insufficient_evidence"
          ? evidenceSignal
          : profileEvidence.current_state || "not_observed",
      ready,
      prerequisites: Array.isArray(concept.prerequisites)
        ? concept.prerequisites
        : [],
      evidence: {
        confidence: evidenceConfidence,
        signal: evidenceSignal,
        count: Number(evidence?.evidence_count || 0),
        by_type: {
          assessment: Number(evidence?.assessment_count || 0),
          retrieval: Number(evidence?.retrieval_count || 0),
          outcome: Number(evidence?.outcome_count || 0)
        },
        latest_observed_at: evidence?.latest_observed_at || null,
        sources: Array.isArray(evidence?.sources) ? evidence.sources : []
      },
      curriculum_alignment: {
        matched: Boolean(evidence),
        basis: evidence ? "learner_evidence_concept_key" : "no_matching_evidence"
      }
    };
  });

  const next = nodes.find(node => !node.ready) || null;

  return {
    version: "1.1.0",
    nodes,
    mastered_count: nodes.filter(n => n.ready).length,
    evidence_aligned_count: nodes.filter(n => n.curriculum_alignment.matched).length,
    evidence_observed_count: nodes.filter(n => n.evidence.count > 0).length,
    next_concept: next,
    progression_complete: Boolean(nodes.length && !next)
  };
}

module.exports = {
  buildCurriculumIntelligence,
  buildEvidenceMap
};
