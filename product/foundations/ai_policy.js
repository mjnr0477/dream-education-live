"use strict";

/*
 * DREAM EDUCATION AI POLICY
 *
 * AI is ALWAYS the last resort.
 *
 * Priority:
 * 1. Existing internal specialist
 * 2. Existing verified knowledge/source systems
 * 3. Existing cache
 * 4. Free/local provider
 * 5. Paid AI provider — ONLY when genuinely necessary
 */

const PRIORITY = [
  "internal_specialist",
  "verified_knowledge",
  "cache",
  "free_local_ai",
  "paid_ai_last_resort"
];

function shouldUseAI(result = {}) {
  if (result.success === true && result.verified === true) {
    return {
      use_ai: false,
      reason: "Existing verified result is sufficient",
      priority: "internal_or_verified"
    };
  }

  if (result.cached === true && result.verified === true) {
    return {
      use_ai: false,
      reason: "Verified cached result is sufficient",
      priority: "cache"
    };
  }

  return {
    use_ai: true,
    reason: "Existing systems could not provide a sufficiently verified result",
    priority: "last_resort"
  };
}

function getPolicy() {
  return {
    ai_is_required_for_core_operation: false,
    ai_is_last_resort: true,
    paid_ai_enabled_by_default: false,
    priority: PRIORITY
  };
}

module.exports = {
  PRIORITY,
  shouldUseAI,
  getPolicy
};
