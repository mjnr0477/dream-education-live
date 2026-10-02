"use strict";

const assert = require("assert");
const {
  normalizeConceptKey,
  confidenceFromAssessment,
  summarizeAssessment,
  buildAssessmentEvidence
} = require("../product/gli/assessment_evidence_bridge");

const concept = normalizeConceptKey("Photosynthesis / Light & Water");
assert.strictEqual(concept, "photosynthesis_light_water");

assert.strictEqual(confidenceFromAssessment({ score: 90 }), 0.9);
assert.strictEqual(confidenceFromAssessment({ score: 120 }), 1);
assert.strictEqual(confidenceFromAssessment({ score: -10 }), 0);
assert.strictEqual(confidenceFromAssessment({}), null);

const summary = summarizeAssessment({
  score: 70,
  understanding: "partial",
  questionType: "application",
  strengths: "factor identified",
  gaps: "process needs explanation",
  misconceptions: "none",
  feedback: "Good start.",
  evidenceAnalysis: {
    reasoningQuality: "partial",
    completeness: 0.66,
    factorCorrect: true,
    processCorrect: false,
    outcomePresent: true,
    evidence: ["factor", "outcome"]
  }
});

assert.strictEqual(summary.score, 70);
assert.strictEqual(summary.evidence_analysis.reasoning_quality, "partial");
assert.deepStrictEqual(summary.evidence_analysis.evidence, ["factor", "outcome"]);

const evidence = buildAssessmentEvidence({
  learnerId: "learner-1",
  question: "Why does light matter?",
  learnerAnswer: "Light provides energy.",
  subject: "Biology",
  topic: "Photosynthesis",
  level: "secondary",
  assessment: { score: 90, understanding: "strong", questionType: "understanding" },
  retrievedKnowledge: {
    trusted_sources: [{ source: "wikipedia", uri: "https://example.invalid/source" }]
  }
});

assert.strictEqual(evidence.learner_id, "learner-1");
assert.strictEqual(evidence.evidence_type, "assessment");
assert.strictEqual(evidence.concept_key, "photosynthesis");
assert.strictEqual(evidence.confidence, 0.9);
assert.strictEqual(evidence.evidence.learner_answer, "Light provides energy.");
assert.strictEqual(evidence.evidence.retrieval_sources[0].source, "wikipedia");
assert.strictEqual(evidence.metadata.schema, "dream.assessment-evidence.v1");

console.log("Assessment evidence bridge smoke test: SUCCESS");
