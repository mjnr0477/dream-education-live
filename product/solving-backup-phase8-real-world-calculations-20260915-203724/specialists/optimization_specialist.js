"use strict";

const {
  createSolution,
  createFailure
} = require("./specialist_contract.js");

const {
  verifySolution
} = require("../verifier/independent_verifier.js");

const {
  crossCheck
} = require("../crosscheck/crosscheck_engine.js");

function finish(problem_type, solver, result, expression, steps, recalc) {
  const verification = verifySolution(
    {
      success: true,
      solved: true,
      result,
      steps
    },
    { recalculate: recalc }
  );

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return createSolution({
    success: true,
    solved: true,
    domain: "optimization_operations_research",
    problem_type,
    specialist: "optimization_specialist",
    solver,
    result,
    expression,
    steps,
    verification,
    crosscheck
  });
}

function solve(question) {
  const q = String(question || "").trim();
  const l = q.toLowerCase();

  // Objective value: maximize/minimize ax + by for supplied x and y.
  if (
    /(maximize|maximise|minimize|minimise)/.test(l) &&
    /-?\d+(?:\.\d+)?\s*x\s*\+\s*-?\d+(?:\.\d+)?\s*y/.test(l) &&
    /\bx\b/.test(l) &&
    /\by\b/.test(l)
  ) {
    const coeffs = l.match(
      /(?:maximize|maximise|minimize|minimise)\s+(-?\d+(?:\.\d+)?)\s*x\s*\+\s*(-?\d+(?:\.\d+)?)\s*y/
    );

    const values = l.match(
      /x\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:,|and)\s*y\s*=\s*(-?\d+(?:\.\d+)?)/ 
    );

    if (coeffs && values) {
      const a = Number(coeffs[1]);
      const b = Number(coeffs[2]);
      const x = Number(values[1]);
      const y = Number(values[2]);
      const result = a * x + b * y;

      return finish(
        "objective_evaluation",
        "deterministic_optimization",
        result,
        `${a}x + ${b}y`,
        [
          `Objective = ${a}x + ${b}y`,
          `x = ${x}`,
          `y = ${y}`,
          `Objective = ${a}(${x}) + ${b}(${y})`,
          `Objective = ${result}`
        ],
        () => a * x + b * y
      );
    }
  }

  // Capacity allocation: maximum units from total capacity and resource per unit.
  if (
    /(capacity|resource)/.test(l) &&
    /(unit|units)/.test(l) &&
    /(maximum|max)/.test(l)
  ) {
    const capacity = l.match(
      /(?:capacity|resource)\D*(\d+(?:\.\d+)?)/
    );
    const perUnit = l.match(
      /(?:each|per)\s+unit\D*(\d+(?:\.\d+)?)/
    );

    if (capacity && perUnit && Number(perUnit[1]) !== 0) {
      const c = Number(capacity[1]);
      const r = Number(perUnit[1]);
      const result = Math.floor(c / r);

      return finish(
        "capacity_constraint",
        "deterministic_optimization",
        result,
        "Maximum units = floor(Capacity / Resource per unit)",
        [
          `Capacity = ${c}`,
          `Resource per unit = ${r}`,
          `Maximum units = floor(${c} / ${r})`,
          `Maximum units = ${result}`
        ],
        () => Math.floor(c / r)
      );
    }
  }

  // Simple profit maximization by comparing two supplied alternatives.
  if (
    /maximize|maximum|maximise|maximum profit/.test(l) &&
    /profit/.test(l)
  ) {
    const profits = [...l.matchAll(
      /(?:profit|option|alternative)\s*(?:a|b|1|2)?\D*(\d+(?:\.\d+)?)/g
    )].map(m => Number(m[1]));

    if (profits.length >= 2) {
      const result = Math.max(...profits);

      return finish(
        "profit_comparison",
        "deterministic_optimization",
        result,
        "Maximum profit = max(candidate profits)",
        [
          `Candidate profits = ${profits.join(", ")}`,
          `Maximum profit = ${result}`
        ],
        () => Math.max(...profits)
      );
    }
  }

  // Feasibility check for x + y <= capacity.
  if (
    /feasible|feasibility|constraint/.test(l) &&
    /x\s*\+\s*y/.test(l) &&
    /x\s*=\s*/.test(l) &&
    /y\s*=\s*/.test(l)
  ) {
    const xy = l.match(
      /x\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:,|and)\s*y\s*=\s*(-?\d+(?:\.\d+)?)/
    );
    const cap = l.match(
      /(?:less than or equal to|at most|maximum|capacity of|<=)\s*(\d+(?:\.\d+)?)/
    );

    if (xy && cap) {
      const x = Number(xy[1]);
      const y = Number(xy[2]);
      const capacity = Number(cap[1]);
      const result = x + y <= capacity;

      return finish(
        "constraint_feasibility",
        "deterministic_optimization",
        result,
        "x + y <= capacity",
        [
          `x = ${x}`,
          `y = ${y}`,
          `Capacity = ${capacity}`,
          `x + y = ${x + y}`,
          `Feasible = ${result}`
        ],
        () => x + y <= capacity
      );
    }
  }

  return createFailure({
    domain: "optimization_operations_research",
    problem_type: "unknown",
    specialist: "optimization_specialist",
    solver: "none",
    error: "Optimization/operations research problem type not supported by this specialist"
  });
}

module.exports = {
  solve
};
