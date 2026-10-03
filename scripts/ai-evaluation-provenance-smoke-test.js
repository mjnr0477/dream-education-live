"use strict";

const assert = require("assert");
const {
  buildAIEvaluationEvidence
} = require("../product/gli/ai_evaluation_evidence");

const record = buildAIEvaluationEvidence({
  learnerId: "learner-1",
  sessionId: "session-1",
  conceptKey: "photosynthesis",
  provider: "test-provider",
  model: "test-model",
  correctness: 0.9,
  evidenceGrounding: 0.8,
  learnerAlignment: 0.7,
  latencyMs: 1200
});

assert.strictEqual(record.learner_id, "learner-1");
assert.strictEqual(record.session_id, "session-1");
assert.strictEqual(record.evidence_type, "outcome");
assert.strictEqual(record.concept_key, "photosynthesis");
assert.strictEqual(record.source, "test-provider");
assert.strictEqual(record.evidence.model, "test-model");
assert.strictEqual(record.evidence.evaluation.quality, 0.8);
assert.strictEqual(record.evidence.evaluation.quality_band, "acceptable");
assert.strictEqual(record.evidence.evaluation.latency_band, "fast");
assert.strictEqual(record.confidence, 0.8);

console.log("AI evaluation provenance smoke test passed.");
