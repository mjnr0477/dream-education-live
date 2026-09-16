"use strict";

/*
 * Dream Education Specialist Contract
 *
 * Every specialist must return the same structural shape.
 * A specialist may solve a problem, but it may NOT declare
 * an answer educationally safe until verification accepts it.
 */

function createSolution({
  success = false,
  solved = false,
  domain = "unknown",
  problem_type = "unknown",
  specialist = "unknown",
  solver = "unknown",
  result = null,
  expression = null,
  steps = [],
  assumptions = [],
  evidence = [],
  verification = null,
  crosscheck = null,
  error = null
} = {}) {
  return {
    success: Boolean(success),
    solved: Boolean(solved),
    domain,
    problem_type,
    specialist,
    solver,
    result,
    expression,
    steps: Array.isArray(steps) ? steps : [],
    assumptions: Array.isArray(assumptions) ? assumptions : [],
    evidence: Array.isArray(evidence) ? evidence : [],
    verification,
    crosscheck,
    verified: verification?.status === "PASS" &&
              crosscheck?.status !== "FAIL",
    error: error || null
  };
}

function createFailure({
  domain = "unknown",
  problem_type = "unknown",
  specialist = "unknown",
  solver = "unknown",
  error = "Solver failed"
} = {}) {
  return createSolution({
    success: false,
    solved: false,
    domain,
    problem_type,
    specialist,
    solver,
    error
  });
}

module.exports = {
  createSolution,
  createFailure
};
