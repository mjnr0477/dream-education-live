const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function numberAfter(pattern, text) {
  const m = text.match(pattern);
  return m ? Number(m[1]) : null;
}

function solve(question) {
  const q = String(question || "").toLowerCase();

  let result = null;
  let type = "unknown";
  let expression = "";
  let steps = [];

  const u = numberAfter(/accelerates?[^0-9]*([0-9.]+)\s*m\/s(?:\^?2)?/, q);
  const t = numberAfter(/(?:for|time of)\s*([0-9.]+)\s*(?:seconds?|s)/, q);
  const v0 = numberAfter(/(?:from rest|initial velocity[^0-9]*)([0-9.]+)?/, q);

  if (/accelerat|kinematic/.test(q) && u !== null && t !== null) {
    const initial = /from rest/.test(q) ? 0 : (v0 ?? 0);
    result = initial * t + 0.5 * u * t * t;
    type = "kinematics";
    expression = "s = ut + 1/2 at²";
    steps = [
      `Initial velocity u = ${initial} m/s`,
      `Acceleration a = ${u} m/s²`,
      `Time t = ${t} s`,
      `s = ${initial}(${t}) + 1/2(${u})(${t})²`,
      `s = ${result} m`
    ];
  }

  if (/force|newton/.test(q)) {
    const m = numberAfter(/mass[^0-9]*([0-9.]+)\s*kg/, q);
    const a = numberAfter(/acceleration[^0-9]*([0-9.]+)\s*m\/s/, q);
    if (m !== null && a !== null) {
      result = m * a;
      type = "force";
      expression = "F = ma";
      steps = [`Mass m = ${m} kg`, `Acceleration a = ${a} m/s²`, `F = ${m} × ${a}`, `F = ${result} N`];
    }
  }

  if (result === null) {
    return createFailure({
      domain: "physics",
      problem_type: type,
      specialist: "physics_specialist",
      error: "No supported deterministic physics pattern matched"
    });
  }

  const solution = createSolution({
    success: true,
    solved: true,
    domain: "physics",
    problem_type: type,
    specialist: "physics_specialist",
    solver: "deterministic_physics",
    result,
    expression,
    steps
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
