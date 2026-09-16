const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const startMarker = `/*
  PHOTOSYNTHESIS APPLICATION ASSESSMENT
`;

const endMarker = `/*
  PHOTOSYNTHESIS UNDERSTANDING
`;

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);

if (start === -1) {
  throw new Error("Application assessment start marker not found");
}

if (end === -1) {
  throw new Error("Photosynthesis understanding marker not found");
}

if (end <= start) {
  throw new Error("Application assessment boundaries are invalid");
}

const newBlock = `/*
  PHOTOSYNTHESIS APPLICATION ASSESSMENT

  The application engine evaluates concept evidence rather than
  depending on one exact scenario or wording.

  Core relationship:

  limiting factor
        ↓
  photosynthesis changes
        ↓
  food production changes
*/

if (
  questionType === "application" &&
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {

  const waterScenario =
    questionText.includes("not getting enough water") ||
    questionText.includes("not enough water") ||
    questionText.includes("lack of water") ||
    questionText.includes("limited water") ||
    questionText.includes("water shortage") ||
    questionText.includes("water is limited") ||
    questionText.includes("does not have enough water") ||
    questionText.includes("without enough water") ||
    questionText.includes("water stress");

  const carbonScenario =
    questionText.includes("very little carbon dioxide") ||
    questionText.includes("little carbon dioxide") ||
    questionText.includes("low carbon dioxide") ||
    questionText.includes("not enough carbon dioxide") ||
    questionText.includes("lack of carbon dioxide") ||
    questionText.includes("limited carbon dioxide") ||
    questionText.includes("carbon dioxide is limited") ||
    questionText.includes("less carbon dioxide");

  const lightScenario =
    questionText.includes("dark room") ||
    questionText.includes("darkroom") ||
    questionText.includes("kept in the dark") ||
    questionText.includes("without light") ||
    questionText.includes("no light") ||
    questionText.includes("thick shade") ||
    questionText.includes("shade") ||
    questionText.includes("shaded") ||
    questionText.includes("little sunlight") ||
    questionText.includes("less sunlight") ||
    questionText.includes("low sunlight") ||
    questionText.includes("not enough sunlight") ||
    questionText.includes("less light");

  const factor =
    waterScenario ? "water" :
    carbonScenario ? "carbon dioxide" :
    lightScenario ? "light" :
    null;

  const mentionsWater =
    answer.includes("water");

  const mentionsCarbon =
    answer.includes("carbon dioxide") ||
    answer.includes("co2");

  const mentionsLight =
    answer.includes("light") ||
    answer.includes("sunlight") ||
    answer.includes("sun");

  const mentionsReducedPhotosynthesis =
    answer.includes("reduce photosynthesis") ||
    answer.includes("reduces photosynthesis") ||
    answer.includes("reduced photosynthesis") ||
    answer.includes("less photosynthesis") ||
    answer.includes("lower photosynthesis") ||
    answer.includes("lower the rate of photosynthesis") ||
    answer.includes("lower rate of photosynthesis") ||
    answer.includes("reduce the rate of photosynthesis") ||
    answer.includes("reduces the rate of photosynthesis") ||
    answer.includes("photosynthesis decreases") ||
    answer.includes("photosynthesis decrease") ||
    answer.includes("photosynthesis is reduced") ||
    answer.includes("photosynthesis would be reduced") ||
    answer.includes("photosynthesis would decrease") ||
    answer.includes("photosynthesis slows") ||
    answer.includes("slows photosynthesis");

  const mentionsStoppedPhotosynthesis =
    answer.includes("stop photosynthesis") ||
    answer.includes("stops photosynthesis") ||
    answer.includes("stopped photosynthesis") ||
    answer.includes("photosynthesis stops") ||
    answer.includes("cannot photosynthesize") ||
    answer.includes("can't photosynthesize");

  const mentionsFood =
    answer.includes("food") ||
    answer.includes("glucose") ||
    answer.includes("sugar") ||
    answer.includes("food production") ||
    answer.includes("make less food") ||
    answer.includes("produces less food");

  const mentionsGrowth =
    answer.includes("growth") ||
    answer.includes("grow") ||
    answer.includes("growth is affected") ||
    answer.includes("affect its growth");

  const identifiesFactor =
    (factor === "water" && mentionsWater) ||
    (factor === "carbon dioxide" && mentionsCarbon) ||
    (factor === "light" && mentionsLight);

  const identifiesPhotosynthesisEffect =
    mentionsReducedPhotosynthesis ||
    mentionsStoppedPhotosynthesis;

  const identifiesOutcome =
    mentionsFood ||
    mentionsGrowth;

  if (
    identifiesFactor &&
    identifiesPhotosynthesisEffect &&
    identifiesOutcome
  ) {

    score = 100;
    understanding = "strong";

    if (factor === "water") {
      feedback =
        "Excellent application. You correctly connected limited water with reduced photosynthesis and explained that this can reduce food production.";
      strengths =
        "The learner connected water availability, photosynthesis, and food production in a new situation.";
    } else if (factor === "carbon dioxide") {
      feedback =
        "Excellent application. You correctly explained that low carbon dioxide can reduce the rate of photosynthesis and therefore reduce food production.";
      strengths =
        "The learner connected carbon dioxide availability, photosynthesis, and food production in a new situation.";
    } else {
      feedback =
        "Excellent application. You correctly connected limited light with reduced photosynthesis and explained how this affects food production.";
      strengths =
        "The learner connected light availability, photosynthesis, and food production in a new situation.";
    }

    gaps =
      "No major knowledge gap detected.";

    misconceptions =
      "No clear misconception detected.";

  } else if (
    identifiesFactor &&
    (identifiesPhotosynthesisEffect || identifiesOutcome)
  ) {

    score = 70;
    understanding = "partial";

    feedback =
      "Good application. You identified the important factor and part of its effect, but your explanation needs a clearer connection between the factor, photosynthesis, and food production.";

    strengths =
      "The learner recognized an important photosynthesis factor in a new situation.";

    gaps =
      "The learner needs to clearly explain the causal relationship between the limiting factor, photosynthesis, and food production.";

    misconceptions =
      "No clear misconception detected.";

  } else if (identifiesFactor) {

    score = 45;
    understanding = "basic";

    feedback =
      "You identified an important factor, but now explain how it changes photosynthesis and affects the food the plant can produce.";

    strengths =
      "The learner recognized the relevant photosynthesis factor.";

    gaps =
      "The learner needs to explain the effect of the factor on photosynthesis and food production.";

    misconceptions =
      "No clear misconception detected.";

  } else {

    score = 30;
    understanding = "basic";

    feedback =
      "You have started thinking about the situation. Now identify the photosynthesis factor involved and explain how changing it affects photosynthesis and food production.";

    strengths =
      "The learner attempted to apply knowledge to a new situation.";

    gaps =
      "The learner needs to identify the relevant photosynthesis factor and explain its effect.";

    misconceptions =
      "No clear misconception detected.";
  }
}

`;

s = s.slice(0, start) + newBlock + s.slice(end);

fs.writeFileSync(file, s);

console.log("Photosynthesis application engine refactored.");
