const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const startMarker = `/* =========================
   DASHBOARD CONTINUE
========================= */`;

const start = html.indexOf(startMarker);

if (start === -1) {
  throw new Error("Dashboard continue function not found.");
}

const functionStart = html.indexOf(
  "function continueFromDashboard()",
  start
);

if (functionStart === -1) {
  throw new Error("continueFromDashboard function not found.");
}

const functionEnd = html.indexOf(
  "\n}",
  functionStart
);

if (functionEnd === -1) {
  throw new Error("Could not find dashboard function end.");
}

const oldFunction =
  html.slice(functionStart, functionEnd + 2);

const newFunction = `function continueFromDashboard() {

  const progress =
    document.getElementById("progress");

  const learningCard =
    document.getElementById("learningCard");

  const assessmentCard =
    document.getElementById("assessmentCard");

  if (progress) {
    progress.classList.add("hidden");
  }

  if (assessmentCard) {
    assessmentCard.classList.add("hidden");
  }

  /*
    If the current learning cycle already has
    a next lesson prepared, use the existing
    learning engine.
  */

  if (nextLearning && currentLearning) {

    continueLearning();

    return;

  }

  /*
    No prepared lesson exists yet.
    Return the learner to the learning setup
    instead of creating a fake lesson.
  */

  const learnerSetup =
    document.getElementById("learnerSetup");

  if (learnerSetup) {
    learnerSetup.scrollIntoView({
      behavior: "smooth"
    });
  } else {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

}`;

html = html.replace(
  oldFunction,
  newFunction
);

fs.writeFileSync(file, html);

console.log("Dashboard continue action connected.");
