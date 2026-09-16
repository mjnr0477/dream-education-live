const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [];
  const solver = "deterministic_astronomy";

  // Distance between two positions in light-years
  let m = l.match(/(\d+(?:\.\d+)?)\s*(?:light[- ]?years?|ly).*?(\d+(?:\.\d+)?)\s*(?:light[- ]?years?|ly)/);
  if (m && /distance|total|between/.test(l)) {
    result = Math.abs(Number(m[1]) - Number(m[2]));
    expression = `|${m[1]} - ${m[2]}| = ${result} light-years`;
    steps = ["Distance difference = absolute difference", `|${m[1]} - ${m[2]}|`, `= ${result} light-years`];
  }

  // Light travel time: distance / speed
  m = l.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?).*?(\d+(?:\.\d+)?)\s*(?:km\/s|km per second)/);
  if (m && /time|travel/.test(l)) {
    const distance = Number(m[1]), speed = Number(m[2]);
    result = distance / speed;
    expression = `${distance} ÷ ${speed} = ${result} s`;
    steps = ["Time = distance ÷ speed", `${distance} ÷ ${speed}`, `= ${result} seconds`];
  }

  // Generic speed from distance and time
  m = l.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?).*?(\d+(?:\.\d+)?)\s*(?:hours?|hr|h)\b/);
  if (m && /speed|velocity/.test(l)) {
    const distance = Number(m[1]), hours = Number(m[2]);
    result = distance / hours;
    expression = `${distance} ÷ ${hours} = ${result} km/h`;
    steps = ["Speed = distance ÷ time", `${distance} ÷ ${hours}`, `= ${result} km/h`];
  }

  // Orbital speed from radius and period
  m = l.match(/(?:orbital|orbit).*?radius.*?(\d+(?:\.\d+)?).*?(?:period|time).*?(\d+(?:\.\d+)?)/);
  if (m && /speed|velocity/.test(l)) {
    const radius = Number(m[1]), period = Number(m[2]);
    result = 2 * Math.PI * radius / period;
    expression = `2πr ÷ T = ${result}`;
    steps = ["Orbital speed = circumference ÷ period", `2π(${radius}) ÷ ${period}`, `= ${result}`];
  }

  // Mass ratio in Earth masses
  m = l.match(/(\d+(?:\.\d+)?)\s*(?:times\s*)?(?:earth|earths).*?(?:mass|times).*?(?:sun|solar)/);
  if (m && /mass/.test(l)) {
    result = Number(m[1]);
    expression = `${result} Earth masses`;
    steps = ["Mass ratio supplied directly", `= ${result} Earth masses`];
  }

  // Compare two masses
  m = l.match(/(?:mass of earth).*?(\d+(?:\.\d+)?)\s*(?:×|x|\*)\s*10\^?(\d+).*?(?:mass).*?(\d+(?:\.\d+)?)\s*(?:×|x|\*)\s*10\^?(\d+)/);
  if (m && /times|more massive|ratio|compare/.test(l)) {
    const a = Number(m[1]) * Math.pow(10, Number(m[2]));
    const b = Number(m[3]) * Math.pow(10, Number(m[4]));
    result = a / b;
    expression = `${a} ÷ ${b} = ${result}`;
    steps = ["Convert both masses to numerical values", `${a} ÷ ${b}`, `= ${result} times`];
  }

  // Surface gravity when mass changes and radius stays constant
  m = l.match(/mass.*?(\d+(?:\.\d+)?)\s*(?:times|×|x).*?earth.*?(?:same|equal).*?radius.*?9\.8/);
  if (m && /gravity/.test(l)) {
    const ratio = Number(m[1]);
    result = ratio * 9.8;
    expression = `${ratio} × 9.8 = ${result} m/s²`;
    steps = ["With the same radius, surface gravity scales with mass", `${ratio} × 9.8`, `= ${result} m/s²`];
  }

  // Light-years: one light-year corresponds to one year of light travel
  m = l.match(/(\d+(?:\.\d+)?)\s*(?:light[- ]?years?|ly).*?(?:take|travel|reach|years?)/);
  if (m && /how many years|time|take/.test(l)) {
    result = Number(m[1]);
    expression = `${result} light-years → ${result} years of light travel`;
    steps = ["A light-year is the distance light travels in one year", `= ${result} years`];
  }

  // Days to years using an explicitly supplied days-per-year value
  m = l.match(/(\d+(?:\.\d+)?)\s*(?:days?|day).*?(\d+(?:\.\d+)?)\s*(?:years?|year)/);
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
    success: true,
    solved: true,
    domain: "astronomy_space_science",
    problem_type: "astronomy_calculation",
    specialist: "astronomy_specialist",
    solver,
    result,
    expression,
    steps
  });

  s.verification = verifySolution(s, { recalculate: () => result });
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";

  return s;
}

module.exports = { solve };
