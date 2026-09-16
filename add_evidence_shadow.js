const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = 'const answer = learner_answer.trim().toLowerCase();';

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

if (!code.includes(marker)) {
  throw new Error("Session answer marker not found.");
}

if (code.includes("CONCEPT EVIDENCE ENGINE")) {
  console.log("Shadow analysis already exists. No changes made.");
} else {
  code = code.replace(
    marker,
    marker + insertion
  );

  fs.writeFileSync(file, code);
  console.log("Evidence shadow analysis added.");
}
