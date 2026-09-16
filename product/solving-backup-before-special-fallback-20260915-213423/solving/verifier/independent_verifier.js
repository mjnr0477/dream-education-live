"use strict";

/*
 * Independent Verification Engine
 *
 * Verification is deliberately separate from solving.
 * The solver proposes an answer.
 * This engine decides whether the answer is acceptable.
 */

function pass(reason, checks = []) {
  return {
    status: "PASS",
    verified: true,
    reason,
    checks
  };
}

function fail(reason, checks = []) {
  return {
    status: "FAIL",
    verified: false,
    reason,
    checks
  };
}

function inconclusive(reason, checks = []) {
  return {
    status: "INCONCLUSIVE",
    verified: false,
    reason,
    checks
  };
}

function valuesEqual(a, b, tolerance = 1e-9) {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
  }

  return String(a).trim() === String(b).trim();
}

function verifyBasicSolution(solution, checks = []) {
  if (!solution || typeof solution !== "object") {
    return fail("Invalid solution object");
  }

  if (!solution.solved) {
    return inconclusive("Solver did not produce a solved result");
  }

  if (solution.result === null || solution.result === undefined) {
    return fail("Solved result is missing");
  }

  if (!Array.isArray(solution.steps) || solution.steps.length === 0) {
    return inconclusive("No solution steps supplied");
  }

  return pass("Basic structural verification passed", checks);
}

function verifyRecalculation(originalResult, recalculatedResult, checks = []) {
  if (originalResult === null || recalculatedResult === null) {
    return inconclusive("Cannot compare missing values", checks);
  }

  if (valuesEqual(originalResult, recalculatedResult)) {
    return pass("Independent recalculation agrees", checks);
  }

  return fail(
    `Independent recalculation disagrees: ${originalResult} vs ${recalculatedResult}`,
    checks
  );
}

function verifyByAlternativeMethod(primary, alternative, checks = []) {
  if (primary === null || alternative === null) {
    return inconclusive("Alternative method unavailable", checks);
  }

  if (valuesEqual(primary, alternative)) {
    return pass("Independent alternative method agrees", checks);
  }

  return fail(
    `Alternative method disagrees: ${primary} vs ${alternative}`,
    checks
  );
}

function verifyUnits(expectedUnit, actualUnit, checks = []) {
  if (!expectedUnit || !actualUnit) {
    return inconclusive("Unit information unavailable", checks);
  }

  if (String(expectedUnit).trim().toLowerCase() ===
      String(actualUnit).trim().toLowerCase()) {
    return pass("Units agree", checks);
  }

  return fail(
    `Unit mismatch: expected ${expectedUnit}, received ${actualUnit}`,
    checks
  );
}

function verifyConstraints(result, constraints = [], checks = []) {
  if (!constraints.length) {
    return inconclusive("No explicit constraints supplied", checks);
  }

  for (const constraint of constraints) {
    if (typeof constraint === "function") {
      let accepted = false;

      try {
        accepted = Boolean(constraint(result));
      } catch {
        return fail("Constraint evaluation failed", checks);
      }

      if (!accepted) {
        return fail("Solution violates a required constraint", checks);
      }
    }
  }

  return pass("All supplied constraints passed", checks);
}

function verifySolution(solution, options = {}) {
  const structural = verifyBasicSolution(
    solution,
    options.checks || []
  );

  if (structural.status === "FAIL") {
    return structural;
  }

  if (typeof options.recalculate === "function") {
    const recalculated = options.recalculate(solution);

    const recalculation = verifyRecalculation(
      solution.result,
      recalculated,
      ["independent_recalculation"]
    );

    if (recalculation.status === "FAIL") {
      return recalculation;
    }

    if (recalculation.status === "PASS") {
      return recalculation;
    }
  }

  if (typeof options.alternative === "function") {
    const alternative = options.alternative(solution);

    const cross = verifyByAlternativeMethod(
      solution.result,
      alternative,
      ["alternative_method"]
    );

    if (cross.status === "FAIL") {
      return cross;
    }

    if (cross.status === "PASS") {
      return cross;
    }
  }

  if (options.constraints) {
    const constraints = verifyConstraints(
      solution.result,
      options.constraints,
      ["domain_constraints"]
    );

    if (constraints.status === "FAIL") {
      return constraints;
    }
  }

  return structural.status === "PASS"
    ? structural
    : inconclusive("Verification evidence was insufficient");
}

module.exports = {
  pass,
  fail,
  inconclusive,
  valuesEqual,
  verifyBasicSolution,
  verifyRecalculation,
  verifyByAlternativeMethod,
  verifyUnits,
  verifyConstraints,
  verifySolution
};
