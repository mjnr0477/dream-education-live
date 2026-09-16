const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `/*
  MISCONCEPTION ENGINE

  The assessment engine first determines whether the learner
  is correct, partially correct, or incorrect.

  This layer then looks for specific conceptual mistakes.
  It does not replace the existing scoring system.
*/`;

if (!source.includes(marker)) {
  console.error("Marker not found.");
  process.exit(1);
}

if (source.includes("MISCONCEPTION DEBUG")) {
  console.error("Debug already exists.");
  process.exit(1);
}

const debug = `
/*
  MISCONCEPTION DEBUG
*/
console.log("MISCONCEPTION DEBUG:", {
  topic,
  answer,
  hasOxygen: answer.includes("oxygen"),
  hasTakesIn: answer.includes("takes in"),
  hasCarbonDioxide: answer.includes("carbon dioxide"),
  hasCO2: answer.includes("co2")
});

`;

source = source.replace(marker, debug + marker);

fs.writeFileSync(file, source);

console.log("Debug logging inserted.");
