const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldText = `  const questionText = question.toLowerCase();`;
const newText = `  const photosynthesisQuestionText = question.toLowerCase();`;

if (!source.includes(oldText)) {
  console.error("Target Photosynthesis questionText declaration not found.");
  process.exit(1);
}

source = source.replace(oldText, newText);

const oldUses = [
  "asksBesidesSunlight =",
  "asksWhatGas =",
  "asksSunlightRole ="
];

source = source.replace(
  `questionText.includes("besides sunlight")`,
  `photosynthesisQuestionText.includes("besides sunlight")`
);

source = source.replace(
  `questionText.includes("other things")`,
  `photosynthesisQuestionText.includes("other things")`
);

source = source.replace(
  `questionText.includes("other thing")`,
  `photosynthesisQuestionText.includes("other thing")`
);

source = source.replace(
  `questionText.includes("what gas")`,
  `photosynthesisQuestionText.includes("what gas")`
);

source = source.replace(
  `questionText.includes("photosynthesis")`,
  `photosynthesisQuestionText.includes("photosynthesis")`
);

source = source.replace(
  `questionText.includes("what do you think a plant uses sunlight for")`,
  `photosynthesisQuestionText.includes("what do you think a plant uses sunlight for")`
);

source = source.replace(
  `questionText.includes("what does sunlight do")`,
  `photosynthesisQuestionText.includes("what does sunlight do")`
);

fs.writeFileSync(file, source);

console.log("Photosynthesis questionText renamed successfully.");
