const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function extractNumbers(q) {
  const match = q.match(/(?:of|are|is)\s*([0-9.,\s-]+)/i);
  if (!match) return null;
  const nums = match[1].match(/-?\d+(?:\.\d+)?/g);
  return nums ? nums.map(Number) : null;
}

function solve(question) {
  const q = String(question || "").trim();
  const nums = extractNumbers(q);

  if (!nums || !nums.length) {
    return createFailure({
      domain: "statistics_data",
      problem_type: "unknown",
      specialist: "statistics_specialist",
      error: "No numeric dataset detected"
    });
  }

  let result;
  let type;

  if (/mean|average/i.test(q)) {
    result = nums.reduce((a, b) => a + b, 0) / nums.length;
    type = "mean";
  } else if (/median/i.test(q)) {
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    result = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    type = "median";
  } else if (/mode/i.test(q)) {
    const counts = new Map();
    nums.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
    const max = Math.max(...counts.values());
    result = [...counts.entries()].filter(([, c]) => c === max).map(([n]) => n);
    type = "mode";
  } else {
    return createFailure({
      domain: "statistics_data",
      problem_type: "unknown",
      specialist: "statistics_specialist",
      error: "Unsupported statistics operation"
    });
  }

  const solution = createSolution({
    success: true,
    solved: true,
    domain: "statistics_data",
    problem_type: type,
    specialist: "statistics_specialist",
    solver: "deterministic_statistics",
    result,
    expression: `${type}(${nums.join(", ")})`,
    steps: [
      `Dataset: ${nums.join(", ")}`,
      `Calculate the ${type}`,
      `Result = ${Array.isArray(result) ? result.join(", ") : result}`
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
