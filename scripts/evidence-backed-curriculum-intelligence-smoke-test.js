"use strict";

const assert = require("assert");
const {
  buildCurriculumIntelligence,
  buildEvidenceMap
} = require("../product/gli/curriculum_intelligence");

const intelligence = {
  concepts: [
    {
      concept_key: "Algebra",
      evidence_count: 3,
      confidence: 0.85,
      signal: "strong",
      assessment_count: 2,
      retrieval_count: 1,
      outcome_count: 0,
      latest_observed_at: "2026-10-02T10:00:00Z",
      sources: ["assessment"]
    },
    {
      concept_key: "Geometry",
      evidence_count: 1,
      confidence: 0.5,
      signal: "uncertain",
      assessment_count: 1,
      retrieval_count: 0,
      outcome_count: 0
    }
  ]
};

assert.strictEqual(buildEvidenceMap(intelligence).size, 2);

const result = buildCurriculumIntelligence({
  concepts: [
    { id: "alg", name: "Algebra", prerequisites: ["numbers"] },
    { id: "geo", name: "Geometry" },
    { id: "calculus", name: "Calculus" }
  ],
  profile: {
    topics: {
      Geometry: { current_state: "CORRECTION" }
    }
  },
  evidenceIntelligence: intelligence
});

assert.strictEqual(result.nodes.length, 3);
assert.strictEqual(result.evidence_aligned_count, 2);
assert.strictEqual(result.evidence_observed_count, 2);
assert.strictEqual(result.nodes[0].evidence.signal, "strong");
assert.strictEqual(result.nodes[0].ready, true);
assert.strictEqual(result.nodes[0].evidence.count, 3);
assert.strictEqual(result.nodes[0].curriculum_alignment.matched, true);
assert.strictEqual(result.nodes[1].evidence.signal, "uncertain");
assert.strictEqual(result.nodes[1].ready, false);
assert.strictEqual(result.nodes[2].evidence.signal, "insufficient_evidence");
assert.strictEqual(result.nodes[2].curriculum_alignment.matched, false);
assert.strictEqual(result.next_concept.id, "geo");
assert.strictEqual(result.progression_complete, false);

console.log("Evidence-backed curriculum intelligence smoke test: PASS");
