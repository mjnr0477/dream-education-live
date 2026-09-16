const fs = require("fs");

const file = "server.js";
const source = fs.readFileSync(file, "utf8");

const startMarker = 'const answer = learner_answer.trim().toLowerCase();';
const endMarker = '/*\\n  MASTERY'; // temporary marker check

const start = source.indexOf(startMarker);

if (start === -1) {
  console.error("Assessment start marker not found.");
  process.exit(1);
}

/*
  Find the end of the assessment section.
  In our current /api/session route, the mastery query begins
  immediately after the assessment logic.
*/
const masteryMarker =
  'const { data: assessments, error: masteryError } =';

const end = source.indexOf(masteryMarker, start);

if (end === -1) {
  console.error("Mastery section marker not found.");
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

  /*
    Detect answers to follow-up questions.

    If the question asks what is needed besides sunlight,
    carbon dioxide + water is the expected missing knowledge.
  */

  const asksBesidesSunlight =
    question.toLowerCase().includes("besides sunlight") ||
    question.toLowerCase().includes("other things") ||
    question.toLowerCase().includes("other thing");

  const asksWhatGas =
    question.toLowerCase().includes("what gas") &&
    question.toLowerCase().includes("photosynthesis");

  const asksSunlightRole =
    question.toLowerCase().includes("what do you think a plant uses sunlight for") ||
    question.toLowerCase().includes("what does sunlight do");

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

    misconceptions =
      "No clear misconception detected.";

  } else if (asksWhatGas && mentionsCarbon) {

    score = 100;
    understanding = "strong";

    feedback =
      "Correct. The gas the plant takes in for photosynthesis is carbon dioxide.";

    strengths =
      "The learner correctly identified carbon dioxide as an input to photosynthesis.";

    gaps =
      "No major knowledge gap detected for this question.";

  } else if (asksSunlightRole && (mentionsFood || mentionsLight)) {

    score = 75;
    understanding = "partial";

    feedback =
      "Good start. Sunlight provides the energy needed for photosynthesis to make food.";

    strengths =
      "The learner connected sunlight with food production in plants.";

    gaps =
      "The learner could explain more clearly that light provides energy for the process.";

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

const updated = source.slice(0, start) + newAssessment + source.slice(end);

fs.writeFileSync(file, updated);

console.log("Assessment engine updated successfully.");
