const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `} else if (understanding === "partial") {`;

if (!source.includes(marker)) {
  console.error("Partial-understanding marker not found.");
  process.exit(1);
}

if (source.includes("MISCONCEPTION TARGETED QUESTION")) {
  console.error("Targeted misconception question already exists.");
  process.exit(1);
}

const patch = `} else if (understanding === "misconception") {

  /*
    MISCONCEPTION TARGETED QUESTION

    The learner must correct the mistaken idea before
    the engine moves them back into normal progression.
  */

  if (
    misconceptions.includes("oxygen with carbon dioxide")
  ) {

    explanation =
      "Let's correct one important idea first. During photosynthesis, " +
      "plants take in carbon dioxide and use it together with water " +
      "and light to make food. Oxygen is released as a product.";

    nextQuestion =
      "Which gas does a plant take in during photosynthesis: oxygen or carbon dioxide? Explain why.";

  } else if (
    misconceptions.includes("food directly from the soil")
  ) {

    explanation =
      "Let's correct this idea first. Plants absorb water and minerals " +
      "from the soil, but they make their own food through photosynthesis.";

    nextQuestion =
      "If a plant gets water and minerals from the soil, where does the food made by the plant come from?";

  } else if (
    misconceptions.includes("sunlight") &&
    misconceptions.includes("food")
  ) {

    explanation =
      "Let's correct this idea first. Sunlight is not the food produced " +
      "by the plant. Light provides energy that helps the plant make food.";

    nextQuestion =
      "Is sunlight itself the food a plant produces, or does sunlight provide energy for making food? Explain.";

  } else {

    explanation =
      "Let's correct the mistaken idea first. " +
      misconceptions +
      " We will check this concept again before moving forward.";

    nextQuestion =
      "Think about the explanation above. What is the correct idea, in your own words?";
  }

${marker}`;

source = source.replace(marker, patch);

fs.writeFileSync(file, source);

console.log("Targeted misconception question inserted.");
