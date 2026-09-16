const { analyzeConceptEvidence } = require("./concept_evidence_engine");

console.log("ENGINE LOADED:", typeof analyzeConceptEvidence);

const result = analyzeConceptEvidence(
  "There is very little carbon dioxide. Explain how this could affect photosynthesis and food production.",
  "Low carbon dioxide would reduce photosynthesis, so the plant would produce less food."
);

console.log("ENGINE RESULT:", result);
