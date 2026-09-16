"use strict";

const PLANS = ["free", "learner", "family", "teacher", "school", "enterprise"];

function createAccountPlan(input = {}) {
  return {
    account_id: input.account_id || null,
    plan: PLANS.includes(input.plan) ? input.plan : "free",
    status: input.status || "active",
    owner_exempt: Boolean(input.owner_exempt),
    currency: input.currency || "USD",
    provider: input.provider || null
  };
}

module.exports = { PLANS, createAccountPlan };
