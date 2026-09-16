const fs = require("fs");

const file = "concept_evidence_engine.js";
let s = fs.readFileSync(file, "utf8");

const processStart = s.indexOf(`  // PROCESS / EFFECT`);
const processEnd = s.indexOf(`  // =========================
  // OUTCOME`);

if (processStart === -1 || processEnd === -1 || processEnd <= processStart) {
  console.error("Could not locate process section.");
  process.exit(1);
}

const newProcess = `  // PROCESS / EFFECT
  // =========================

  const processSignals = [
    "reduce photosynthesis",
    "reduces photosynthesis",
    "reduced photosynthesis",
    "less photosynthesis",
    "lower photosynthesis",
    "lower the rate of photosynthesis",
    "lower rate of photosynthesis",
    "reduce the rate of photosynthesis",
    "reduces the rate of photosynthesis",
    "photosynthesis decreases",
    "photosynthesis decrease",
    "photosynthesis is reduced",
    "photosynthesis would be reduced",
    "photosynthesis would decrease",
    "photosynthesis slows",
    "slows photosynthesis",
    "photosynthesis will decrease",
    "photosynthesis will be lower"
  ];

  if (processSignals.some(signal => a.includes(signal))) {
    result.process = "reduced photosynthesis";
    result.evidence.push("process");
  }

`;

s = s.slice(0, processStart) + newProcess + s.slice(processEnd);

const outcomeStart = s.indexOf(`  // OUTCOME
  // =========================`);

const outcomeEnd = s.indexOf(`  result.completeness =`);

if (outcomeStart === -1 || outcomeEnd === -1 || outcomeEnd <= outcomeStart) {
  console.error("Could not locate outcome section.");
  process.exit(1);
}

const newOutcome = `  // OUTCOME
  // =========================

  const outcomeSignals = [
    "less food",
    "make less food",
    "makes less food",
    "produce less food",
    "produces less food",
    "will produce less food",
    "will not make enough food",
    "not make enough food",
    "does not make enough food",
    "not enough food",
    "food production",
    "food production decreases",
    "food production will decrease",
    "food production is reduced",
    "reduced food production",
    "less glucose",
    "produce less glucose",
    "produces less glucose",
    "less sugar",
    "produce less sugar",
    "produces less sugar"
  ];

  if (outcomeSignals.some(signal => a.includes(signal))) {
    result.outcome = "reduced food production";
    result.evidence.push("outcome");
  }

`;

s = s.slice(0, outcomeStart) + newOutcome + s.slice(outcomeEnd);

fs.writeFileSync(file, s);

console.log("Evidence phrasing expanded successfully.");
