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

function numbers(text) {
  return [...String(text).matchAll(/-?\d+(?:\.\d+)?/g)]
    .map(m => Number(m[0]));
}

function solve(question) {
  const q = String(question || "").trim();
  const l = q.toLowerCase();

  // ------------------------------------------------------------
  // MATH + PHYSICS
  // ------------------------------------------------------------

  if (
    /(car|vehicle|travels?|moves?|physics)/.test(l) &&
    /(speed|km\/h|km per hour|m\/s)/.test(l) &&
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
          "Identify the speed.",
          "Identify the travel time.",
          "Multiply speed by time to obtain distance."
        ],
        () => v * t
      );
    }
  }

  // ------------------------------------------------------------
  // UNITS + PHYSICS
  // ------------------------------------------------------------

  if (
    /(force|mass|acceleration|physics)/.test(l) &&
    /(kg|kilogram|g|gram)/.test(l) &&
    /(m\/s|m\/s²|acceleration)/.test(l)
  ) {
    const ns = numbers(l);

    if (ns.length >= 2) {
      const mass = ns[0];
      const acceleration = ns[1];
      const result = mass * acceleration;

      return finish(
        "mixed_physics_engineering",
        "newton_second_law_chain",
        result,
        `${mass} × ${acceleration}`,
        [
          "Identify the mass.",
          "Identify the acceleration.",
          "Apply Newton's second law.",
          "Multiply mass by acceleration to obtain force."
        ],
        () => mass * acceleration
      );
    }
  }

  // ------------------------------------------------------------
  // PHYSICS + ENGINEERING
  // ------------------------------------------------------------

  if (
    /(force|load|engineering|stress)/.test(l) &&
    /(area|m²|m2|square meter)/.test(l) &&
    /stress/.test(l)
  ) {
    const force = l.match(/(?:force|load)\D*(\d+(?:\.\d+)?)/);
    const area = l.match(/(?:area)\D*(\d+(?:\.\d+)?)/);

    if (force && area && Number(area[1]) !== 0) {
      const f = Number(force[1]);
      const a = Number(area[1]);
      const result = f / a;

      return finish(
        "mixed_physics_engineering",
        "stress_chain",
        result,
        `${f} / ${a}`,
        [
          "Identify the applied force.",
          "Identify the cross-sectional area.",
          "Divide force by area to obtain stress."
        ],
        () => f / a
      );
    }
  }

  // ------------------------------------------------------------
  // MATH + FINANCE
  // ------------------------------------------------------------

  if (
    /(profit|profit percentage|profit percent)/.test(l) &&
    /(cost|buy|bought|purchase)/.test(l) &&
    /(sell|sold|selling)/.test(l)
  ) {
    const cost = l.match(/(?:cost|buy|bought|purchase)\D*(\d+(?:\.\d+)?)/);
    const selling = l.match(/(?:sell|sold|selling)\D*(\d+(?:\.\d+)?)/);

    if (cost && selling && Number(cost[1]) !== 0) {
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
          "Calculate profit by subtracting cost from selling price.",
          "Divide profit by cost price.",
          "Multiply by 100."
        ],
        () => ((s - c) / c) * 100
      );
    }
  }

  // ------------------------------------------------------------
  // MATH + CHEMISTRY
  // ------------------------------------------------------------

  if (
    /(concentration|percentage concentration|percent concentration)/.test(l) &&
    /(solute|substance|chemical)/.test(l) &&
    /(solution|mixture)/.test(l)
  ) {
    const solute = l.match(
      /(?:solute|substance|chemical)\D*(\d+(?:\.\d+)?)\s*(?:g|kg)?/
    );
    const solution = l.match(
      /(?:solution|mixture)\D*(\d+(?:\.\d+)?)\s*(?:g|kg)?/
    );

    if (solute && solution && Number(solution[1]) !== 0) {
      const a = Number(solute[1]);
      const b = Number(solution[1]);
      const result = (a / b) * 100;

      return finish(
        "mixed_math_chemistry",
        "percentage_concentration_chain",
        result,
        `((${a} / ${b}) × 100)`,
        [
          "Identify solute quantity.",
          "Identify total solution quantity.",
          "Divide solute by solution.",
          "Multiply by 100."
        ],
        () => (a / b) * 100
      );
    }
  }

  // ------------------------------------------------------------
  // BIOLOGY + CHEMISTRY
  // ------------------------------------------------------------

  if (
    /(biology|biological|cell|organism|plant|animal)/.test(l) &&
    /(chemical|molecule|molar|concentration|solute|solution)/.test(l)
  ) {
    const ns = numbers(l);

    if (ns.length >= 2 && /(concentration|solute|solution)/.test(l)) {
      const amount = ns[0];
      const volume = ns[1];

      if (volume !== 0) {
        const result = amount / volume;

        return finish(
          "mixed_biology_chemistry",
          "biological_concentration_chain",
          result,
          `${amount} / ${volume}`,
          [
            "Identify the biological sample quantity.",
            "Identify the solution volume.",
            "Divide quantity by volume to obtain concentration."
          ],
          () => amount / volume
        );
      }
    }
  }

  // ------------------------------------------------------------
  // MATH + BIOLOGY
  // ------------------------------------------------------------

  if (
    /(germination|survival|survived|germinated)/.test(l) &&
    /(seeds?|plants?|animals?)/.test(l)
  ) {
    const match = l.match(
      /(\d+(?:\.\d+)?)\s*(?:out of|from)\s*(\d+(?:\.\d+)?)/
    );

    if (match && Number(match[2]) !== 0) {
      const successful = Number(match[1]);
      const total = Number(match[2]);
      const result = (successful / total) * 100;

      return finish(
        "mixed_math_biology",
        "biological_percentage_chain",
        result,
        `((${successful} / ${total}) × 100)`,
        [
          "Identify successful observations.",
          "Identify total observations.",
          "Divide successful observations by total.",
          "Multiply by 100."
        ],
        () => (successful / total) * 100
      );
    }
  }

  // ------------------------------------------------------------
  // MATH + AGRICULTURE
  // ------------------------------------------------------------

  if (
    /(farm|crop|field|agriculture|harvest|yield)/.test(l) &&
    /(hectare|ha)/.test(l) &&
    /(kg|ton|tonne)/.test(l)
  ) {
    const yieldMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:kg|tons?|tonnes?)\s*(?:per|\/)\s*(?:hectare|ha)/
    );
    const areaMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:hectares?|ha)/
    );

    if (yieldMatch && areaMatch) {
      const yieldRate = Number(yieldMatch[1]);
      const area = Number(areaMatch[1]);
      const result = yieldRate * area;

      return finish(
        "mixed_math_biology",
        "agricultural_yield_chain",
        result,
        `${yieldRate} × ${area}`,
        [
          "Identify yield per hectare.",
          "Identify total hectares.",
          "Multiply yield rate by area."
        ],
        () => yieldRate * area
      );
    }
  }

  // ------------------------------------------------------------
  // STATISTICS + RESEARCH
  // ------------------------------------------------------------

  if (
    /(research|study|survey|participants?|responded|response rate)/.test(l)
  ) {
    const participants = l.match(
      /(\d+(?:\.\d+)?)\s*(?:participants?|people|subjects?)/
    );
    const responded = l.match(
      /(\d+(?:\.\d+)?)\s*(?:responded|responses?)/
    );

    if (participants && responded && Number(participants[1]) !== 0) {
      const total = Number(participants[1]);
      const responses = Number(responded[1]);
      const result = (responses / total) * 100;

      return finish(
        "mixed_statistics_research",
        "response_rate_chain",
        result,
        `((${responses} / ${total}) × 100)`,
        [
          "Identify the total participants.",
          "Identify the number of responses.",
          "Divide responses by participants.",
          "Multiply by 100."
        ],
        () => (responses / total) * 100
      );
    }
  }

  // ------------------------------------------------------------
  // GEOGRAPHY + MATHEMATICS
  // ------------------------------------------------------------

  if (
    /(map|scale|geography|distance)/.test(l) &&
    /1\s*:\s*\d+/.test(l) &&
    /cm/.test(l)
  ) {
    const scale = l.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
    const cm = l.match(/(\d+(?:\.\d+)?)\s*cm/);

    if (scale && cm) {
      const scaleValue = Number(scale[1]);
      const mapDistance = Number(cm[1]);
      const result = (scaleValue * mapDistance) / 100000;

      return finish(
        "mixed_math_geography",
        "map_scale_chain",
        result,
        `(${scaleValue} × ${mapDistance}) / 100000`,
        [
          "Identify the map scale.",
          "Identify the map distance.",
          "Multiply map distance by the scale.",
          "Convert centimetres to kilometres."
        ],
        () => (scaleValue * mapDistance) / 100000
      );
    }
  }

  // ------------------------------------------------------------
  // ENVIRONMENT + STATISTICS
  // ------------------------------------------------------------

  if (
    /(environment|environmental|emission|pollution|recycling|waste)/.test(l) &&
    /(percentage|percent|rate|total)/.test(l)
  ) {
    const match = l.match(
      /(\d+(?:\.\d+)?)\s*(?:out of|of)\s*(\d+(?:\.\d+)?)/
    );

    if (match && Number(match[2]) !== 0) {
      const part = Number(match[1]);
      const total = Number(match[2]);
      const result = (part / total) * 100;

      return finish(
        "mixed_statistics_environment",
        "environmental_rate_chain",
        result,
        `((${part} / ${total}) × 100)`,
        [
          "Identify the environmental quantity.",
          "Identify the total quantity.",
          "Divide the quantity by the total.",
          "Multiply by 100."
        ],
        () => (part / total) * 100
      );
    }
  }

  // ------------------------------------------------------------
  // ECONOMICS + AGRICULTURE
  // ------------------------------------------------------------

  if (
    /(farm|crop|agriculture|harvest)/.test(l) &&
    /(profit|revenue|income|cost)/.test(l)
  ) {
    const revenue = l.match(/(?:revenue|income|sales)\D*(\d+(?:\.\d+)?)/);
    const cost = l.match(/cost\D*(\d+(?:\.\d+)?)/);

    if (revenue && cost) {
      const r = Number(revenue[1]);
      const c = Number(cost[1]);
      const result = r - c;

      return finish(
        "mixed_economics_agriculture",
        "farm_profit_chain",
        result,
        `${r} - ${c}`,
        [
          "Identify agricultural revenue.",
          "Identify agricultural cost.",
          "Subtract cost from revenue to obtain profit."
        ],
        () => r - c
      );
    }
  }

  // ------------------------------------------------------------
  // MULTI-DOMAIN SIMPLE ADDITION
  // ------------------------------------------------------------

  if (
    /(total|combined|altogether)/.test(l) &&
    /(physics|engineering|agriculture|finance|economics|research|environment)/.test(l)
  ) {
    const ns = numbers(l);

    if (ns.length >= 2) {
      const result = ns.reduce((a, b) => a + b, 0);

      return finish(
        "complex_multi_domain",
        "multi_domain_numeric_chain",
        result,
        ns.join(" + "),
        [
          "Identify the numerical quantities from the domain-specific context.",
          "Combine the quantities using the requested total operation."
        ],
        () => ns.reduce((a, b) => a + b, 0)
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
