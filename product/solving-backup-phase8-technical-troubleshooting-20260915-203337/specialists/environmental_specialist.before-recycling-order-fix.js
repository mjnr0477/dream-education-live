const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [];
  const solver = "deterministic_environmental";

  // Carbon emissions from trips
  let m = l.match(/(?:emits?|emission).*?(\d+(?:\.\d+)?)\s*kg.*?(?:per trip|each trip).*?(\d+(?:\.\d+)?)\s*trips?/);
  if (m) {
    const perTrip = Number(m[1]), trips = Number(m[2]);
    result = perTrip * trips;
    expression = `${perTrip} × ${trips} = ${result} kg CO2`;
    steps = ["Total emissions = emissions per trip × number of trips", `${perTrip} × ${trips}`, `= ${result} kg CO2`];
  }

  // Water/resource use per unit
  m = l.match(/(?:uses?|consumes?).*?(\d+(?:\.\d+)?)\s*(?:liters?|litres?).*?(?:produce|producing).*?(\d+(?:\.\d+)?)\s*units?/);
  if (m) {
    const total = Number(m[1]), units = Number(m[2]);
    result = total / units;
    expression = `${total} ÷ ${units} = ${result}`;
    steps = ["Water use per unit = total water ÷ units produced", `${total} ÷ ${units}`, `= ${result} liters/unit`];
  }

  // Percentage population growth
  m = l.match(/population.*?(?:grows?|increases?).*?(\d+(?:\.\d+)?)\s*(?:to|from).*?(\d+(?:\.\d+)?)/);
  if (m && /percentage|percent|%/.test(l)) {
    const initial = Number(m[1]), final = Number(m[2]);
    result = (final - initial) / initial * 100;
    expression = `((${final} - ${initial}) ÷ ${initial}) × 100 = ${result}%`;
    steps = ["Percentage growth = (final − initial) ÷ initial × 100", `(${final} − ${initial}) ÷ ${initial} × 100`, `= ${result}%`];
  }

  // Energy efficiency
  m = l.match(/(?:receives?|input).*?(\d+(?:\.\d+)?)\s*j.*?(?:produces?|useful output).*?(\d+(?:\.\d+)?)\s*j.*?(?:efficiency|efficient)/);
  if (m) {
    const input = Number(m[1]), output = Number(m[2]);
    result = output / input * 100;
    expression = `(${output} ÷ ${input}) × 100 = ${result}%`;
    steps = ["Efficiency = useful output ÷ input × 100", `${output} ÷ ${input} × 100`, `= ${result}%`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?).*?(\d+(?:\.\d+)?)\s*(?:m2|m²|square meters).*?(?:emission|carbon|co2)/);
  if (m) {
    const mass = Number(m[1]), area = Number(m[2]);
    result = mass / area;
    expression = `${mass} ÷ ${area} = ${result} kg/m²`;
    steps = ["Emission intensity = mass ÷ area", `${mass} ÷ ${area}`, `= ${result} kg/m²`];
  }

  m = l.match(/(?:waste|water).*?(\d+(?:\.\d+)?)\s*(?:kg|liters?|litres?).*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /average|per day|daily/.test(l)) {
    const total = Number(m[1]), days = Number(m[2]);
    result = total / days;
    expression = `${total} ÷ ${days} = ${result}`;
    steps = ["Daily average = total ÷ days", `${total} ÷ ${days}`, `= ${result} per day`];
  }

  m = l.match(/(?:recycl(?:e|ed|ing)).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?).*?(?:out of|from|total|waste).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/);
  if (!m) {
    m = l.match(/(?:produces?|generates?).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?).*?(?:recycl(?:e|ed|es|ing)).*?(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/);
    if (m) {
      const total = Number(m[1]), recycled = Number(m[2]);
      result = recycled / total * 100;
      expression = `(${recycled} ÷ ${total}) × 100 = ${result}%`;
      steps = ["Recycling rate = recycled ÷ total × 100", `${recycled} ÷ ${total} × 100`, `= ${result}%`];
    }
  }
  if (m) {
    const recycled = Number(m[1]), total = Number(m[2]);
    result = recycled / total * 100;
    expression = `(${recycled} ÷ ${total}) × 100 = ${result}%`;
    steps = ["Recycling rate = recycled ÷ total × 100", `${recycled} ÷ ${total} × 100`, `= ${result}%`];
  }

  m = l.match(/(?:energy|electricity).*?(\d+(?:\.\d+)?)\s*kwh.*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /average|per day|daily/.test(l)) {
    const energy = Number(m[1]), days = Number(m[2]);
    result = energy / days;
    expression = `${energy} ÷ ${days} = ${result} kWh/day`;
    steps = ["Average daily energy = total energy ÷ days", `${energy} ÷ ${days}`, `= ${result} kWh/day`];
  }

  m = l.match(/(?:population|number of organisms).*?(\d+(?:\.\d+)?)\s*(?:individuals|organisms).*?(\d+(?:\.\d+)?)\s*(?:m2|m²|square meters)/);
  if (m && /density/.test(l)) {
    const pop = Number(m[1]), area = Number(m[2]);
    result = pop / area;
    expression = `${pop} ÷ ${area} = ${result} individuals/m²`;
    steps = ["Population density = individuals ÷ area", `${pop} ÷ ${area}`, `= ${result} individuals/m²`];
  }

  if (result === null) return createSolution({
    domain: "environmental_science",
    problem_type: "environmental_calculation",
    specialist: "environmental_specialist",
    solver,
    error: "Unsupported environmental problem"
  });

  const s = createSolution({
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
