const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const oldText = `} else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("use oxygen") ||
      answer.includes("uses oxygen")
    ) &&
    (
      answer.includes("release carbon dioxide") ||
      answer.includes("releases carbon dioxide") ||
      answer.includes("give out carbon dioxide") ||
      answer.includes("gives out carbon dioxide")
    )
  ) {`;

const newText = `} else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("take in more oxygen") ||
      answer.includes("takes in more oxygen") ||
      answer.includes("use oxygen") ||
      answer.includes("uses oxygen") ||
      answer.includes("oxygen as an input") ||
      answer.includes("oxygen is taken in")
    ) &&
    (
      answer.includes("release carbon dioxide") ||
      answer.includes("releases carbon dioxide") ||
      answer.includes("give out carbon dioxide") ||
      answer.includes("gives out carbon dioxide")
    )
  ) {`;

if (!code.includes(oldText)) {
  console.error("TARGET BLOCK NOT FOUND");
  process.exit(1);
}

code = code.replace(oldText, newText);

fs.writeFileSync(file, code);
console.log("Misconception condition updated.");
