const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = `const saysPlantsBreathe =
    answer.includes("plants breathe") ||
    answer.includes("plants take in oxygen") ||
    answer.includes("plants use oxygen");`;

const replacement = `const saysPlantsBreathe =
    answer.includes("plants breathe") ||
    answer.includes("plants take in oxygen") ||
    answer.includes("plants use oxygen");

  const treatsOxygenAsPhotosynthesisInput =
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("take in more oxygen") ||
      answer.includes("takes in more oxygen") ||
      answer.includes("use oxygen") ||
      answer.includes("uses oxygen") ||
      answer.includes("oxygen as an input") ||
      answer.includes("oxygen is taken in")
    ) &&
    answer.includes("photosynthesis");`;

if (!code.includes(marker)) {
  console.error("MARKER NOT FOUND");
  process.exit(1);
}

code = code.replace(marker, replacement);

const misconceptionMarker = `  /* 
    5. PHOTOSYNTHESIS AND RESPIRATION`;

if (!code.includes(misconceptionMarker)) {
  console.error("MISCONCEPTION INSERTION POINT NOT FOUND");
  process.exit(1);
}

const insertion = `  /*
    OXYGEN TREATED AS AN INPUT TO PHOTOSYNTHESIS

    The learner may mention carbon dioxide correctly but still
    incorrectly claim that oxygen is taken in for photosynthesis.
  */

  if (treatsOxygenAsPhotosynthesisInput) {
    misconceptions =
      "The learner appears to treat oxygen as an input to photosynthesis. During photosynthesis, plants take in carbon dioxide and release oxygen.";
  }

`;

code = code.replace(misconceptionMarker, insertion + misconceptionMarker);

fs.writeFileSync(file, code);
console.log("Oxygen-input misconception detector added.");
