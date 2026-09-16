const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = `  /*
    2. PLANTS GET FOOD FROM SOIL`;

const insertion = `  /*
    1B. OXYGEN TREATED AS AN INPUT

    The learner may mention carbon dioxide correctly but still
    incorrectly claim that oxygen is taken in for photosynthesis.
  */

  } else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("take in more oxygen") ||
      answer.includes("takes in more oxygen") ||
      answer.includes("oxygen as an input") ||
      answer.includes("oxygen is taken in")
    ) &&
    !(
      answer.includes("not take in oxygen") ||
      answer.includes("does not take in oxygen") ||
      answer.includes("doesn't take in oxygen") ||
      answer.includes("oxygen is released") ||
      answer.includes("release oxygen") ||
      answer.includes("releases oxygen")
    )
  ) {

    misconceptions =
      "The learner appears to treat oxygen as an input to photosynthesis. During photosynthesis, carbon dioxide is taken in and oxygen is released.";

`;

if (!code.includes(marker)) {
  console.error("INSERTION POINT NOT FOUND");
  process.exit(1);
}

code = code.replace(marker, insertion + marker);

fs.writeFileSync(file, code);
console.log("Oxygen-input misconception rule added.");
