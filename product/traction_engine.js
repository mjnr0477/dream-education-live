"use strict";

const { buildValueEvidence } = require("./gli/value_evidence_engine");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "traction.json");

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(
      FILE,
      JSON.stringify({
        activities: [],
        outcomes: [],
        payments: []
      }, null, 2)
    );
  }
}

function readStore() {
  ensureStore();

  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

    return {
      activities: Array.isArray(data.activities) ? data.activities : [],
      outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
      payments: Array.isArray(data.payments) ? data.payments : []
    };
  } catch {
    return {
      activities: [],
      outcomes: [],
      payments: []
    };
  }
}

function writeStore(data) {
  ensureStore();

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );
}

function addActivity(input = {}) {
  const data = readStore();

  const now = input.created_at || new Date().toISOString();

  data.activities.push({
    activity_id:
      input.activity_id ||
      `activity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    account_id: input.account_id || null,
    learner_id: input.learner_id || null,
    role: input.role || null,
    event_type: input.event_type || "learning_activity",
    subject: input.subject || null,
    topic: input.topic || null,
    score:
      typeof input.score === "number" ? input.score : null,
    mastery:
      typeof input.mastery === "number" ? input.mastery : null,
    created_at: now
  });

  writeStore(data);

  return data.activities[data.activities.length - 1];
}

function addOutcome(input = {}) {
  const data = readStore();

  const baseline =
    typeof input.baseline === "number" ? input.baseline : null;

  const current =
    typeof input.current === "number" ? input.current : null;

  const outcome = {
    outcome_id:
      input.outcome_id ||
      `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    account_id: input.account_id || null,
    learner_id: input.learner_id || null,
    subject: input.subject || null,
    topic: input.topic || null,
    baseline,
    current,
    improvement:
      baseline !== null && current !== null
        ? current - baseline
        : null,
    attempts: Number(input.attempts || 0),
    mastered: Boolean(input.mastered),
    measured_at: input.measured_at || new Date().toISOString()
  };

  data.outcomes.push(outcome);
  writeStore(data);

  return outcome;
}

function addPayment(input = {}) {
  const data = readStore();

  const amount = Number(input.amount || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid payment amount.");
  }

  const paymentId =
    input.payment_id ||
    `payment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const existingPayment = data.payments.find(
    payment => payment.payment_id === paymentId
  );

  if (existingPayment) {
    return existingPayment;
  }

  const payment = {
    payment_id: paymentId,
    account_id: input.account_id || null,
    learner_id: input.learner_id || null,
    amount,
    currency: input.currency || "KES",
    plan_id: input.plan_id || null,
    status: input.status || "successful",
    owner_exempt: Boolean(input.owner_exempt),
    billing_period_days: Number(input.billing_period_days || 0),
    payment_date: input.payment_date || new Date().toISOString()
  };

  data.payments.push(payment);
  writeStore(data);

  return payment;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getMetrics(now = new Date()) {
  const data = readStore();

  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const successfulPayments = data.payments.filter(
    p =>
      p.status === "successful" &&
      !p.owner_exempt &&
      Number(p.amount) > 0
  );

  const payingCustomers = unique(
    successfulPayments.map(p => p.account_id || p.learner_id)
  );

  const activeUsers = {
    dau: unique(
      data.activities
        .filter(a => nowMs - new Date(a.created_at).getTime() < dayMs)
        .map(a => a.account_id || a.learner_id)
    ).length,

    wau: unique(
      data.activities
        .filter(a => nowMs - new Date(a.created_at).getTime() < 7 * dayMs)
        .map(a => a.account_id || a.learner_id)
    ).length,

    mau: unique(
      data.activities
        .filter(a => nowMs - new Date(a.created_at).getTime() < 30 * dayMs)
        .map(a => a.account_id || a.learner_id)
    ).length
  };

  const measuredOutcomes = data.outcomes.filter(
    o =>
      typeof o.baseline === "number" &&
      typeof o.current === "number"
  );

  const improvements = measuredOutcomes
    .map(o => o.improvement)
    .filter(Number.isFinite);

  const averageImprovement =
    improvements.length
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length
      : null;

  const masteredCount =
    measuredOutcomes.filter(o => o.mastered).length;

  const totalRevenue = successfulPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const monthlyRevenue = successfulPayments
    .filter(p => {
      const date = new Date(p.payment_date);
      return nowMs - date.getTime() < 30 * dayMs;
    })
    .reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

  const recurringMonthlyRevenue = successfulPayments.reduce(
    (sum, p) => {
      const days = Number(p.billing_period_days || 0);
      const amount = Number(p.amount || 0);

      if (days === 30) return sum + amount;
      if (days === 365) return sum + amount / 12;
      if (days === 7) return sum + amount * 52 / 12;
      if (days === 1) return sum + amount * 365 / 12;

      return sum;
    },
    0
  );

  return {
    generated_at: now.toISOString(),

    paying_customers: payingCustomers.length,

    active_users: activeUsers,

    learning_outcomes: {
      measured: measuredOutcomes.length,
      average_improvement:
        averageImprovement === null
          ? null
          : Number(averageImprovement.toFixed(2)),
      mastered: masteredCount,
      mastery_rate:
        measuredOutcomes.length
          ? Number(
              (masteredCount / measuredOutcomes.length * 100)
                .toFixed(2)
            )
          : null
    },

    revenue: {
      total: Number(totalRevenue.toFixed(2)),
      last_30_days: Number(monthlyRevenue.toFixed(2)),
      currency: "KES"
    },

    arr: {
      annualized_recurring_revenue: Number(
        (recurringMonthlyRevenue * 12).toFixed(2)
      ),
      currency: "KES"
    },

    raw_counts: {
      activities: data.activities.length,
      outcomes: data.outcomes.length,
      payments: data.payments.length
    },

    value_evidence: buildValueEvidence(data, now)
  };
}

module.exports = {
  addActivity,
  addOutcome,
  addPayment,
  getMetrics
};
