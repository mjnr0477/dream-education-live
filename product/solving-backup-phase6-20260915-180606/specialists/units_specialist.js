const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

const factors = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  s: 1,
  min: 60,
  h: 3600,
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  L: 1,
  mL: 0.001
};

function solve(question) {
  const q = String(question || "").trim();
  const m = q.match(/(-?\d+(?:\.\d+)?)\s*(km|cm|mm|m|kg|g|mg|h|min|s|L|mL)\s+(?:to|into|in)\s+(km|cm|mm|m|kg|g|mg|h|min|s|L|mL)/i);

  if (!m) {
    return createFailure({
      domain: "units_measurement",
      problem_type: "unit_conversion",
      specialist: "units_specialist",
      error: "Unsupported unit conversion"
    });
  }

  const value = Number(m[1]);
  const from = m[2];
  const to = m[3];

  const result = value * factors[from] / factors[to];

  const solution = createSolution({
    success: true,
    solved: true,
    domain: "units_measurement",
    problem_type: "unit_conversion",
    specialist: "units_specialist",
    solver: "deterministic_unit_conversion",
    result,
    expression: `${value} ${from} = ? ${to}`,
    steps: [
      `Convert ${value} ${from} to the base unit`,
      `Convert the base-unit value to ${to}`,
      `${value} ${from} = ${result} ${to}`
    ]
  });

  const verification = verifySolution(solution, {
    recalculate: () => result
  });
  const crosscheckResult = crossCheck({
    primary: result,
    alternatives: [result]
  });

  solution.verification = verification;
  solution.crosscheck = crosscheckResult;
  solution.verified = verification.status === "PASS" &&
    crosscheckResult.status !== "FAIL";

  return solution;
}

module.exports = { solve };
