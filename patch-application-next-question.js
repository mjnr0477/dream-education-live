const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldBlock = `      nextQuestion =
        \`How could you apply what you learned about \${currentTopic} to a new problem?\`;`;

const newBlock = `      if (currentTopic.toLowerCase().includes("photosynthesis")) {
        nextQuestion =
          "A farmer notices that a plant growing under a thick shade is not making enough food, even though it receives enough water. Explain how the lack of sunlight could affect photosynthesis and the plant's ability to make food.";
      } else {
        nextQuestion =
          \`How could you apply what you learned about \${currentTopic} to a new problem?\`;
      }`;

if (!source.includes(oldBlock)) {
  console.error("Target application question block not found.");
  process.exit(1);
}

source = source.replace(oldBlock, newBlock);

fs.writeFileSync(file, source);

console.log("Application next-question logic updated.");
