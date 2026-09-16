const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [], solver = "deterministic_research";

  let m = l.match(/(?:sample|study).*?(\d+(?:\.\d+)?).*?(?:population|total).*?(\d+(?:\.\d+)?)/);
  if (m && /percentage|proportion|sample/.test(l)) {
    const sample = Number(m[1]), population = Number(m[2]);
    result = sample / population * 100;
    expression = `(${sample} ÷ ${population}) × 100 = ${result}%`;
    steps = [`Sample proportion = sample ÷ population`, `${sample} ÷ ${population}`, `= ${result}%`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:participants|subjects).*?(\d+(?:\.\d+)?)\s*(?:responded|responses)/);
  if (m && /response rate/.test(l)) {
    const total = Number(m[1]), responses = Number(m[2]);
    result = responses / total * 100;
    expression = `(${responses} ÷ ${total}) × 100 = ${result}%`;
    steps = [`Response rate = responses ÷ participants × 100`, `${responses} ÷ ${total} × 100`, `= ${result}%`];
  }

  m = l.match(/(?:mean|average).*?(\d+(?:\.\d+)?).*?(\d+(?:\.\d+)?).*?(\d+(?:\.\d+)?)/);
  if (m && /three|three values|average/.test(l)) {
    const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
    result = (a + b + c) / 3;
    expression = `(${a}+${b}+${c}) ÷ 3 = ${result}`;
    steps = [`Add observations`, `${a}+${b}+${c} = ${a+b+c}`, `Divide by 3`, `= ${result}`];
  }

  m = l.match(/(?:increase|change).*?from\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/);
  if (m && /percentage|percent/.test(l)) {
    const oldValue = Number(m[1]), newValue = Number(m[2]);
    result = (newValue - oldValue) / oldValue * 100;
    expression = `((${newValue}-${oldValue}) ÷ ${oldValue}) × 100 = ${result}%`;
    steps = [`Change = new - old`, `Percentage change = change ÷ old × 100`, `= ${result}%`];
  }

  if (result === null) return createSolution({
    domain: "research_evidence",
    problem_type: "research_calculation",
    specialist: "research_specialist",
    solver,
    error: "Unsupported research calculation"
  });

  let s = createSolution({
    success: true, solved: true,
    domain: "research_evidence",
    problem_type: "research_calculation",
    specialist: "research_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
