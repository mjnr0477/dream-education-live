"use strict";

function idOf(item) {
  return item && (item.account_id || item.learner_id) || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildInstitutionalAdoptionIntelligence(data = {}, now = new Date()) {
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const nowMs = now.getTime();
  const day = 86400000;

  const recent = activities.filter(a => {
    const t = Date.parse(a.created_at || "");
    return Number.isFinite(t) && nowMs - t >= 0 && nowMs - t < 30 * day;
  });

  const roles = ["learner", "teacher", "parent", "school"];
  const byRole = {};
  for (const role of roles) {
    const rows = recent.filter(a => String(a.role || "").toLowerCase() === role);
    byRole[role] = {
      activities_30d: rows.length,
      active_accounts_30d: unique(rows.map(idOf)).length
    };
  }

  const institutionalAccounts = unique(
    recent
      .filter(a => ["teacher", "parent", "school"].includes(String(a.role || "").toLowerCase()))
      .map(idOf)
  );

  const paidInstitutionalAccounts = unique(
    payments
      .filter(p =>
        p.status === "successful" &&
        !p.owner_exempt &&
        Number(p.amount) > 0
      )
      .map(p => p.account_id || p.learner_id)
  );

  const activeDaysByAccount = new Map();
  for (const activity of recent) {
    const id = idOf(activity);
    const t = Date.parse(activity.created_at || "");
    if (!id || !Number.isFinite(t)) continue;
    if (!activeDaysByAccount.has(id)) activeDaysByAccount.set(id, new Set());
    activeDaysByAccount.get(id).add(Math.floor(t / day));
  }

  const returningInstitutionalAccounts = institutionalAccounts.filter(id => {
    const days = activeDaysByAccount.get(id);
    return days && days.size >= 2;
  });

  return {
    version: "1.0.0",
    window_days: 30,
    role_engagement: byRole,
    institutional_adoption: {
      active_institutional_accounts_30d: institutionalAccounts.length,
      returning_institutional_accounts_30d: returningInstitutionalAccounts.length,
      paid_institutional_accounts: paidInstitutionalAccounts.length,
      repeat_engagement_rate:
        institutionalAccounts.length
          ? Number((returningInstitutionalAccounts.length / institutionalAccounts.length).toFixed(4))
          : null
    },
    evidence_status:
      recent.length === 0
        ? "no_recent_activity"
        : institutionalAccounts.length === 0
          ? "learner_activity_only"
          : "institutional_activity_detected"
  };
}

module.exports = { buildInstitutionalAdoptionIntelligence };
