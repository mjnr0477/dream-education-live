const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const oldBlock = `    // =========================
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

    console.log("EVIDENCE TEACHING ANALYSIS:", teachingAnalysis);


`;

if (!s.includes(oldBlock)) {
  console.error("Early teaching-engine block not found.");
  process.exit(1);
}

s = s.replace(oldBlock, "");

fs.writeFileSync(file, s);

console.log("Early teaching-engine call removed.");
