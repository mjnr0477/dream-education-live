const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const startMarker = `/*
  PHOTOSYNTHESIS APPLICATION ASSESSMENT

  The application engine evaluates concept evidence rather than
  depending on one exact scenario or wording.

  Core relationship:

  limiting factor
        ↓
  photosynthesis changes
        ↓
  food production changes
*/`;

const endMarker = `/*
  PHOTOSYNTHESIS UNDERSTANDING
*/`;

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);

if (start === -1) {
  console.error("Application assessment block not found.");
  process.exit(1);
}

if (end === -1 || end <= start) {
  console.error("Photosynthesis understanding marker not found.");
  process.exit(1);
}

const replacement = `/*
  APPLICATION ASSESSMENT

  Concept Evidence Engine is authoritative for application
  reasoning. It evaluates the learner's conceptual evidence
  rather than relying on scenario-specific rules.
*/

if (
  questionType === "application" &&
  evidenceAnalysis &&
  evidenceAnalysis.reasoningQuality !== "insufficient"
) {
  score = evidenceAnalysis.score;
  understanding = evidenceAnalysis.reasoningQuality;

  feedback = evidenceAnalysis.feedback;
  strengths = evidenceAnalysis.strengths;
  gaps = evidenceAnalysis.gaps;
  misconceptions = evidenceAnalysis.misconceptions;
}

`;

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(file, s);

console.log("Old application assessment removed.");
console.log("Concept Evidence Engine is now authoritative for application assessment.");
