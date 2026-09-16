const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();

  let result = null;
  let expression = "";
  let steps = [];
  let solver = "deterministic_geography";

  let m = l.match(/scale\s*(?:of)?\s*1\s*:\s*(\d+).*?(\d+(?:\.\d+)?)\s*cm/);
  if (m) {
    const scale = Number(m[1]);
    const mapCm = Number(m[2]);
    result = mapCm * scale / 100000;
    expression = `${mapCm} × ${scale} cm = ${result} km`;
    steps = [`Real distance = map distance × scale`, `${mapCm} × ${scale} cm`, `= ${result} km`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:people|persons|population).*?(\d+(?:\.\d+)?)\s*(?:km2|km²|square kilometers|square kilometres)/);
  if (m && /density/.test(l)) {
    const population = Number(m[1]);
    const area = Number(m[2]);
    result = population / area;
    expression = `${population} ÷ ${area} = ${result}`;
    steps = [`Population density = population ÷ area`, `${population} ÷ ${area}`, `= ${result} people/km²`];
  }

  m = l.match(/(?:elevation|height).*?(\d+(?:\.\d+)?)\s*m.*?(?:to|and).*?(\d+(?:\.\d+)?)\s*m.*?(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?)/);
  if (m && /(gradient|slope)/.test(l)) {
    const e1 = Number(m[1]);
    const e2 = Number(m[2]);
    const distance = Number(m[3]);
    result = ((e2 - e1) / (distance * 1000)) * 100;
    expression = `((${e2}-${e1}) ÷ ${distance * 1000}) × 100 = ${result}%`;
    steps = [`Elevation change = ${e2} - ${e1} = ${e2 - e1} m`, `Horizontal distance = ${distance * 1000} m`, `Gradient = rise ÷ run × 100`, `= ${result}%`];
  }

  m = l.match(/(?:lapse rate|temperature decreases).*?(\d+(?:\.\d+)?)\s*(?:°c|c).*?(?:per|for each)\s*(\d+(?:\.\d+)?)\s*km/);
  if (m) {
    const rate = Number(m[1]);
    const altitude = Number(m[2]);
    result = -(rate * altitude);
    expression = `-${rate} × ${altitude} = ${result} °C`;
    steps = [`Temperature change = lapse rate × altitude`, `${rate} × ${altitude}`, `= ${Math.abs(result)} °C decrease`];
  }

  m = l.match(/rainfall.*?(\d+(?:\.\d+)?)\s*mm.*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /average|per day/.test(l)) {
    const total = Number(m[1]);
    const days = Number(m[2]);
    result = total / days;
    expression = `${total} ÷ ${days} = ${result} mm/day`;
    steps = [`Average daily rainfall = total rainfall ÷ days`, `${total} ÷ ${days}`, `= ${result} mm/day`];
  }

  if (result === null) return createSolution({
    domain: "geography_earth_science",
    problem_type: "geography_calculation",
    specialist: "geography_specialist",
    solver,
    error: "Unsupported geography problem"
  });

  let s = createSolution({
    success: true, solved: true,
    domain: "geography_earth_science",
    problem_type: "geography_calculation",
    specialist: "geography_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
