"use strict";

const crypto = require("crypto");
const gliPostgres = require("../../infrastructure/database/postgres");

const SENSITIVE_KEY = /^(password|passwd|secret|token|api[_-]?key|authorization|cookie|email|phone|address)$/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      if (SENSITIVE_KEY.test(key)) return out;
      if (key === "raw_answer" || key === "learner_answer") {
        const raw = String(value[key] || "");
        out[key === "raw_answer" ? "answer_hash" : "learner_answer_hash"] =
          crypto.createHash("sha256").update(raw).digest("hex");
        out[key === "raw_answer" ? "answer_length" : "learner_answer_length"] = raw.length;
        return out;
      }
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  if (typeof value === "string") return value.slice(0, 4000);
  return value;
}

function hashPayload(value) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function normalizeEvidence(input = {}) {
  const confidence = Number(input.confidence);
  return {
    learner_id: String(input.learner_id || "").trim(),
    session_id: input.session_id || null,
    evidence_type: String(input.evidence_type || "interaction").trim(),
    concept_key: input.concept_key ? String(input.concept_key).trim() : null,
    source: input.source ? String(input.source).trim() : null,
    source_uri: input.source_uri ? String(input.source_uri).trim() : null,
    content_hash: input.content_hash || hashPayload(input.evidence || {}),
    evidence: stable(input.evidence || {}),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    observed_at: input.observed_at || new Date().toISOString(),
    metadata: stable(input.metadata || {})
  };
}

async function persistEvidence(input) {
  const record = normalizeEvidence(input);
  if (!record.learner_id) return { persisted: false, reason: "learner_id_required" };
  if (!gliPostgres.getPool()) return { persisted: false, reason: "postgres_unavailable" };

  const result = await gliPostgres.query(
    `INSERT INTO dream_learning_evidence_ledger
      (learner_id, session_id, evidence_type, concept_key, source, source_uri,
       content_hash, evidence, confidence, observed_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb)
     RETURNING evidence_id, learner_id, evidence_type, concept_key, content_hash,
               confidence, observed_at, created_at`,
    [
      record.learner_id, record.session_id, record.evidence_type, record.concept_key,
      record.source, record.source_uri, record.content_hash,
      JSON.stringify(record.evidence), record.confidence, record.observed_at,
      JSON.stringify(record.metadata)
    ]
  );

  return { persisted: true, evidence: result.rows[0] };
}

async function persistDecision({
  learnerId,
  decisionType,
  decision = {},
  evidenceIds = [],
  modelProvider = null,
  modelName = null
} = {}) {
  const normalizedLearnerId = String(learnerId || "").trim();
  const normalizedType = String(decisionType || "").trim();
  if (!normalizedLearnerId || !normalizedType) {
    return { persisted: false, reason: "learner_id_and_decision_type_required" };
  }
  if (!gliPostgres.getPool()) return { persisted: false, reason: "postgres_unavailable" };

  const safeDecision = stable(decision);
  const result = await gliPostgres.query(
    `INSERT INTO dream_learning_decisions
      (learner_id, decision_type, decision, evidence_ids, input_hash, model_provider, model_name)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7)
     RETURNING decision_id, learner_id, decision_type, input_hash, created_at`,
    [
      normalizedLearnerId,
      normalizedType,
      JSON.stringify(safeDecision),
      JSON.stringify(Array.isArray(evidenceIds) ? evidenceIds.map(String).slice(0, 100) : []),
      hashPayload(safeDecision),
      modelProvider ? String(modelProvider).slice(0, 120) : null,
      modelName ? String(modelName).slice(0, 160) : null
    ]
  );

  return { persisted: true, decision: result.rows[0] };
}

module.exports={stable,hashPayload,normalizeEvidence,persistEvidence,persistDecision};
