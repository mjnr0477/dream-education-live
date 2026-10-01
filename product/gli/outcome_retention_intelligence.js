"use strict";

/*
 * Outcome & Retention Intelligence
 * Derives conservative cohort, retention, and outcome signals from
 * existing traction evidence. It never creates or infers missing activity.
 */

function dateMs(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : null;
}

function idOf(item) {
  return item && (item.account_id || item.learner_id) || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function daysBetween(a, b) {
  return Math.floor((b - a) / 86400000);
}

function buildOutcomeRetentionIntelligence(data = {}, now = new Date()) {
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
  const nowMs = now.getTime();

  const learnerDates = new Map();
  const learnerActivityDays = new Map();

  for (const activity of activities) {
    const id = idOf(activity);
    const t = dateMs(activity.created_at);
    if (!id || t === null) continue;

    const day = Math.floor(t / 86400000);
    const currentFirst = learnerDates.get(id);
    if (currentFirst === undefined || t < currentFirst) learnerDates.set(id, t);

    if (!learnerActivityDays.has(id)) learnerActivityDays.set(id, new Set());
    learnerActivityDays.get(id).add(day);
  }

  const cohorts = new Map();

  for (const [id, first] of learnerDates.entries()) {
    const cohortDay = Math.floor(first / 86400000);
    if (!cohorts.has(cohortDay)) cohorts.set(cohortDay, []);
    cohorts.get(cohortDay).push(id);
  }

  const cohortRows = [...cohorts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([cohortDay, ids]) => {
      const cohortStart = cohortDay * 86400000;
      const eligible7 = ids.filter(id => nowMs - cohortStart >= 7 * 86400000);
      const eligible30 = ids.filter(id => nowMs - cohortStart >= 30 * 86400000);

      const retained7 = eligible7.filter(id => {
        const days = learnerActivityDays.get(id);
        return days && [...days].some(day => day >= cohortDay + 7 && day <= cohortDay + 13);
      });

      const retained30 = eligible30.filter(id => {
        const days = learnerActivityDays.get(id);
        return days && [...days].some(day => day >= cohortDay + 30 && day <= cohortDay + 36);
      });

      return {
        cohort_start: new Date(cohortStart).toISOString(),
        learners: ids.length,
        day_7: {
          eligible: eligible7.length,
          retained: retained7.length,
          rate: eligible7.length ? Number((retained7.length / eligible7.length).toFixed(4)) : null
        },
        day_30: {
          eligible: eligible30.length,
          retained: retained30.length,
          rate: eligible30.length ? Number((retained30.length / eligible30.length).toFixed(4)) : null
        }
      };
    });

  const eligible7 = cohortRows.reduce((n, c) => n + c.day_7.eligible, 0);
  const retained7 = cohortRows.reduce((n, c) => n + c.day_7.retained, 0);
  const eligible30 = cohortRows.reduce((n, c) => n + c.day_30.eligible, 0);
  const retained30 = cohortRows.reduce((n, c) => n + c.day_30.retained, 0);

  const measured = outcomes.filter(o =>
    typeof o.baseline === "number" &&
    Number.isFinite(o.baseline) &&
    typeof o.current === "number" &&
    Number.isFinite(o.current) &&
    typeof o.improvement === "number" &&
    Number.isFinite(o.improvement)
  );

  const positive = measured.filter(o => o.improvement > 0);
  const negative = measured.filter(o => o.improvement < 0);
  const neutral = measured.filter(o => o.improvement === 0);
  const average = measured.length
    ? measured.reduce((sum, o) => sum + o.improvement, 0) / measured.length
    : null;

  const recent30 = activities.filter(a => {
    const t = dateMs(a.created_at);
    return t !== null && nowMs - t < 30 * 86400000;
  });

  return {
    version: "1.0.0",
    cohorts: {
      total_cohorts: cohortRows.length,
      rows: cohortRows,
      retention: {
        day_7: eligible7 ? Number((retained7 / eligible7).toFixed(4)) : null,
        day_30: eligible30 ? Number((retained30 / eligible30).toFixed(4)) : null,
        day_7_eligible_learners: eligible7,
        day_30_eligible_learners: eligible30
      }
    },
    outcome_quality: {
      total_outcomes: outcomes.length,
      measured_outcomes: measured.length,
      positive_improvement_rate: measured.length ? Number((positive.length / measured.length).toFixed(4)) : null,
      negative_improvement_rate: measured.length ? Number((negative.length / measured.length).toFixed(4)) : null,
      neutral_improvement_rate: measured.length ? Number((neutral.length / measured.length).toFixed(4)) : null,
      average_improvement: average === null ? null : Number(average.toFixed(2))
    },
    activity_signal: {
      activities_30d: recent30.length,
      active_learners_30d: unique(recent30.map(idOf)).length
    },
    evidence_status:
      measured.length === 0
        ? "insufficient_outcome_evidence"
        : eligible7 === 0
          ? "outcomes_available_retention_not_yet_eligible"
          : "retention_and_outcome_evidence_available"
  };
}

module.exports = { buildOutcomeRetentionIntelligence };
