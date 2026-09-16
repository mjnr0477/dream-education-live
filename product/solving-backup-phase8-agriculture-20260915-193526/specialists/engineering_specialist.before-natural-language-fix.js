const { createSolution, createFailure } =
  require("./specialist_contract.js");
const { verifySolution } =
  require("../verifier/independent_verifier.js");
const { crossCheck } =
  require("../crosscheck/crosscheck_engine.js");

function n(re, q) {
  const m = q.match(re);
  return m ? Number(m[1]) : null;
}

function finish(problem_type, solver, result, expression, steps, recalc) {
  const verification = verifySolution(
    { result, steps },
    { recalculate: recalc }
  );

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return createSolution({
    success: true,
    solved: true,
    domain: "engineering",
    problem_type,
    specialist: "engineering_specialist",
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

  if (/stress/.test(l) && /force/.test(l) && /area/.test(l)) {
    const force = n(/force[^0-9]*([0-9.]+)/, l);
    const area = n(/area[^0-9]*([0-9.]+)/, l);

    if (force !== null && area !== null && area !== 0) {
      const result = force / area;

      return finish(
        "mechanical_stress",
        "deterministic_engineering",
        result,
        q,
        [
          "Use stress = force / area.",
          `Stress = ${force} / ${area}`,
          `Stress = ${result}`
        ],
        () => force / area
      );
    }
  }

  if (/power/.test(l) && /work/.test(l) && /time/.test(l)) {
    const work = n(/work[^0-9]*([0-9.]+)/, l);
    const time = n(/time[^0-9]*([0-9.]+)/, l);

    if (work !== null && time !== null && time !== 0) {
      const result = work / time;

      return finish(
        "mechanical_power",
        "deterministic_engineering",
        result,
        q,
        [
          "Use power = work / time.",
          `Power = ${work} / ${time}`,
          `Power = ${result}`
        ],
        () => work / time
      );
    }
  }

  if (/efficiency/.test(l) && /output/.test(l) && /input/.test(l)) {
    const output = n(/output[^0-9]*([0-9.]+)/, l);
    const input = n(/input[^0-9]*([0-9.]+)/, l);

    if (output !== null && input !== null && input !== 0) {
      const result = (output / input) * 100;

      return finish(
        "efficiency",
        "deterministic_engineering",
        result,
        q,
        [
          "Use efficiency = (useful output / input) × 100.",
          `Efficiency = (${output} / ${input}) × 100`,
          `Efficiency = ${result}%`
        ],
        () => (output / input) * 100
      );
    }
  }

  return createFailure({
    domain: "engineering",
    problem_type: "unknown",
    specialist: "engineering_specialist",
    error: "No supported deterministic engineering pattern matched"
  });
}

module.exports = { solve };
