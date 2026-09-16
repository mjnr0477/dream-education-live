const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `/*
  LEARNING TRAJECTORY

  Look at the learner's previous assessment for this topic
  and compare it with the current assessment.
*/`;

if (!source.includes(marker)) {
  console.error("Could not find trajectory marker.");
  process.exit(1);
}

const saveBlock = `
/*
  SAVE CURRENT ASSESSMENT

  The assessment must be stored before trajectory and mastery
  are calculated so those systems can see the current attempt.
*/

const { error: currentAssessmentError } = await supabase
  .from("learning_assessments")
  .insert({
    learner_id,
    question,
    learner_answer,
    subject: subject || null,
    topic: topic || null,
    level: level || null,
    score,
    understanding,
    feedback,
    strengths,
    gaps,
    misconceptions
  });

if (currentAssessmentError) {
  console.error("Current assessment save error:", currentAssessmentError);
  throw currentAssessmentError;
}

`;

if (source.includes("SAVE CURRENT ASSESSMENT")) {
  console.error("Assessment save block already exists.");
  process.exit(1);
}

source = source.replace(
  marker,
  saveBlock + marker
);

fs.writeFileSync(file, source);

console.log("Current assessment save inserted successfully.");
