const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `const mastered =
  masteryStatus === "mastered";

let explanation;`;

const replacement = `const mastered =
  masteryStatus === "mastered";

/*
  STATE-AWARE EVIDENCE TEACHING

  The teaching engine now receives both the current
  evidence and the learner's accumulated state.
*/
const teachingAnalysis = generateEvidenceTeaching(
  evidenceAnalysis,
  {
    subject,
    topic,
    level,
    masteryStatus,
    averageScore,
    strongAttempts,
    trajectory,
    previousScore
  }
);

console.log("STATE-AWARE TEACHING ANALYSIS:", teachingAnalysis);

let explanation;`;

if (!s.includes(marker)) {
  console.error("Mastery insertion marker not found.");
  process.exit(1);
}

s = s.replace(marker, replacement);

fs.writeFileSync(file, s);

console.log("State-aware teaching engine inserted.");
