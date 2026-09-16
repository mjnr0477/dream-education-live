const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `const understandingSignals = [
  "why",
  "how does",
  "how do",
  "explain why",
  "explain how",
  "why is",
  "why does",
  "why do"
];`;

const replacement = `const understandingSignals = [
  "why",
  "how does",
  "how do",
  "explain why",
  "explain how",
  "why is",
  "why does",
  "why do"
];

const applicationScenarioSignals = [
  "farmer",
  "farm",
  "garden",
  "greenhouse",
  "plant growing",
  "plant is growing",
  "thick shade",
  "shade",
  "shaded",
  "real-life situation",
  "real life situation",
  "scenario",
  "experiment",
  "kept in",
  "placed in",
  "not making enough",
  "what would happen to",
  "what effect would",
  "how would this affect"
];`;

if (!source.includes(marker)) {
  console.error("Classifier marker not found.");
  process.exit(1);
}

source = source.replace(marker, replacement);

const oldCondition = `if (
  applicationSignals.some(signal =>
    questionText.includes(signal)
  )
) {`;

const newCondition = `if (
  applicationSignals.some(signal =>
    questionText.includes(signal)
  ) ||
  applicationScenarioSignals.some(signal =>
    questionText.includes(signal)
  )
) {`;

if (!source.includes(oldCondition)) {
  console.error("Application condition not found.");
  process.exit(1);
}

source = source.replace(oldCondition, newCondition);

fs.writeFileSync(file, source);

console.log("Application classifier improved.");
