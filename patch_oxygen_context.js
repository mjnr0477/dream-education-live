const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const oldText = `    ) &&
    answer.includes("photosynthesis");`;

const newText = `    ) &&
    photosynthesisQuestionText.includes("photosynthesis");`;

if (!code.includes(oldText)) {
  console.error("OXYGEN CONTEXT BLOCK NOT FOUND");
  process.exit(1);
}

code = code.replace(oldText, newText);

fs.writeFileSync(file, code);
console.log("Oxygen misconception now uses question context.");
