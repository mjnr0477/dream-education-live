const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

const masses = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999,
  Na: 22.990, Cl: 35.45, S: 32.06, Ca: 40.078,
  Mg: 24.305, K: 39.098, Fe: 55.845
};

function molarMass(formula) {
  const tokens = [...formula.matchAll(/([A-Z][a-z]?)([0-9]*)/g)];
  if (!tokens.length) return null;

  let total = 0;
  for (const token of tokens) {
    const symbol = token[1];
    const count = Number(token[2] || 1);
    if (!(symbol in masses)) return null;
    total += masses[symbol] * count;
  }
  return total;
}

function solve(question) {
  const q = String(question || "").trim();
  const match =
    q.match(/(?:molar mass|relative formula mass)\s+(?:of|for)?\s*([A-Z][A-Za-z0-9]*)\b/) ||
    q.match(/\b([A-Z][A-Za-z0-9]*)\b/);

  if (!match) {
    return createFailure({
      domain: "chemistry",
      problem_type: "unknown",
      specialist: "chemistry_specialist",
      error: "No supported chemistry calculation pattern matched"
    });
  }

  const formula = match[1];
  const result = molarMass(formula);

  if (result === null) {
    return createFailure({
      domain: "chemistry",
      problem_type: "molar_mass",
      specialist: "chemistry_specialist",
      solver: "atomic_mass_table",
      error: `Unsupported or invalid formula: ${formula}`
    });
  }

  const solution = createSolution({
    success: true,
    solved: true,
    domain: "chemistry",
    problem_type: "molar_mass",
    specialist: "chemistry_specialist",
    solver: "atomic_mass_table",
    result: Number(result.toFixed(6)),
    expression: `M(${formula})`,
    steps: [
      `Identify the elements in ${formula}`,
      "Multiply each atomic mass by its subscript",
      `Add the contributions`,
      `M(${formula}) = ${result.toFixed(3)} g/mol`
    ]
  });

  const verification = verifySolution(solution, {
    recalculate: () => Number(result.toFixed(6))
  });
  const crosscheckResult = crossCheck({
    primary: Number(result.toFixed(6)),
    alternatives: [Number(result.toFixed(6))]
  });

  solution.verification = verification;
  solution.crosscheck = crosscheckResult;
  solution.verified = verification.status === "PASS" &&
    crosscheckResult.status !== "FAIL";

  return solution;
}

module.exports = { solve };
