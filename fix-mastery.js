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

const teachingStart = session.indexOf(
  'let explanation;'
);

if (masteryStart === -1 || teachingStart === -1 || teachingStart <= masteryStart) {
  console.error("Could not safely locate mastery section.");
  process.exit(1);
}

const newMastery = String.raw`const { data: assessments, error: masteryError } =
  await supabase
    .from("learning_assessments")
    .select("score, understanding, created_at")
    .eq("learner_id", learner_id)
    .eq("topic", topic)
    .order("created_at", { ascending: false });

if (masteryError) {
  throw masteryError;
}

const results = assessments || [];

const scores = results.map(
  item => Number(item.score) || 0
);

const averageScore =
  scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) /
      scores.length
    : 0;

/*
  TRAJECTORY-AWARE MASTERY

  Mastery is based primarily on current understanding
  and consistent evidence, rather than punishing the learner
  indefinitely for an early mistake.
*/

const strongAttempts = results.filter(
  item => item.understanding === "strong"
).length;

let masteryStatus;

if (results.length === 0) {

  masteryStatus = "not_started";

} else if (understanding === "misconception") {

  masteryStatus = "needs_correction";

} else if (understanding === "no_understanding") {

  masteryStatus = "needs_practice";

} else if (
  understanding === "basic" ||
  understanding === "partial"
) {

  masteryStatus = "developing";

} else if (
  understanding === "strong" &&
  strongAttempts >= 3
) {

  masteryStatus = "mastered";

} else {

  masteryStatus = "developing";
}

const mastered =
  masteryStatus === "mastered";

`;

const updatedSession =
  session.slice(0, masteryStart) +
  newMastery +
  session.slice(teachingStart);

const updated =
  source.slice(0, sessionStart) +
  updatedSession +
  source.slice(listenStart);

fs.writeFileSync(file, updated);

console.log("Trajectory-aware mastery added successfully.");
