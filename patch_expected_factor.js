const fs = require("fs");

const file = "concept_evidence_engine.js";
let code = fs.readFileSync(file, "utf8");

const oldBlock = `  if (
    q.includes("carbon dioxide") ||
    q.includes("co2")
  ) {
    result.factorCorrect =
      result.factor === "carbon dioxide";
  } else if (
    q.includes("water")
  ) {
    result.factorCorrect =
      result.factor === "water";
  } else if (
    q.includes("sunlight") ||
    q.includes("light")
  ) {
    result.factorCorrect =
      result.factor === "light";
  }`;

const newBlock = `  const limitingWaterSignals = [
    "not getting enough water",
    "not get enough water",
    "not enough water",
    "very little water",
    "little water",
    "lack of water",
    "limited water",
    "water is limited",
    "water shortage",
    "without enough water",
    "without water"
  ];

  const limitingCarbonSignals = [
    "very little carbon dioxide",
    "little carbon dioxide",
    "not enough carbon dioxide",
    "not getting enough carbon dioxide",
    "limited carbon dioxide",
    "carbon dioxide is limited",
    "low carbon dioxide",
    "low co2",
    "lack of carbon dioxide",
    "lack of co2"
  ];

  const limitingLightSignals = [
    "not enough sunlight",
    "not getting enough sunlight",
    "very little sunlight",
    "little sunlight",
    "lack of sunlight",
    "limited sunlight",
    "not enough light",
    "not getting enough light",
    "very little light",
    "little light",
    "lack of light",
    "limited light"
  ];

  if (
    limitingWaterSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "water";

  } else if (
    limitingCarbonSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "carbon dioxide";

  } else if (
    limitingLightSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "light";

  } else if (
    q.includes("carbon dioxide") ||
    q.includes("co2")
  ) {
    result.factorCorrect =
      result.factor === "carbon dioxide";

  } else if (
    q.includes("water")
  ) {
    result.factorCorrect =
      result.factor === "water";

  } else if (
    q.includes("sunlight") ||
    q.includes("light")
  ) {
    result.factorCorrect =
      result.factor === "light";
  }`;

if (!code.includes(oldBlock)) {
  console.error("EXPECTED FACTOR BLOCK NOT FOUND");
  process.exit(1);
}

code = code.replace(oldBlock, newBlock);

fs.writeFileSync(file, code);
console.log("Expected-factor logic patched successfully.");
