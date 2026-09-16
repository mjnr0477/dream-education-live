const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

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
    domain: "cross_domain",
    problem_type,
    specialist: "cross_domain_specialist",
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

  // Math + Physics: distance from speed and time
  if (
    /(physics|car|vehicle|travels?|moves?)/.test(l) &&
    /(speed|km\/h|m\/s)/.test(l) &&
    /(time|hours?|seconds?)/.test(l) &&
    /(distance|how far)/.test(l)
  ) {
    const speed = l.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|km per hour|m\/s)/);
    const time = l.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|seconds?|s)/);

    if (speed && time) {
      const v = Number(speed[1]);
      const t = Number(time[1]);
      const result = v * t;

      return finish(
        "mixed_math_physics",
        "physics_distance_chain",
        result,
        `${v} × ${t}`,
        [
          "Identify the speed from the physics part.",
          "Identify the travel time.",
          "Multiply speed by time to obtain distance."
        ],
        () => v * t
      );
    }
  }

  // Math + Finance: percentage profit
  if (
    /(profit|profit percentage|profit percent)/.test(l) &&
    /(cost|buy|bought|purchase)/.test(l) &&
    /(sell|sold|selling)/.test(l)
  ) {
    const cost = l.match(/(?:cost|buy|bought|purchase)\D*(\d+(?:\.\d+)?)/);
    const selling = l.match(/(?:sell|sold|selling)\D*(\d+(?:\.\d+)?)/);

    if (cost && selling) {
      const c = Number(cost[1]);
      const s = Number(selling[1]);
      const profit = s - c;
      const result = (profit / c) * 100;

      return finish(
        "mixed_math_finance",
        "profit_percentage_chain",
        result,
        `(((${s} - ${c}) / ${c}) × 100)`,
        [
          "Calculate the profit by subtracting cost from selling price.",
          "Divide the profit by the cost price.",
          "Multiply by 100 to obtain the profit percentage."
        ],
        () => ((s - c) / c) * 100
      );
    }
  }

  // Math + Chemistry: percentage concentration
  if (
    /(concentration|percentage concentration|percent concentration)/.test(l) &&
    /(solute|substance|chemical)/.test(l) &&
    /(solution|mixture)/.test(l)
  ) {
    const solute = l.match(/(?:solute|substance|chemical)\D*(\d+(?:\.\d+)?)\s*(?:g|kg)?/);
    const solution = l.match(/(?:solution|mixture)\D*(\d+(?:\.\d+)?)\s*(?:g|kg)?/);

    if (solute && solution) {
      const a = Number(solute[1]);
      const b = Number(solution[1]);
      const result = (a / b) * 100;

      return finish(
        "mixed_math_chemistry",
        "percentage_concentration_chain",
        result,
        `((${a} / ${b}) × 100)`,
        [
          "Identify the mass of solute.",
          "Identify the total mass of the solution.",
          "Divide solute mass by solution mass.",
          "Multiply by 100 to obtain percentage concentration."
        ],
        () => (a / b) * 100
      );
    }
  }

  // Math + Biology: survival/germination percentage
  if (
    /(germination|survival|survived|germinated)/.test(l) &&
    /(seeds?|plants?|animals?)/.test(l) &&
    /(\d+).*(?:out of|from)\s*(\d+)/.test(l)
  ) {
    const match = l.match(/(\d+).*(?:out of|from)\s*(\d+)/);

    if (match) {
      const successful = Number(match[1]);
      const total = Number(match[2]);
      const result = (successful / total) * 100;

      return finish(
        "mixed_math_biology",
        "biological_percentage_chain",
        result,
        `((${successful} / ${total}) × 100)`,
        [
          "Identify the successful biological observations.",
          "Identify the total observations.",
          "Divide successful observations by total observations.",
          "Multiply by 100."
        ],
        () => (successful / total) * 100
      );
    }
  }

  // Math + Statistics/Research: response rate
  if (
    /(research|study|survey|participants?|responded|response rate)/.test(l) &&
    /(\d+).*(?:responded|responses?)/.test(l)
  ) {
    const participants = l.match(/(\d+)\s*(?:participants?|people|subjects?)/);
    const responded = l.match(/(\d+)\s*(?:responded|responses?)/);

    if (participants && responded) {
      const total = Number(participants[1]);
      const responses = Number(responded[1]);
      const result = (responses / total) * 100;

      return finish(
        "mixed_statistics_research",
        "response_rate_chain",
        result,
        `((${responses} / ${total}) × 100)`,
        [
          "Identify the total number of participants.",
          "Identify the number who responded.",
          "Divide responses by participants.",
          "Multiply by 100 to obtain the response rate."
        ],
        () => (responses / total) * 100
      );
    }
  }

  return createFailure({
    domain: "cross_domain",
    problem_type: "unknown",
    specialist: "cross_domain_specialist",
    error: "No supported cross-domain problem pattern matched"
  });
}

module.exports = { solve };
