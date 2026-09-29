"use strict";

const crypto = require("crypto");
const gliPostgres = require("../../infrastructure/database/postgres");

async function recordLearningEvent({ learnerId, type, payload = {}, occurredAt = new Date().toISOString(), clientVersion = "server" }) {
  const normalizedLearnerId = String(learnerId || "").trim();
  const normalizedType = String(type || "").trim();

  if (!normalizedLearnerId || !normalizedType) {
    return { recorded: false, reason: "invalid_event" };
  }

  if (!gliPostgres.getPool()) {
    return { recorded: false, reason: "postgres_unavailable" };
  }

  const eventId = "evt_" + crypto.randomUUID();

  await gliPostgres.query(
    `INSERT INTO dream_learning_events
      (event_id, learner_id, event_type, payload, occurred_at, client_version)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (event_id) DO NOTHING`,
    [
      eventId,
      normalizedLearnerId,
      normalizedType,
      JSON.stringify(payload && typeof payload === "object" ? payload : {}),
      occurredAt,
      String(clientVersion || "server")
    ]
  );

  return { recorded: true, event_id: eventId };
}

async function getLearningEvaluation(learnerId = null) {
  if (!gliPostgres.getPool()) return { available: false };

  const params = [];
  const where = learnerId ? "WHERE learner_id = $1" : "";
  if (learnerId) params.push(String(learnerId));

  const result = await gliPostgres.query(
    `SELECT
       COUNT(*)::int AS events,
       COUNT(DISTINCT learner_id)::int AS learners,
       COUNT(*) FILTER (WHERE event_type = 'assessment_completed')::int AS assessments,
       COUNT(*) FILTER (WHERE event_type = 'learning_cycle_completed')::int AS learning_cycles,
       MIN(occurred_at) AS first_event,
       MAX(occurred_at) AS last_event
     FROM dream_learning_events
     ${where}`,
    params
  );

  return { available: true, ...(result.rows[0] || {}) };
}

module.exports = { recordLearningEvent, getLearningEvaluation };
