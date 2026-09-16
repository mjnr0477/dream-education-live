const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `    /*
      FINAL SESSION DEBUG
    */`;

if (!s.includes(marker)) {
  console.error("FINAL SESSION DEBUG marker not found.");
  process.exit(1);
}

if (s.includes("EVIDENCE-DRIVEN TEACHING OVERRIDE")) {
  console.log("Teaching override already exists.");
  process.exit(0);
}

const insertion = `    /*
      EVIDENCE-DRIVEN TEACHING OVERRIDE

      For application questions, the evidence teaching engine
      takes the identified learning gap and turns it into
      a targeted next question.

      Strong/mastered learners remain on the existing
      progression path.
    */

    if (
      questionType === "application" &&
      !mastered &&
      teachingAnalysis &&
      teachingAnalysis.nextQuestion &&
      (
        teachingAnalysis.teachingMove === "teach_factor" ||
        teachingAnalysis.teachingMove === "teach_process" ||
        teachingAnalysis.teachingMove === "teach_outcome" ||
        teachingAnalysis.teachingMove === "build_foundation"
      )
    ) {
      nextQuestion = teachingAnalysis.nextQuestion;

      if (teachingAnalysis.explanation) {
        explanation = teachingAnalysis.explanation;
      }

      console.log("EVIDENCE-DRIVEN TEACHING OVERRIDE:", {
        teachingMove: teachingAnalysis.teachingMove,
        target: teachingAnalysis.target,
        nextQuestion: teachingAnalysis.nextQuestion
      });
    }

`;

s = s.replace(marker, insertion + marker);

fs.writeFileSync(file, s);

console.log("Evidence-driven teaching override integrated.");
