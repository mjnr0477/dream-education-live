"use strict";

const assert = require("assert");
const { aggregateConceptEvidence, buildLearnerIntelligenceSnapshot } =
  require("../product/gli/learner_intelligence_fusion");

const evidence = [
  { concept_key: "Fractions", evidence_type: "assessment", score: 90, observed_at: "2026-10-01T10:00:00Z" },
  { concept_key: "fractions", evidence_type: "assessment", score: 70, observed_at: "2026-10-02T10:00:00Z" },
  { concept_key: "fractions", evidence_type: "retrieval", confidence: 0.9, source: "curriculum" },
  { concept_key: "algebra", evidence_type: "assessment", score: 30 }
];

const concepts = aggregateConceptEvidence(evidence);
assert.strictEqual(concepts.length, 2);

const fractions = concepts.find(x => x.concept_key === "fractions");
assert.ok(fractions);
assert.strictEqual(fractions.evidence_count, 3);
assert.ok(fractions.confidence > 0.7);

const snapshot = buildLearnerIntelligenceSnapshot({
  profile: { topics: { fractions: { mastery_status: "developing" } } },
  evidence
});

assert.ok(snapshot.signals.strong.includes("fractions"));
assert.ok(snapshot.signals.needs_support.includes("algebra"));
assert.strictEqual(snapshot.evidence_count, 4);

console.log("Learner intelligence fusion smoke test passed");
