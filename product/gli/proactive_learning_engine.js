"use strict";

function generateProactiveActions({ learner, profile = {} } = {}) {
  const actions = [];
  const patterns = profile.patterns || {};

  const topicProfiles = profile.topics || {};
  const seen = new Set();

  for (const topic of patterns.current_misconception_topics || []) {
    seen.add(topic);
    actions.push({
      type: "misconception_intervention",
      priority: "high",
      topic,
      reason: "Recent assessment evidence indicates a current misconception.",
      suggested_action: "correct_then_reassess"
    });
  }

  for (const topic of patterns.recovered_topics || []) {
    actions.push({
      type: "recovery_consolidation",
      priority: "medium",
      topic,
      reason: "The learner has recovered from a previous misconception.",
      suggested_action: "consolidate"
    });
  }

  if (!actions.length && profile.overall?.weakest_subject) {
    actions.push({
      type: "targeted_practice",
      priority: "medium",
      subject: profile.overall.weakest_subject,
      reason: "This subject currently has the lowest observed average.",
      suggested_action: "practice"
    });
  }

  if (!actions.length) {
    actions.push({
      type: "continue_learning",
      priority: "low",
      subject: learner?.active_subject || null,
      topic: learner?.active_topic || null,
      reason: "No intervention signal was detected from current evidence.",
      suggested_action: "continue"
    });
  }

  return actions.slice(0, 5);
}

module.exports = { generateProactiveActions };
