const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const importLine =
  'const { analyzeConceptEvidence } = require("./concept_evidence_engine");';

if (!code.includes(importLine)) {
  const marker = 'require("dotenv").config();';

  if (!code.includes(marker)) {
    throw new Error("Could not find dotenv initialization.");
  }

  code = code.replace(marker, marker + "\n" + importLine);
}

fs.writeFileSync(file, code);
console.log("Evidence engine import added.");
