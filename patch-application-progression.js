const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldBlock = `      if (currentTopic.toLowerCase().includes("photosynthesis")) {
        nextQuestion =
          "A farmer notices that a plant growing under a thick shade is not making enough food, even though it receives enough water. Explain how the lack of sunlight could affect photosynthesis and the plant's ability to make food.";
      } else {
        nextQuestion =
          \`How could you apply what you learned about \${currentTopic} to a new problem?\`;
      }`;

const newBlock = `      if (currentTopic.toLowerCase().includes("photosynthesis")) {

        const previousQuestionText = question.toLowerCase();

        if (
          previousQuestionText.includes("shade") ||
          previousQuestionText.includes("shaded") ||
          previousQuestionText.includes("sunlight") ||
          previousQuestionText.includes("light")
        ) {

          nextQuestion =
            "A farmer provides a plant with enough water and sunlight, but the plant is still not making enough food because there is very little carbon dioxide in the surrounding air. Explain how this could affect photosynthesis.";

        } else if (
          previousQuestionText.includes("carbon dioxide") ||
          previousQuestionText.includes("co2")
        ) {

          nextQuestion =
            "A plant receives enough sunlight and carbon dioxide, but it is not getting enough water. Explain how the lack of water could affect photosynthesis and food production.";

        } else if (
          previousQuestionText.includes("water")
        ) {

          nextQuestion =
            "A plant has enough sunlight, carbon dioxide, and water, but its leaves are damaged and cannot function properly. Explain how this could affect photosynthesis and food production.";

        } else {

          nextQuestion =
            "A farmer notices that a plant is not making enough food. The plant receives sunlight, water, and carbon dioxide, but one of these factors may be limiting. Explain how a shortage of any one of these factors could affect photosynthesis.";
        }

      } else {
        nextQuestion =
          \`How could you apply what you learned about \${currentTopic} to a new problem?\`;
      }`;

if (!source.includes(oldBlock)) {
  console.error("Application progression block not found.");
  process.exit(1);
}

source = source.replace(oldBlock, newBlock);

fs.writeFileSync(file, source);

console.log("Application question progression improved.");
