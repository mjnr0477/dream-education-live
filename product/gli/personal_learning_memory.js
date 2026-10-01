"use strict";

function buildPersonalLearningMemory({ learner = {}, history = [], profile = {} } = {}) {
  const recent = (Array.isArray(history) ? history : []).slice(0, 30).map(item => ({
    subject: item.subject || null,
    topic: item.topic || null,
    method: item.learning_method || item.method || null,
    date: item.created_at || null
  }));

  const preferences = {
    preferred_learning_method: learner.preferred_learning_method || "auto",
    custom_learning_method: learner.custom_learning_method || null
  };

  return {
    version: "1.0.0",
    learner_id: String(learner.learner_id || ""),
    preferences,
    active_subject: learner.active_subject || null,
    active_topic: learner.active_topic || null,
    recent_learning: recent,
    known_strengths: profile.overall?.strengths || [],
    known_gaps: profile.overall?.gaps || []
  };
}

module.exports = { buildPersonalLearningMemory };
