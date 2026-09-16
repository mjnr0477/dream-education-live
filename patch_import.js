const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const importLine =
  'const { selectNextTopic } = require("./topic_selection_engine");';

if (code.includes(importLine)) {
  console.log("Import already exists.");
  process.exit(0);
}

const anchor =
  'const { generateEvidenceTeaching } = require("./evidence_teaching_engine");';

if (!code.includes(anchor)) {
  console.error("ERROR: Import anchor not found.");
  process.exit(1);
}

code = code.replace(
  anchor,
  `${anchor}\n${importLine}`
);

fs.writeFileSync(file, code);

console.log("Topic selection engine imported successfully.");
