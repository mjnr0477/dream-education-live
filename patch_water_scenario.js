const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `  const shadeScenario =`;

const newBlock = `  const waterScenario =
    questionText.includes("not getting enough water") ||
    questionText.includes("not enough water") ||
    questionText.includes("lack of water") ||
    questionText.includes("limited water") ||
    questionText.includes("water shortage") ||
    questionText.includes("water is limited") ||
    questionText.includes("does not have enough water") ||
    questionText.includes("without enough water") ||
    questionText.includes("water stress");

${marker}`;

if (!s.includes(marker)) {
  throw new Error("shadeScenario declaration not found");
}

if (s.includes("const waterScenario =")) {
  console.log("waterScenario already exists.");
} else {
  s = s.replace(marker, newBlock);
  fs.writeFileSync(file, s);
  console.log("waterScenario declaration added.");
}
