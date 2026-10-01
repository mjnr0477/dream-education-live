"use strict";

/*
 * Additive GLI intelligence layer.
 * It consumes the existing learner profile/assessment evidence.
 * It does not replace or mutate the protected adaptive engines.
 */

function finiteNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function daysSince(value, now = Date.now()) {
  const t = Date.parse(value || "");
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (now - t) / 86400000);
}

function trend(scores) {
  const values = (Array.isArray(scores) ? scores : [])
    .map(v => finiteNumber(v))
    .filter(v => v !== null);

  if (values.length < 2) return { direction: "unknown", delta: null };

  const recent = values.slice(0, Math.min(3, values.length));
  const older = values.slice(Math.min(3, values.length));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length
    ? older.reduce((a, b) => a + b, 0) / older.length
    : values[values.length - 1];

  const delta = Math.round(recentAvg - olderAvg);
  return {
    direction: delta > 4 ? "improving" : delta < -4 ? "declining" : "stable",
    delta
  };
}

function buildRetentionSignals(profile = {}, assessments = []) {
  const now = Date.now();
  const byTopic = new Map();

  for (const assessment of Array.isArray(assessments) ? assessments : []) {
    const topic = String(assessment.topic || assessment.subject || "General").trim();
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(assessment);
  }

  const topics = [];
  for (const [topic, rows] of byTopic.entries()) {
    const latest = rows[0] || {};
    const scores = rows.map(r => finiteNumber(r.score, 0));
    const lastDays = daysSince(latest.created_at, now);
    const latestScore = scores.length ? scores[0] : 0;
    const mastered = profile.topics?.[topic]?.mastered === true ||
      profile.topics?.[topic]?.mastery_status === "mastered";

    let risk = "low";
    if (latestScore < 60 || lastDays === null) risk = "high";
    else if ((mastered && lastDays >= 21) || (!mastered && lastDays >= 14)) risk = "medium";
    if (latestScore < 50) risk = "high";

    topics.push({
      topic,
      last_assessed_at: latest.created_at || null,
      days_since_assessment: lastDays === null ? null : Math.round(lastDays * 10) / 10,
      latest_score: latestScore,
      mastery_status: profile.topics?.[topic]?.mastery_status || null,
      risk,
      trend: trend(scores)
    });
  }

  topics.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.risk] - rank[b.risk] || (b.days_since_assessment || 0) - (a.days_since_assessment || 0);
  });

  return {
    version: "1.0.0",
    retention_risk_topics: topics,
    high_risk_topics: topics.filter(t => t.risk === "high").map(t => t.topic),
    review_due_topics: topics.filter(t => t.risk !== "low").map(t => t.topic)
  };
}

function buildMisconceptionIntelligence(profile = {}, assessments = []) {
  const evidence = new Map();

  for (const assessment of Array.isArray(assessments) ? assessments : []) {
    const topic = String(assessment.topic || assessment.subject || "General").trim();
    const misconception = String(assessment.misconceptions || "").trim();
    const understanding = String(assessment.understanding || "").trim();
    const current = evidence.get(topic) || {
      topic,
      occurrences: 0,
      latest_evidence: null,
      statements: []
    };

    if (understanding === "misconception" || misconception) {
      current.occurrences += 1;
      if (!current.latest_evidence) current.latest_evidence = assessment.created_at || null;
      if (misconception && !current.statements.includes(misconception)) {
        current.statements.push(misconception.slice(0, 500));
      }
    }
    evidence.set(topic, current);
  }

  const active = [];
  for (const item of evidence.values()) {
    const topicProfile = profile.topics?.[item.topic] || {};
    if (item.occurrences > 0) {
      active.push({
        ...item,
        current_state: topicProfile.current_state || null,
        resolved: topicProfile.current_state === "RECOVERED" || topicProfile.mastery_status === "mastered"
      });
    }
  }

  return {
    version: "1.0.0",
    active: active.filter(x => !x.resolved),
    historical: active.filter(x => x.resolved),
    count: active.filter(x => !x.resolved).length
  };
}

function buildTransferReadiness(profile = {}) {
  const topics = [];
  for (const [topic, data] of Object.entries(profile.topics || {})) {
    const assessments = Number(data.assessments || 0);
    const strong = Number(data.strong_attempts || 0);
    const ready = data.mastered === true ||
      (data.latest_understanding === "strong" && strong >= 2 && assessments >= 2);

    topics.push({
      topic,
      ready_for_transfer: ready,
      mastery_status: data.mastery_status || null,
      evidence_count: assessments,
      strong_attempts: strong
    });
  }

  return {
    version: "1.0.0",
    ready_topics: topics.filter(x => x.ready_for_transfer).map(x => x.topic),
    topics
  };
}

function buildNextBestLearningAction(profile = {}, retention = {}, misconceptions = {}, transfer = {}) {
  const current = profile.patterns?.current_misconception_topics || [];
  if (current.length) {
    return {
      action: "correct",
      topic: current[0],
      priority: "highest",
      reason: "Current misconception evidence should be corrected before progression."
    };
  }

  if (misconceptions.active.length) {
    return {
      action: "correct",
      topic: misconceptions.active[0].topic,
      priority: "highest",
      reason: "Assessment evidence contains an unresolved misconception."
    };
  }

  if (retention.high_risk_topics.length) {
    return {
      action: "retrieve",
      topic: retention.high_risk_topics[0],
      priority: "high",
      reason: "Recent evidence indicates elevated retention risk."
    };
  }

  if (retention.review_due_topics.length) {
    return {
      action: "spaced_review",
      topic: retention.review_due_topics[0],
      priority: "medium",
      reason: "A previously learned topic is due for review."
    };
  }

  if (transfer.ready_topics.length) {
    return {
      action: "transfer",
      topic: transfer.ready_topics[0],
      priority: "medium",
      reason: "Evidence supports applying a mastered concept in a new context."
    };
  }

  if (profile.overall?.weakest_subject) {
    return {
      action: "practice",
      topic: profile.overall.weakest_subject,
      priority: "medium",
      reason: "The current profile identifies a weakest observed subject."
    };
  }

  return {
    action: "assess",
    topic: null,
    priority: "normal",
    reason: "More evidence is needed to select a targeted learning action."
  };
}

function buildAdvancedLearnerIntelligence({ profile = {}, assessments = [] } = {}) {
  const retention = buildRetentionSignals(profile, assessments);
  const misconceptions = buildMisconceptionIntelligence(profile, assessments);
  const transfer = buildTransferReadiness(profile);
  const nextBestAction = buildNextBestLearningAction(profile, retention, misconceptions, transfer);

  return {
    version: "1.0.0",
    retention,
    misconceptions,
    transfer,
    next_best_action: nextBestAction
  };
}

module.exports = {
  buildRetentionSignals,
  buildMisconceptionIntelligence,
  buildTransferReadiness,
  buildNextBestLearningAction,
  buildAdvancedLearnerIntelligence
};
