const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `// =========================
    // CONCEPT EVIDENCE ENGINE
    // SHADOW MODE
    // =========================`;

if (!s.includes(marker)) {
  console.error("Shadow evidence block not found.");
  process.exit(1);
}

s = s.replace(
  marker,
  `// =========================
    // CONCEPT EVIDENCE ENGINE
    // AUTHORITATIVE APPLICATION ASSESSMENT
    // =========================`
);

const oldBlock = `if (
  questionType === "application" &&
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {`;

const newBlock = `if (
  questionType === "application" &&
  evidenceAnalysis &&
  evidenceAnalysis.reasoningQuality !== "insufficient"
) {`;

if (!s.includes(oldBlock)) {
  console.error("Photosynthesis application assessment block not found.");
  process.exit(1);
}

s = s.replace(oldBlock, newBlock);

const oldAssignment = `score = 100;
    understanding = "strong";`;

const newAssignment = `score = evidenceAnalysis.score;
    understanding = evidenceAnalysis.reasoningQuality;

    feedback = evidenceAnalysis.feedback;
    strengths = evidenceAnalysis.strengths;
    gaps = evidenceAnalysis.gaps;
    misconceptions = evidenceAnalysis.misconceptions;`;

if (!s.includes(oldAssignment)) {
  console.error("Expected application score assignment not found.");
  process.exit(1);
}

s = s.replace(oldAssignment, newAssignment);

fs.writeFileSync(file, s);

console.log("Evidence engine integrated as authoritative application assessment.");
