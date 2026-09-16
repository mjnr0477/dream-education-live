const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const target = 'console.log("CONCEPT EVIDENCE ANALYSIS:", evidenceAnalysis);';

const replacement = `console.log("CONCEPT EVIDENCE ANALYSIS:", evidenceAnalysis);

console.log("LIVE EVIDENCE CHECK:", {
  score: evidenceAnalysis && evidenceAnalysis.score,
  reasoningQuality: evidenceAnalysis && evidenceAnalysis.reasoningQuality,
  factorCorrect: evidenceAnalysis && evidenceAnalysis.factorCorrect,
  processCorrect: evidenceAnalysis && evidenceAnalysis.processCorrect,
  outcomePresent: evidenceAnalysis && evidenceAnalysis.outcomePresent
});`;

if (!code.includes(target)) {
  throw new Error("Target debug line not found.");
}

if (code.includes("LIVE EVIDENCE CHECK:")) {
  console.log("Diagnostic already installed.");
  process.exit(0);
}

code = code.replace(target, replacement);

fs.writeFileSync(file, code);
console.log("Diagnostic installed.");
