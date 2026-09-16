"use strict";

/*
 * Cross-check Engine
 *
 * Attempts to establish agreement between independent
 * solution paths. It never assumes that the first answer
 * is correct simply because a solver produced it.
 */

function crossCheck({
  primary,
  alternatives = [],
  tolerance = 1e-9
} = {}) {
  if (primary === null || primary === undefined) {
    return {
      status: "INCONCLUSIVE",
      agreed: false,
      reason: "Primary result missing",
      compared: 0
    };
  }

  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return {
      status: "INCONCLUSIVE",
      agreed: false,
      reason: "No independent alternative result available",
      compared: 0
    };
  }

  let compared = 0;

  for (const alternative of alternatives) {
    if (alternative === null || alternative === undefined) continue;

    compared++;

    let equal;

    if (typeof primary === "number" && typeof alternative === "number") {
      equal =
        Math.abs(primary - alternative) <=
        tolerance * Math.max(1, Math.abs(primary), Math.abs(alternative));
    } else {
      equal = String(primary).trim() === String(alternative).trim();
    }

    if (!equal) {
      return {
        status: "FAIL",
        agreed: false,
        reason: "Independent solution paths disagree",
        compared
      };
    }
  }

  return {
    status: "PASS",
    agreed: true,
    reason: "Independent solution paths agree",
    compared
  };
}

module.exports = {
  crossCheck
};
