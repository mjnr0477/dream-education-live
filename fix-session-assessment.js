const fs = require("fs");

const file = "server.js";
const source = fs.readFileSync(file, "utf8");

const sessionStart = source.indexOf('app.post("/api/session"');
const listenStart = source.indexOf('app.listen(3000');

if (sessionStart === -1) {
  console.error("Could not find /api/session.");
  process.exit(1);
}

if (listenStart === -1 || listenStart <= sessionStart) {
  console.error("Could not find app.listen after /api/session.");
  process.exit(1);
}

const session = source.slice(sessionStart, listenStart);

const assessmentStart = session.indexOf(
  'const answer = learner_answer.trim().toLowerCase();'
);

const masteryStart = session.indexOf(
  'const { data: assessments, error: masteryError } ='
);

if (assessmentStart === -1) {
  console.error("Could not find assessment section.");
  process.exit(1);
}

if (masteryStart === -1 || masteryStart <= assessmentStart) {
  console.error("Could not find mastery section.");
  process.exit(1);
}

const newAssessment = String.raw`const answer = learner_answer.trim().toLowerCase();

let score = 0;
let understanding = "no_understanding";

let feedback =
  "Let's start with the basic idea and build your understanding step by step.";

let strengths =
  "The learner attempted the question.";

let gaps =
  "The learner has not yet demonstrated enough understanding.";

let misconceptions =
  "No clear misconception detected.";

/*
  PHOTOSYNTHESIS UNDERSTANDING
*/

if (topic && topic.toLowerCase().includes("photosynthesis")) {

  const questionText = question.toLowerCase();

  const mentionsLight =
    answer.includes("light") ||
    answer.includes("sunlight") ||
    answer.includes("sun");

  const mentionsCarbon =
    answer.includes("carbon dioxide") ||
    answer.includes("co2");

  const mentionsWater =
    answer.includes("water");

  const mentionsFood =
    answer.includes("food") ||
    answer.includes("glucose") ||
    answer.includes("sugar");

  const saysPlantsBreathe =
    answer.includes("plants breathe") ||
    answer.includes("plants take in oxygen") ||
    answer.includes("plants use oxygen");

  const asksBesidesSunlight =
    questionText.includes("besides sunlight") ||
    questionText.includes("other things") ||
    questionText.includes("other thing");

  const asksWhatGas =
    questionText.includes("what gas") &&
    questionText.includes("photosynthesis");

  const asksSunlightRole =
    questionText.includes("what do you think a plant uses sunlight for") ||
    questionText.includes("what does sunlight do");

  if (saysPlantsBreathe && !mentionsCarbon) {

    score = 20;
    understanding = "misconception";

    feedback =
      "You are thinking about gases involved in plant processes, which is a useful starting point. However, photosynthesis uses carbon dioxide as an input.";

    strengths =
      "The learner recognized that gases are involved in plant processes.";

    gaps =
      "The role of carbon dioxide in photosynthesis needs clarification.";

    misconceptions =
      "The learner appears to confuse oxygen intake with carbon dioxide intake during photosynthesis.";

  } else if (asksBesidesSunlight && mentionsCarbon && mentionsWater) {

    score = 100;
    understanding = "strong";

    feedback =
      "Excellent. You correctly identified carbon dioxide and water as the important inputs besides sunlight.";

    strengths =
      "The learner correctly identified carbon dioxide and water as requirements for photosynthesis.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksWhatGas && mentionsCarbon) {

    score = 100;
    understanding = "strong";

    feedback =
      "Correct. The gas the plant takes in for photosynthesis is carbon dioxide.";

    strengths =
      "The learner correctly identified carbon dioxide as an input to photosynthesis.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksSunlightRole && mentionsFood) {

    score = 90;
    understanding = "strong";

    feedback =
      "Excellent. You understand that the plant uses sunlight to help make food through photosynthesis.";

    strengths =
      "The learner connected sunlight with food production.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksSunlightRole && mentionsLight) {

    score = 65;
    understanding = "partial";

    feedback =
      "Good start. You recognized that sunlight is important. Now let's explain what role its energy plays in making food.";

    strengths =
      "The learner recognized the importance of sunlight.";

    gaps =
      "The role of light energy in photosynthesis needs further explanation.";

  } else if (mentionsLight && mentionsCarbon && mentionsWater && mentionsFood) {

    score = 100;
    understanding = "strong";

    feedback =
      "Excellent. Your answer identifies the main inputs and the food produced through photosynthesis.";

    strengths =
      "The learner identified light, carbon dioxide, water, and food production.";

    gaps =
      "No major knowledge gap detected.";

  } else if (mentionsLight && mentionsCarbon && mentionsWater) {

    score = 90;
    understanding = "strong";

    feedback =
      "Very good. You identified the three major requirements for photosynthesis.";

    strengths =
      "The learner identified light, carbon dioxide, and water.";

    gaps =
      "The learner could further explain what the plant produces.";

  } else if (mentionsLight && (mentionsCarbon || mentionsWater)) {

    score = 65;
    understanding = "partial";

    feedback =
      "Good start. You identified some important requirements, but your explanation is incomplete.";

    strengths =
      "The learner identified some requirements for photosynthesis.";

    gaps =
      "One or more important requirements for photosynthesis are missing.";

  } else if (mentionsLight || mentionsFood) {

    score = 45;
    understanding = "basic";

    feedback =
      "You have identified part of the idea. Let's build the explanation further.";

    strengths =
      "The learner recognized an important part of photosynthesis.";

    gaps =
      "The learner needs to identify the other important inputs and explain their roles.";
  }

} else {

  /*
    GENERAL UNDERSTANDING
  */

  if (answer.length >= 50) {

    score = 70;
    understanding = "partial";

    feedback =
      "Good attempt. Your answer contains useful ideas, but let's examine the concept more carefully.";

    strengths =
      "The learner provided a developed response.";

    gaps =
      "Some important parts of the concept may still be missing.";

  } else if (answer.length >= 20) {

    score = 50;
    understanding = "basic";

    feedback =
      "You have a starting point. Let's develop your explanation further.";

    strengths =
      "The learner provided a meaningful attempt.";

    gaps =
      "The explanation needs more detail.";
  }
}

`;

const newSession =
  session.slice(0, assessmentStart) +
  newAssessment +
  session.slice(masteryStart);

const updated =
  source.slice(0, sessionStart) +
  newSession +
  source.slice(listenStart);

fs.writeFileSync(file, updated);

console.log("Session assessment updated safely.");
