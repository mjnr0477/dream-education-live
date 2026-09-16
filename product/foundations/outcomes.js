"use strict";

function recordOutcome(input = {}) {
  return {
    learner_id: input.learner_id || null,
    subject: input.subject || null,
    topic: input.topic || null,
    baseline: input.baseline ?? null,
    current: input.current ?? null,
    improvement: (
      typeof input.baseline === "number" &&
      typeof input.current === "number"
    ) ? input.current - input.baseline : null,
    attempts: input.attempts ?? 0,
    mastered: Boolean(input.mastered),
    measured_at: input.measured_at || new Date().toISOString()
  };
}

module.exports = { recordOutcome };
