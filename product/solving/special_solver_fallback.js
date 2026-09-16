const { solveExternal } = require("./special_problem_solver.js");

async function solveWithFallback({
  question,
  internalSolver,
  externalSolver
}) {
  if (typeof question !== "string" || !question.trim()) {
    return {
      success: false,
      solved: false,
      routed: false,
      verified: false,
      error: "A problem question is required."
    };
  }

  // 1. Always try the relevant internal solver first.
  if (typeof internalSolver === "function") {
    try {
      const internal = await internalSolver(question);

      if (
        internal &&
        internal.solved === true &&
        internal.verified === true &&
        internal.error == null
      ) {
        return {
          ...internal,
          fallback_used: false,
          source: "internal_specialist"
        };
      }
    } catch (_) {
      // Internal failure intentionally falls through to fallback.
    }
  }

  // 2. Internal methods failed: use the Special Problem Solver.
  if (typeof externalSolver !== "function") {
    return {
      success: false,
      solved: false,
      routed: true,
      verified: false,
      fallback_used: true,
      source: "external_special_problem_solver",
      error: "No external Special Problem Solver provider configured."
    };
  }

  const external = await solveExternal(question, externalSolver);

  return {
    ...external,
    fallback_used: true,
    source: "external_special_problem_solver"
  };
}

module.exports = {
  solveWithFallback
};
