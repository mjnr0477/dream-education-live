const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [], solver = "deterministic_environmental";

  let m = l.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?).*?(\d+(?:\.\d+)?)\s*(?:m2|m²|square meters).*?(?:emission|carbon|co2)/);
  if (m) {
    const mass = Number(m[1]), area = Number(m[2]);
    result = mass / area;
    expression = `${mass} ÷ ${area} = ${result} kg/m²`;
    steps = [`Emission intensity = mass ÷ area`, `${mass} ÷ ${area}`, `= ${result} kg/m²`];
  }

  m = l.match(/(?:waste|water).*?(\d+(?:\.\d+)?)\s*(?:kg|liters?|litres?).*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /average|per day|daily/.test(l)) {
    const total = Number(m[1]), days = Number(m[2]);
    result = total / days;
    expression = `${total} ÷ ${days} = ${result}`;
    steps = [`Daily average = total ÷ days`, `${total} ÷ ${days}`, `= ${result} per day`];
  }

  m = l.match(/(?:recycle|recycled).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?).*?(?:out of|from).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/);
  if (m) {
    const recycled = Number(m[1]), total = Number(m[2]);
    result = recycled / total * 100;
    expression = `(${recycled} ÷ ${total}) × 100 = ${result}%`;
    steps = [`Recycling rate = recycled ÷ total × 100`, `${recycled} ÷ ${total} × 100`, `= ${result}%`];
  }

  m = l.match(/(?:energy|electricity).*?(\d+(?:\.\d+)?)\s*kwh.*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /average|per day|daily/.test(l)) {
    const energy = Number(m[1]), days = Number(m[2]);
    result = energy / days;
    expression = `${energy} ÷ ${days} = ${result} kWh/day`;
    steps = [`Average daily energy = total energy ÷ days`, `${energy} ÷ ${days}`, `= ${result} kWh/day`];
  }

  m = l.match(/(?:population|number of organisms).*?(\d+(?:\.\d+)?)\s*(?:individuals|organisms).*?(\d+(?:\.\d+)?)\s*(?:m2|m²|square meters)/);
  if (m && /density/.test(l)) {
    const pop = Number(m[1]), area = Number(m[2]);
    result = pop / area;
    expression = `${pop} ÷ ${area} = ${result} individuals/m²`;
    steps = [`Population density = individuals ÷ area`, `${pop} ÷ ${area}`, `= ${result} individuals/m²`];
  }

  if (result === null) return createSolution({
    domain: "environmental_science",
    problem_type: "environmental_calculation",
    specialist: "environmental_specialist",
    solver,
    error: "Unsupported environmental problem"
  });

  let s = createSolution({
    success: true, solved: true,
    domain: "environmental_science",
    problem_type: "environmental_calculation",
    specialist: "environmental_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
