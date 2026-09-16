const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `      mastery: {
        status: masteryStatus,
        assessments: results.length,
        average_score: Math.round(averageScore),
        mastered
      },

      next_question: {`;

if (!source.includes(marker)) {
  console.error("Exact response marker not found.");
  process.exit(1);
}

const replacement = `      mastery: {
        status: masteryStatus,
        assessments: results.length,
        average_score: Math.round(averageScore),
        mastered
      },

      trajectory: {
        status: trajectory,
        previous_score: previousScore,
        previous_understanding: previousUnderstanding,
        improvement
      },

      next_question: {`;

source = source.replace(marker, replacement);

fs.writeFileSync(file, source);

console.log("Trajectory response exposed successfully.");
