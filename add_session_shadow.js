const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const routeMarker = 'app.post("/api/session", async (req, res) => {';

const routeStart = code.indexOf(routeMarker);

if (routeStart === -1) {
  throw new Error("Could not find /api/session route.");
}

const answerMarker =
  'const answer = learner_answer.trim().toLowerCase();';

const answerPosition = code.indexOf(answerMarker, routeStart);

if (answerPosition === -1) {
  throw new Error("Could not find answer declaration inside /api/session.");
}

const insertion = `

    // =========================
    // CONCEPT EVIDENCE ENGINE
    // SHADOW MODE
    // =========================

    const evidenceAnalysis = analyzeConceptEvidence(
      question,
      learner_answer,
      {
        subject,
        topic,
        level
      }
    );

    console.log("CONCEPT EVIDENCE ANALYSIS:", evidenceAnalysis);
`;

if (
  code.includes("CONCEPT EVIDENCE ENGINE") &&
  code.indexOf("CONCEPT EVIDENCE ENGINE") > routeStart
) {
  console.log("Session shadow analysis already exists. No changes made.");
} else {
  code =
    code.slice(0, answerPosition + answerMarker.length) +
    insertion +
    code.slice(answerPosition + answerMarker.length);

  fs.writeFileSync(file, code);
  console.log("Session shadow analysis added.");
}
