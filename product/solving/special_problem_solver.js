const { verifySolution } = require("./verifier/independent_verifier.js");
const { crossCheck } = require("./crosscheck/crosscheck_engine.js");

function createExternalFailure(question, error) {
  return {
    success: false,
    solved: false,
    routed: true,
    source: "external_special_problem_solver",
    question,
    result: null,
    expression: null,
    steps: [],
    verification: { status: "INCONCLUSIVE", method: "independent_verification" },
    crosscheck: { status: "INCONCLUSIVE", method: "alternative_crosscheck" },
    verified: false,
    error
  };
}

/*
 * External Special Problem Solver gateway.
 *
 * The gateway deliberately does NOT claim an answer by itself.
 * An external provider may be connected through solveExternal().
 * Every returned answer must pass independent verification before
 * Dream Education is allowed to teach it.
 */
async function solveExternal(question, solveExternal) {
  if (typeof solveExternal !== "function") {
    return createExternalFailure(
      question,
      "No external Special Problem Solver provider configured"
    );
  }

  let external;

  try {
    external = await solveExternal(question);
  } catch (error) {
    return createExternalFailure(
      question,
      error?.message || "External solver failed"
    );
  }

  if (!external || external.solved !== true || external.result == null) {
    return createExternalFailure(
      question,
      "External solver returned no usable solution"
    );
  }

  const solution = {
    success: true,
    solved: true,
    domain: external.domain || "unknown",
    problem_type: external.problem_type || "unknown",
    specialist: "external_special_problem_solver",
    solver: external.solver || "external",
    result: external.result,
    expression: external.expression || null,
    steps: Array.isArray(external.steps) ? external.steps : [],
    assumptions: Array.isArray(external.assumptions)
      ? external.assumptions
      : [],
    evidence: Array.isArray(external.evidence)
      ? external.evidence
      : []
  };

  const verification = verifySolution(solution, {
    recalculate:
      typeof external.recalculate === "function"
        ? external.recalculate
        : undefined
  });

  if (verification.status !== "PASS") {
    return {
      ...solution,
      verification,
      crosscheck: { status: "INCONCLUSIVE" },
      verified: false,
      error: "External solution failed independent verification"
    };
  }

  const crosscheckResult = crossCheck({
    primary: solution.result,
    alternatives:
      external.alternatives && Array.isArray(external.alternatives)
        ? external.alternatives
        : []
  });

  if (crosscheckResult.status === "FAIL") {
    return {
      ...solution,
      verification,
      crosscheck: crosscheckResult,
      verified: false,
      error: "External solution failed cross-check"
    };
  }

  return {
    ...solution,
    verification,
    crosscheck: crosscheckResult,
    verified: true,
    error: null
  };
}

module.exports = {
  solveExternal,
  createExternalFailure
};
