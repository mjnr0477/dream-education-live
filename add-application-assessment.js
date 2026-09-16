const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `/*
  PHOTOSYNTHESIS UNDERSTANDING
*/`;

if (!source.includes(marker)) {
  console.error("Photosynthesis assessment marker not found.");
  process.exit(1);
}

if (source.includes("PHOTOSYNTHESIS APPLICATION ASSESSMENT")) {
  console.error("Application assessment already exists.");
  process.exit(1);
}

const block = `/*
  PHOTOSYNTHESIS APPLICATION ASSESSMENT

  Application questions require the learner to use
  the concept in a new situation rather than simply
  recall a fact.
*/

if (
  questionType === "application" &&
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {

  const darkRoomScenario =
    questionText.includes("dark room") ||
    questionText.includes("darkroom") ||
    questionText.includes("kept in the dark") ||
    questionText.includes("without light") ||
    questionText.includes("no light");

  if (darkRoomScenario) {

    const explainsNoPhotosynthesis =
      answer.includes("stop photosynthesis") ||
      answer.includes("stops photosynthesis") ||
      answer.includes("reduce photosynthesis") ||
      answer.includes("reduces photosynthesis") ||
      answer.includes("less photosynthesis") ||
      answer.includes("cannot photosynthesize") ||
      answer.includes("can't photosynthesize");

    const connectsLightToFood =
      answer.includes("light") &&
      (
        answer.includes("food") ||
        answer.includes("glucose") ||
        answer.includes("sugar") ||
        answer.includes("energy")
      );

    if (explainsNoPhotosynthesis && connectsLightToFood) {

      score = 100;
      understanding = "strong";

      feedback =
        "Excellent application. You correctly predicted that keeping the plant in darkness would greatly reduce or stop photosynthesis because light provides the energy needed to make food.";

      strengths =
        "The learner successfully applied the role of light in photosynthesis to a new situation.";

      gaps =
        "No major knowledge gap detected.";

      misconceptions =
        "No clear misconception detected.";

    } else if (
      answer.includes("dark") ||
      answer.includes("light") ||
      answer.includes("food") ||
      answer.includes("grow")
    ) {

      score = 60;
      understanding = "partial";

      feedback =
        "Good attempt. You recognized that darkness affects the plant, but your explanation needs to connect the absence of light with photosynthesis and food production.";

      strengths =
        "The learner recognized that the absence of light affects the plant.";

      gaps =
        "The learner needs to explain how light affects photosynthesis and food production.";

      misconceptions =
        "No clear misconception detected.";

    } else {

      score = 30;
      understanding = "basic";

      feedback =
        "You have started thinking about the situation, but let's connect it to what you know about photosynthesis. Think about the role of light in making food.";

      strengths =
        "The learner attempted to apply the concept to a new situation.";

      gaps =
        "The learner needs to connect light availability with photosynthesis and food production.";

      misconceptions =
        "No clear misconception detected.";
    }
  }
}

`;

source = source.replace(
  marker,
  block + marker
);

fs.writeFileSync(file, source);

console.log("Photosynthesis application assessment added successfully.");
