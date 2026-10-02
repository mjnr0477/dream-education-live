"use strict";

/*
 * Model-agnostic AI evaluation signals.
 * Pure functions only: safe to run in tests, local development and production.
 */

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value) {
  const n = numberOrNull(value);
  return n === null ? null : Math.max(0, Math.min(1, n));
}

function evaluateTeachingResponse({
  correctness = null,
  evidenceGrounding = null,
  learnerAlignment = null,
  latencyMs = null
} = {}) {
  const metrics = {
    correctness: clamp01(correctness),
    evidence_grounding: clamp01(evidenceGrounding),
    learner_alignment: clamp01(learnerAlignment),
    latency_ms: numberOrNull(latencyMs)
  };

  const scored = [metrics.correctness, metrics.evidence_grounding, metrics.learner_alignment]
    .filter(v => v !== null);

  const quality = scored.length
    ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 1000) / 1000
    : null;

  return {
    version: "1.0.0",
    metrics,
    quality,
    quality_band:
      quality === null ? "unrated" :
      quality >= 0.85 ? "strong" :
      quality >= 0.65 ? "acceptable" :
      "needs_review",
    latency_band:
      metrics.latency_ms === null ? "unknown" :
      metrics.latency_ms <= 1500 ? "fast" :
      metrics.latency_ms <= 5000 ? "moderate" : "slow"
  };
}

function compareModelEvaluations(evaluations = []) {
  const rows = (Array.isArray(evaluations) ? evaluations : [])
    .filter(x => x && x.model)
    .map(x => {
      const evaluation = evaluateTeachingResponse(x);
      return {
        model: String(x.model),
        provider: x.provider ? String(x.provider) : null,
        quality: evaluation.quality,
        latency_ms: evaluation.metrics.latency_ms,
        quality_band: evaluation.quality_band,
        latency_band: evaluation.latency_band
      };
    });

  return {
    version: "1.0.0",
    evaluations: rows,
    comparable: rows.filter(x => x.quality !== null).length >= 2
  };
}

module.exports = { evaluateTeachingResponse, compareModelEvaluations };
