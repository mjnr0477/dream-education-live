const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldText = `if (topic && topic.toLowerCase().includes("photosynthesis")) {`;

const newText = `if (
  questionType !== "application" &&
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {`;

if (!source.includes(oldText)) {
  console.error("Original Photosynthesis assessment condition not found.");
  process.exit(1);
}

source = source.replace(oldText, newText);

fs.writeFileSync(file, source);

console.log("Assessment branches separated successfully.");
