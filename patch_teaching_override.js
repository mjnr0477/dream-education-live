const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const oldText = `    if (
      questionType === "application" &&
      !mastered &&
      teachingAnalysis &&`;

const newText = `    if (
      questionType === "application" &&
      understanding !== "misconception" &&
      !mastered &&
      teachingAnalysis &&`;

if (!code.includes(oldText)) {
  console.error("TEACHING OVERRIDE CONDITION NOT FOUND");
  process.exit(1);
}

code = code.replace(oldText, newText);

fs.writeFileSync(file, code);
console.log("Teaching override condition patched.");
