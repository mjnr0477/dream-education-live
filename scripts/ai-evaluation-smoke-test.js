"use strict";
const assert = require("assert");
const { evaluateTeachingResponse, compareModelEvaluations } = require("../product/gli/ai_evaluation_engine");

const r = evaluateTeachingResponse({
  correctness: 0.9,
  evidenceGrounding: 0.8,
  learnerAlignment: 0.9,
  latencyMs: 1200
});
assert.strictEqual(r.quality, 0.867);
assert.strictEqual(r.quality_band, "strong");
assert.strictEqual(r.latency_band, "fast");

const comparison = compareModelEvaluations([
  { model: "model-a", provider: "a", correctness: 0.9, evidenceGrounding: 0.9, learnerAlignment: 0.8, latencyMs: 1000 },
  { model: "model-b", provider: "b", correctness: 0.7, evidenceGrounding: 0.8, learnerAlignment: 0.7, latencyMs: 4000 }
]);
assert.strictEqual(comparison.comparable, true);
assert.strictEqual(comparison.evaluations.length, 2);

console.log("AI evaluation smoke test passed");
