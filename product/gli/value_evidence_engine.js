"use strict";

/*
 * Value Evidence Engine
 * Converts existing learning, engagement and payment evidence into
 * conservative product-value signals. It never invents outcomes.
 */

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function dateMs(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : null;
}

function buildValueEvidence(data = {}, now = new Date()) {
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const nowMs = now.getTime();
  const day = 86400000;

  const measured = outcomes.filter(o =>
    finite(o.baseline) !== null &&
    finite(o.current) !== null &&
    finite(o.improvement) !== null
  );

  const positive = measured.filter(o => o.improvement > 0);
  const mastered = measured.filter(o => o.mastered === true);

  const active30 = unique(
    activities
      .filter(a => {
        const t = dateMs(a.created_at);
        return t !== null && nowMs - t < 30 * day;
      })
      .map(a => a.account_id || a.learner_id)
  );

  const returning7 = unique(
    activities
      .filter(a => {
        const t = dateMs(a.created_at);
        return t !== null && nowMs - t < 7 * day;
      })
      .map(a => a.account_id || a.learner_id)
  );

  const paying = unique(
    payments
      .filter(p => p.status === "successful" && !p.owner_exempt && Number(p.amount) > 0)
      .map(p => p.account_id || p.learner_id)
  );

  const averageImprovement = measured.length
    ? measured.reduce((sum, o) => sum + o.improvement, 0) / measured.length
    : null;

  const evidenceRate = outcomes.length
    ? measured.length / outcomes.length
    : null;

  const positiveOutcomeRate = measured.length
    ? positive.length / measured.length
    : null;

  const masteryRate = measured.length
    ? mastered.length / measured.length
    : null;

  return {
    version: "1.0.0",
    evidence_quality: {
      measured_outcomes: measured.length,
      total_outcomes: outcomes.length,
      measured_outcome_rate: evidenceRate === null ? null : Number(evidenceRate.toFixed(4)),
      note: "Only outcomes with explicit numeric baseline and current scores are counted as measured evidence."
    },
    learning_impact: {
      average_improvement: averageImprovement === null ? null : Number(averageImprovement.toFixed(2)),
      positive_improvement_rate: positiveOutcomeRate === null ? null : Number(positiveOutcomeRate.toFixed(4)),
      mastery_rate: masteryRate === null ? null : Number(masteryRate.toFixed(4)),
      mastered_outcomes: mastered.length
    },
    learner_engagement: {
      active_learners_30d: active30.length,
      active_learners_7d: returning7.length
    },
    commercial_signal: {
      paying_customers: paying.length,
      revenue_evidence: payments.filter(p => p.status === "successful" && Number(p.amount) > 0).length
    },
    value_proof_status:
      measured.length === 0
        ? "insufficient_evidence"
        : measured.length < 10
          ? "early_evidence"
          : "measurable_evidence"
  };
}

module.exports = { buildValueEvidence };
