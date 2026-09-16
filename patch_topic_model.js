const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const start = code.indexOf("    const topicPerformance = {};");
const endMarker = "    // Overall performance";
const end = code.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.error("ERROR: Could not locate topic performance block.");
  process.exit(1);
}

const newBlock = `    const topicPerformance = {};

    Object.entries(topicStats).forEach(([topic, stats]) => {
      const scores = stats.scores;

      const averageScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length
            )
          : null;

      /*
        Topic learning state

        assessmentResults is ordered newest first,
        so the first matching assessment is the
        learner's most recent evidence for this topic.
      */

      const latestAssessment = assessmentResults.find(
        item => (item.topic || "General") === topic
      );

      const latestScore =
        latestAssessment
          ? Number(latestAssessment.score) || 0
          : null;

      const latestUnderstanding =
        latestAssessment
          ? latestAssessment.understanding || null
          : null;

      let status = "not_started";

      if (latestUnderstanding === "misconception") {
        status = "needs_correction";

      } else if (
        latestUnderstanding === "no_understanding"
      ) {
        status = "needs_practice";

      } else if (
        latestUnderstanding === "basic" ||
        latestUnderstanding === "partial"
      ) {
        status = "developing";

      } else if (
        latestUnderstanding === "strong" &&
        stats.assessments >= 3 &&
        averageScore >= 80
      ) {
        status = "mastered";

      } else if (
        latestUnderstanding === "strong"
      ) {
        status = "strong";
      }

      topicPerformance[topic] = {
        assessments: stats.assessments,
        average_score: averageScore,
        latest_score: latestScore,
        latest_understanding: latestUnderstanding,
        status
      };
    });

`;

code =
  code.slice(0, start) +
  newBlock +
  code.slice(end);

fs.writeFileSync(file, code);

console.log("Topic performance model patched successfully.");
