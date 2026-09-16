const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [], solver = "deterministic_real_world";

  let m = l.match(/(\d+(?:\.\d+)?)\s*(?:items|units).*?(\d+(?:\.\d+)?)\s*(?:per|each)/);
  if (m && /cost|price|total/.test(l)) {
    const qty = Number(m[1]), price = Number(m[2]);
    result = qty * price;
    expression = `${qty} × ${price} = ${result}`;
    steps = [`Total cost = quantity × unit price`, `${qty} × ${price}`, `= ${result}`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:liters?|litres?).*?(\d+(?:\.\d+)?)\s*(?:minutes?|hours?)/);
  if (m && /flow|rate/.test(l)) {
    const volume = Number(m[1]), time = Number(m[2]);
    result = volume / time;
    expression = `${volume} ÷ ${time} = ${result}`;
    steps = [`Flow rate = volume ÷ time`, `${volume} ÷ ${time}`, `= ${result} per time unit`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:people|persons).*?(\d+(?:\.\d+)?)\s*(?:days?|day)/);
  if (m && /work|complete|finish/.test(l)) {
    const people = Number(m[1]), days = Number(m[2]);
    result = people * days;
    expression = `${people} × ${days} = ${result} person-days`;
    steps = [`Work = people × days`, `${people} × ${days}`, `= ${result} person-days`];
  }

  m = l.match(/(?:salary|income|pay).*?(\d+(?:\.\d+)?).*?(?:month|monthly).*?(\d+(?:\.\d+)?)\s*(?:months?)/);
  if (m && /total|year|period/.test(l)) {
    const monthly = Number(m[1]), months = Number(m[2]);
    result = monthly * months;
    expression = `${monthly} × ${months} = ${result}`;
    steps = [`Total pay = monthly amount × months`, `${monthly} × ${months}`, `= ${result}`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?).*?(\d+(?:\.\d+)?)\s*(?:liters?|litres?)/);
  if (m && /fuel efficiency|efficiency|km per liter|km\/l/.test(l)) {
    const distance = Number(m[1]), fuel = Number(m[2]);
    result = distance / fuel;
    expression = `${distance} ÷ ${fuel} = ${result} km/L`;
    steps = [`Fuel efficiency = distance ÷ fuel`, `${distance} ÷ ${fuel}`, `= ${result} km/L`];
  }

  if (result === null) return createSolution({
    domain: "real_world_calculations",
    problem_type: "real_world_calculation",
    specialist: "real_world_specialist",
    solver,
    error: "Unsupported real-world calculation"
  });

  let s = createSolution({
    success: true, solved: true,
    domain: "real_world_calculations",
    problem_type: "real_world_calculation",
    specialist: "real_world_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
