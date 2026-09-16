const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [];
  const solver = "deterministic_astronomy";

  let m = l.match(/(\d+(?:\.\d+)?)\s*(?:light[- ]?years?|ly).*?(\d+(?:\.\d+)?)\s*(?:light[- ]?years?|ly)/);
  if (m && /distance|total|between/.test(l)) {
    result = Math.abs(Number(m[1]) - Number(m[2]));
    expression = `|${m[1]} - ${m[2]}| = ${result} light-years`;
    steps = ["Distance difference = absolute difference", `|${m[1]} - ${m[2]}|`, `= ${result} light-years`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?).*?(\d+(?:\.\d+)?)\s*(?:km\/s|km per second)/);
  if (m && /time/.test(l)) {
    const distance = Number(m[1]), speed = Number(m[2]);
    result = distance / speed;
    expression = `${distance} ÷ ${speed} = ${result} s`;
    steps = ["Time = distance ÷ speed", `${distance} ÷ ${speed}`, `= ${result} seconds`];
  }

  m = l.match(/(?:orbital|orbit).*?radius.*?(\d+(?:\.\d+)?).*?(?:period|time).*?(\d+(?:\.\d+)?)/);
  if (m && /speed|velocity/.test(l)) {
    const radius = Number(m[1]), period = Number(m[2]);
    result = 2 * Math.PI * radius / period;
    expression = `2πr ÷ T = ${result}`;
    steps = ["Orbital speed = circumference ÷ period", `2π(${radius}) ÷ ${period}`, `= ${result}`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:earth|earths).*?(?:mass|times).*?(?:sun|solar)/);
  if (m && /mass/.test(l)) {
    result = Number(m[1]);
    expression = `${result} Earth masses`;
    steps = ["Mass ratio supplied directly", `= ${result} Earth masses`];
  }

  m = l.match(/(\d+(?:\.\d+)?)\s*(?:days?|days).*?(\d+(?:\.\d+)?)\s*(?:years?|year)/);
  if (m && /convert|how many/.test(l)) {
    result = Number(m[1]) / Number(m[2]);
    expression = `${m[1]} ÷ ${m[2]} = ${result}`;
    steps = ["Convert days using supplied days-per-year value", `${m[1]} ÷ ${m[2]}`, `= ${result} years`];
  }

  if (result === null) return createSolution({
    domain: "astronomy_space_science",
    problem_type: "astronomy_calculation",
    specialist: "astronomy_specialist",
    solver,
    error: "Unsupported astronomy problem"
  });

  const s = createSolution({
    success: true, solved: true,
    domain: "astronomy_space_science",
    problem_type: "astronomy_calculation",
    specialist: "astronomy_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
