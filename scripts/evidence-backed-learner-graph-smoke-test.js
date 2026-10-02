"use strict";

const assert = require("assert");
const { buildLearnerGraph } = require("../product/gli/learner_graph_engine");

const graph = buildLearnerGraph(
  { learner_id: "test-learner" },
  {
    topics: {
      "Photosynthesis": {
        mastery_status: "developing",
        current_state: "CORRECTION",
        average_score: 62,
        assessments: 2
      }
    }
  },
  {
    concepts: [
      {
        concept_key: "photosynthesis",
        confidence: 0.71,
        signal: "developing",
        evidence_count: 3,
        assessment_count: 2,
        retrieval_count: 1,
        outcome_count: 0,
        latest_observed_at: "2026-10-02T00:00:00.000Z"
      }
    ]
  }
);

assert.strictEqual(graph.concept_nodes.length, 1);
assert.strictEqual(graph.concept_nodes[0].evidence_confidence, 0.71);
assert.strictEqual(graph.concept_nodes[0].evidence_signal, "developing");
assert.strictEqual(graph.concept_nodes[0].evidence_count, 3);
assert.deepStrictEqual(graph.concept_nodes[0].evidence_types, {
  assessment: 2,
  retrieval: 1,
  outcome: 0
});
assert.strictEqual(graph.relationships[0].to, graph.concept_nodes[0].id);

console.log("Evidence-backed learner graph smoke test: PASS");
