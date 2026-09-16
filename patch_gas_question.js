const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const oldBlock = `const asksWhatGas =
    photosynthesisQuestionText.includes("what gas") &&
    photosynthesisQuestionText.includes("photosynthesis");`;

const newBlock = `const asksWhatGas =
    (
      photosynthesisQuestionText.includes("what gas") ||
      (
        (
          photosynthesisQuestionText.includes("take in") ||
          photosynthesisQuestionText.includes("takes in")
        ) &&
        (
          photosynthesisQuestionText.includes("carbon dioxide") ||
          photosynthesisQuestionText.includes("oxygen")
        )
      )
    ) &&
    photosynthesisQuestionText.includes("photosynthesis");`;

if (!s.includes(oldBlock)) {
  throw new Error("Original asksWhatGas block not found");
}

if (s.includes("const asksWhatGas =") && s.includes("photosynthesisQuestionText.includes(\"take in\")")) {
  console.log("Gas question detector already patched.");
} else {
  s = s.replace(oldBlock, newBlock);
  fs.writeFileSync(file, s);
  console.log("Gas question detector patched.");
}
