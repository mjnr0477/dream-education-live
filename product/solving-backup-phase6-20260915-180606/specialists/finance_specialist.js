const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const q = String(question || "").toLowerCase();

  const amount =
    q.match(/(?:principal|amount|borrow|loan)[^0-9]*([0-9.]+)/) ||
    q.match(/(?:on|of)\s+(?:principal\s+)?([0-9.]+)/);

  const rate =
    q.match(/(?:rate|interest)[^0-9]*([0-9.]+)\s*%/) ||
    q.match(/([0-9.]+)\s*%/);

  const years =
    q.match(/(?:for|period)[^0-9]*([0-9.]+)\s*(?:years?|yr)/);

  if (/simple interest/.test(q) && amount && rate && years) {
    const P = Number(amount[1]);
    const r = Number(rate[1]) / 100;
    const t = Number(years[1]);
    const interest = P * r * t;
    const total = P + interest;

    const solution = createSolution({
      success: true,
      solved: true,
      domain: "finance_accounting",
      problem_type: "simple_interest",
      specialist: "finance_specialist",
      solver: "deterministic_finance",
      result: total,
      expression: "A = P(1 + rt)",
      steps: [
        `Principal P = ${P}`,
        `Rate r = ${r}`,
        `Time t = ${t} years`,
        `Interest I = Prt = ${interest}`,
        `Total A = P + I = ${total}`
      ]
    });

    const verification = verifySolution(solution, {
      recalculate: () => P * (1 + r * t)
    });
    const crosscheckResult = crossCheck({
      primary: total,
      alternatives: [P + interest]
    });

    solution.verification = verification;
    solution.crosscheck = crosscheckResult;
    solution.verified = verification.status === "PASS" &&
      crosscheckResult.status !== "FAIL";

    return solution;
  }

  return createFailure({
    domain: "finance_accounting",
    problem_type: "unknown",
    specialist: "finance_specialist",
    error: "No supported deterministic finance pattern matched"
  });
}

module.exports = { solve };
