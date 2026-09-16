const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `    console.log("CONCEPT EVIDENCE ANALYSIS:", evidenceAnalysis);`;

if (!s.includes(marker)) {
  console.error("Evidence analysis marker not found.");
  process.exit(1);
}

if (s.includes("const teachingAnalysis = generateEvidenceTeaching(")) {
  console.log("Teaching logic already exists.");
  process.exit(0);
}

const insertion = `${marker}

    // =========================
    // EVIDENCE-DRIVEN TEACHING
    // =========================

    const teachingAnalysis = generateEvidenceTeaching(
      evidenceAnalysis,
      {
        subject,
        topic,
        level
      }
    );

    console.log("EVIDENCE TEACHING ANALYSIS:", teachingAnalysis);`;

s = s.replace(marker, insertion);

fs.writeFileSync(file, s);

console.log("Evidence-driven teaching logic added.");
