"use strict";

const crypto = require("crypto");

function normalizeEvent(input = {}) {
  const eventId = String(input.event_id || crypto.randomUUID());
  return {
    event_id: eventId,
    learner_id: String(input.learner_id || ""),
    type: String(input.type || "learning_event"),
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    occurred_at: input.occurred_at || new Date().toISOString(),
    client_version: String(input.client_version || "unknown")
  };
}

function deduplicateEvents(events = []) {
  const seen = new Set();
  const accepted = [];

  for (const raw of Array.isArray(events) ? events : []) {
    const event = normalizeEvent(raw);
    if (!event.learner_id || seen.has(event.event_id)) continue;
    seen.add(event.event_id);
    accepted.push(event);
  }

  return accepted;
}

module.exports = { normalizeEvent, deduplicateEvents };
