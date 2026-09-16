const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const startMarker = `let explanation;
    let nextQuestion;

    const currentTopic = topic || "this concept";`;

const endMarker = `    /*
      FINAL SESSION DEBUG
    */`;

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);

if (start === -1) {
  console.error("Teaching layer start marker not found.");
  process.exit(1);
}

if (end === -1) {
  console.error("Teaching layer end marker not found.");
  process.exit(1);
}

const replacement = `let explanation;
    let nextQuestion;

    /*
      AUTHORITATIVE STATE-AWARE TEACHING

      The evidence teaching engine is now the single source
      of truth for the teaching move and next question.

      Priority:
      misconception
      -> missing factor
      -> missing process
      -> missing outcome
      -> mastery challenge
      -> strong progression
      -> partial reasoning
      -> basic reasoning
      -> foundation
    */

    if (
      teachingAnalysis &&
      teachingAnalysis.nextQuestion
    ) {
      nextQuestion = teachingAnalysis.nextQuestion;

      explanation =
        teachingAnalysis.explanation ||
        "Let's continue building your understanding step by step.";

      console.log("AUTHORITATIVE TEACHING DECISION:", {
        teachingMove: teachingAnalysis.teachingMove,
        target: teachingAnalysis.target,
        explanation,
        nextQuestion
      });

    } else {
      /*
        Safety fallback.

        This should only be reached if the teaching engine
        cannot produce a next question.
      */

      const currentTopic = topic || "this concept";

      explanation =
        \`Let's continue learning about \${currentTopic} step by step.\`;

      nextQuestion =
        \`What is the main idea you understand about \${currentTopic}?\`;

      console.log("TEACHING FALLBACK USED:", {
        topic: currentTopic,
        nextQuestion
      });
    }

`;

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(file, s);

console.log("Authoritative teaching layer installed.");
