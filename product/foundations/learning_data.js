"use strict";

/*
 * Stable event contract for longitudinal learning intelligence.
 * No personally identifying data is required by this layer.
 */

function createLearningEvent(input = {}) {
  return {
    event_id: input.event_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: input.event_type || "learning_activity",
    learner_id: input.learner_id || null,
    subject: input.subject || null,
    topic: input.topic || null,
    level: input.level || null,
    method: input.method || null,
    learning_state: input.learning_state || null,
    mastery: input.mastery ?? null,
    score: input.score ?? null,
    source: input.source || "dream_education",
    created_at: input.created_at || new Date().toISOString()
  };
}

module.exports = { createLearningEvent };
