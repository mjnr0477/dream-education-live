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

function finalize({
  question,
  problemType,
  solver,
  result,
  expression,
  steps
}) {
  const solution = createSolution({
    success: true,
    solved: true,
    domain: "agriculture",
    problem_type: problemType,
    specialist: "agriculture_specialist",
    solver,
    result,
    expression: expression || "",
    steps,
    assumptions: [],
    evidence: [],
    verification: null,
    crosscheck: null,
    verified: false,
    error: null
  });

  const verification = verifySolution(solution, {
    recalculate: () => result
  });

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return {
    ...solution,
    verification,
    crosscheck,
    verified:
      verification.status === "PASS" &&
      crosscheck.status !== "FAIL"
  };
}

function solve(question) {
  const q = String(question || "").trim();
  const l = q.toLowerCase();

  // Crop yield
  if (
    /yield/.test(l) &&
    /area/.test(l) &&
    /(hectare|ha|acre)/.test(l)
  ) {
    const yieldMatch = l.match(
      /yield(?:\s+of)?\s+(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|tonnes?|tons?)?\s*(?:per|\/)\s*(?:hectare|ha|acre)/
    );

    const areaMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:hectares?|ha|acres?)/
    );

    if (yieldMatch && areaMatch) {
      const yieldValue = Number(yieldMatch[1]);
      const area = Number(areaMatch[1]);
      const result = yieldValue * area;

      return finalize({
        question: q,
        problemType: "crop_yield",
        solver: "deterministic_agriculture",
        result,
        expression: `${yieldValue} × ${area}`,
        steps: [
          `Yield per unit area = ${yieldValue}`,
          `Area = ${area}`,
          `Total yield = ${yieldValue} × ${area}`,
          `Total yield = ${result}`
        ]
      });
    }
  }

  // Plant population
  if (
    /(plant population|number of plants|plants)/.test(l) &&
    /(spacing|row spacing)/.test(l)
  ) {
    const areaMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:square\s*met(?:re|er)s?|m2|m²|hectares?|ha)/
    );

    const spacingMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)/
    );

    if (areaMatch && spacingMatch) {
      let area = Number(areaMatch[1]);

      if (/hectare|ha/.test(areaMatch[0])) {
        area *= 10000;
      }

      const rowSpacing = Number(spacingMatch[1]);
      const plantSpacing = Number(spacingMatch[2]);
      const plantsPerUnit = 1 / (rowSpacing * plantSpacing);
      const result = Math.floor(area * plantsPerUnit);

      return finalize({
        question: q,
        problemType: "plant_population",
        solver: "deterministic_agriculture",
        result,
        expression: `${area} ÷ (${rowSpacing} × ${plantSpacing})`,
        steps: [
          `Area = ${area} m²`,
          `Row spacing = ${rowSpacing} m`,
          `Plant spacing = ${plantSpacing} m`,
          `Area occupied by one plant = ${rowSpacing} × ${plantSpacing} = ${rowSpacing * plantSpacing} m²`,
          `Plant population = ${area} ÷ ${rowSpacing * plantSpacing}`,
          `Plant population = ${result} plants`
        ]
      });
    }
  }

  // Fertilizer quantity
  if (
    /(fertilizer|fertiliser)/.test(l) &&
    /(rate|per hectare|per ha)/.test(l)
  ) {
    const rateMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\s*(?:per|\/)\s*(?:hectare|ha)/
    );

    const areaMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:hectares?|ha)/
    );

    if (rateMatch && areaMatch) {
      const rate = Number(rateMatch[1]);
      const area = Number(areaMatch[1]);
      const result = rate * area;

      return finalize({
        question: q,
        problemType: "fertilizer_requirement",
        solver: "deterministic_agriculture",
        result,
        expression: `${rate} × ${area}`,
        steps: [
          `Fertilizer rate = ${rate} kg/ha`,
          `Farm area = ${area} ha`,
          `Required fertilizer = ${rate} × ${area}`,
          `Required fertilizer = ${result} kg`
        ]
      });
    }
  }

  // Simple livestock feed requirement
  if (
    /(feed|fodder)/.test(l) &&
    /(animals?|cattle|cows|goats|sheep|chickens?)/.test(l)
  ) {
    const feedMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\s*(?:per|\/)\s*(?:animal|cow|cattle|goat|sheep|chicken)/
    );

    const animalMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:animals?|cattle|cows|goats|sheep|chickens?)/
    );

    if (feedMatch && animalMatch) {
      const feed = Number(feedMatch[1]);
      const animals = Number(animalMatch[1]);
      const result = feed * animals;

      return finalize({
        question: q,
        problemType: "livestock_feed_requirement",
        solver: "deterministic_agriculture",
        result,
        expression: `${feed} × ${animals}`,
        steps: [
          `Feed per animal = ${feed} kg`,
          `Number of animals = ${animals}`,
          `Total feed = ${feed} × ${animals}`,
          `Total feed = ${result} kg`
        ]
      });
    }
  }

  // Percentage germination
  if (
    /(germination|germinate)/.test(l) &&
    /(seed|seeds)/.test(l)
  ) {
    const germinatedMatch = l.match(
      /(\d+(?:\.\d+)?)\s*(?:seeds?)\s*(?:germinated|germinate)/
    );

    const totalMatch = l.match(
      /(?:out of|from)\s+(\d+(?:\.\d+)?)\s*(?:seeds?)/
    );

    if (germinatedMatch && totalMatch) {
      const germinated = Number(germinatedMatch[1]);
      const total = Number(totalMatch[1]);
      const result = (germinated / total) * 100;

      return finalize({
        question: q,
        problemType: "germination_percentage",
        solver: "deterministic_agriculture",
        result,
        expression: `(${germinated} ÷ ${total}) × 100`,
        steps: [
          `Germinated seeds = ${germinated}`,
          `Total seeds = ${total}`,
          `Germination percentage = (${germinated} ÷ ${total}) × 100`,
          `Germination percentage = ${result}%`
        ]
      });
    }
  }

  return createFailure({
    domain: "agriculture",
    problem_type: "unsupported",
    specialist: "agriculture_specialist",
    solver: "deterministic_agriculture",
    error: "Agriculture problem type not supported by this specialist"
  });
}

module.exports = {
  solve
};
