const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const oldImport =
  'const { analyzeConceptEvidence } = require("./concept_evidence_engine");';

const newImports =
  'const { analyzeConceptEvidence } = require("./concept_evidence_engine");\n' +
  'const { generateEvidenceTeaching } = require("./evidence_teaching_engine");';

if (!s.includes(oldImport)) {
  console.error("Evidence engine import not found.");
  process.exit(1);
}

if (s.includes('require("./evidence_teaching_engine")')) {
  console.log("Teaching engine import already exists.");
  process.exit(0);
}

s = s.replace(oldImport, newImports);

fs.writeFileSync(file, s);

console.log("Teaching engine import added.");
