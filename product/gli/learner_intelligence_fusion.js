"use strict";

/*
 * Evidence fusion for GLI.
 * Additive only: converts existing assessments/evidence into bounded,
 * explainable learner-intelligence signals. It never changes the protected
 * adaptive decision engine.
 */

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeTopic(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreToConfidence(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return clamp(n / 100);
}

function aggregateConceptEvidence(evidence = []) {
  const buckets = new Map();

  for (const item of Array.isArray(evidence) ? evidence : []) {
    const topic = normalizeTopic(item.concept_key || item.topic || item.subject);
    if (!topic) continue;

    if (!buckets.has(topic)) {
      buckets.set(topic, {
        concept_key: topic,
        evidence_count: 0,
        weighted_confidence: 0,
        confidence_weight: 0,
        assessment_count: 0,
        retrieval_count: 0,
        outcome_count: 0,
        latest_observed_at: null,
        sources: []
      });
    }

    const bucket = buckets.get(topic);
    const confidence = Number.isFinite(Number(item.confidence))
      ? clamp(item.confidence)
      : scoreToConfidence(item.score);

    bucket.evidence_count += 1;
    if (confidence !== null) {
      const weight = item.evidence_type === "assessment" ? 2 : 1;
      bucket.weighted_confidence += confidence * weight;
      bucket.confidence_weight += weight;
    }

    if (item.evidence_type === "assessment") bucket.assessment_count += 1;
    if (item.evidence_type === "retrieval") bucket.retrieval_count += 1;
    if (item.evidence_type === "outcome") bucket.outcome_count += 1;

    const observed = item.observed_at || item.created_at || null;
    if (observed && (!bucket.latest_observed_at || Date.parse(observed) > Date.parse(bucket.latest_observed_at))) {
      bucket.latest_observed_at = observed;
    }

    if (item.source && !bucket.sources.includes(item.source)) {
      bucket.sources.push(String(item.source).slice(0, 120));
    }
  }

  return Array.from(buckets.values()).map(bucket => ({
    ...bucket,
    confidence: bucket.confidence_weight
      ? Math.round((bucket.weighted_confidence / bucket.confidence_weight) * 1000) / 1000
      : null,
    confidence_weight: undefined,
    weighted_confidence: undefined
  }));
}

function buildLearnerIntelligenceSnapshot({ profile = {}, evidence = [] } = {}) {
  const concepts = aggregateConceptEvidence(evidence);
  const profileTopics = profile.topics || {};

  for (const concept of concepts) {
    const existing = profileTopics[concept.concept_key] || {};
    concept.profile_mastery_status = existing.mastery_status || existing.status || null;
    concept.profile_state = existing.current_state || null;

    if (concept.confidence !== null) {
      concept.signal =
        concept.confidence >= 0.8 ? "strong" :
        concept.confidence >= 0.6 ? "developing" :
        concept.confidence >= 0.4 ? "uncertain" : "needs_support";
    } else {
      concept.signal = "insufficient_evidence";
    }
  }

  const signals = {
    strong: concepts.filter(x => x.signal === "strong").map(x => x.concept_key),
    developing: concepts.filter(x => x.signal === "developing").map(x => x.concept_key),
    uncertain: concepts.filter(x => x.signal === "uncertain").map(x => x.concept_key),
    needs_support: concepts.filter(x => x.signal === "needs_support").map(x => x.concept_key)
  };

  return {
    version: "1.0.0",
    concepts,
    signals,
    evidence_count: evidence.length,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  aggregateConceptEvidence,
  buildLearnerIntelligenceSnapshot
};
