const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `let misconceptions =
  "No clear misconception detected.";`;

if (!source.includes(marker)) {
  console.error("Could not find assessment initialization.");
  process.exit(1);
}

if (source.includes("QUESTION TYPE CLASSIFICATION")) {
  console.error("Question type classifier already exists.");
  process.exit(1);
}

const block = `
/*
  QUESTION TYPE CLASSIFICATION

  The engine first determines what kind of thinking
  the question requires before assessing the answer.
*/

const questionText = question.trim().toLowerCase();

let questionType = "recall";

const applicationSignals = [
  "apply",
  "application",
  "real-life",
  "real life",
  "new problem",
  "new situation",
  "what would happen",
  "what happens if",
  "predict",
  "how would",
  "how could",
  "use what you learned",
  "in a different situation"
];

const understandingSignals = [
  "why",
  "how does",
  "how do",
  "explain why",
  "explain how",
  "why is",
  "why does",
  "why do"
];

if (
  applicationSignals.some(signal =>
    questionText.includes(signal)
  )
) {
  questionType = "application";

} else if (
  understandingSignals.some(signal =>
    questionText.includes(signal)
  )
) {
  questionType = "understanding";
}

`;

source = source.replace(
  marker,
  marker + block
);

fs.writeFileSync(file, source);

console.log("Question type classifier added successfully.");
