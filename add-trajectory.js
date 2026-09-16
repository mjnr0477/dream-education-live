const fs = require("fs");

const file = "server.js";
const source = fs.readFileSync(file, "utf8");

const sessionStart = source.indexOf('app.post("/api/session"');
const listenStart = source.indexOf('app.listen(3000');

if (sessionStart === -1 || listenStart === -1 || listenStart <= sessionStart) {
  console.error("Could not safely locate /api/session.");
  process.exit(1);
}

const session = source.slice(sessionStart, listenStart);

const masteryStart = session.indexOf(
  'const { data: assessments, error: masteryError } ='
);

if (masteryStart === -1) {
  console.error("Could not locate mastery section.");
  process.exit(1);
}

const trajectoryCode = String.raw`/*
  LEARNING TRAJECTORY

  Look at the learner's previous assessment for this topic
  and compare it with the current assessment.
*/

const { data: previousAssessments, error: trajectoryError } =
  await supabase
    .from("learning_assessments")
    .select("score, understanding, created_at")
    .eq("learner_id", learner_id)
    .eq("topic", topic)
    .order("created_at", { ascending: false })
    .limit(2);

if (trajectoryError) {
  throw trajectoryError;
}

const previousResults = previousAssessments || [];

/*
  The newest record is the assessment we just saved.
  Therefore the second record represents the previous attempt.
*/

let trajectory = "first_attempt";
let previousScore = null;
let previousUnderstanding = null;
let improvement = 0;

if (previousResults.length >= 2) {

  previousScore = Number(previousResults[1].score) || 0;
  previousUnderstanding = previousResults[1].understanding || null;

  improvement = score - previousScore;

  if (improvement >= 10) {
    trajectory = "improving";
  } else if (improvement <= -10) {
    trajectory = "declining";
  } else {
    trajectory = "stable";
  }
}

`;

const updatedSession =
  session.slice(0, masteryStart) +
  trajectoryCode +
  session.slice(masteryStart);

const updated =
  source.slice(0, sessionStart) +
  updatedSession +
  source.slice(listenStart);

fs.writeFileSync(file, updated);

console.log("Learning trajectory added successfully.");
