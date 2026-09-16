const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `/*
  SAVE CURRENT ASSESSMENT

  The assessment must be stored before trajectory and mastery
  are calculated so those systems can see the current attempt.
*/`;

if (!source.includes(marker)) {
  console.error("Save marker not found.");
  process.exit(1);
}

if (source.includes("TARGETED MISCONCEPTION REMEDIATION")) {
  console.error("Targeted remediation already exists.");
  process.exit(1);
}

const patch = `
/*
  TARGETED MISCONCEPTION REMEDIATION

  A detected misconception is treated differently from
  ordinary lack of understanding.

  The engine identifies the mistaken idea, changes the
  learner state to "misconception", and prepares the
  system to teach the specific gap.
*/

if (
  misconceptions !== "No clear misconception detected."
) {
  understanding = "misconception";

  if (
    misconceptions.includes("oxygen with carbon dioxide")
  ) {
    feedback =
      "You have identified a gas involved in plant processes, but there is an important distinction to correct: during photosynthesis, plants take in carbon dioxide, while oxygen is released.";

    strengths =
      "The learner recognized that gases are involved in photosynthesis.";

    gaps =
      "The learner needs to distinguish carbon dioxide as an input from oxygen as a product of photosynthesis.";
  }
}

`;

source = source.replace(marker, patch + marker);

fs.writeFileSync(file, source);

console.log("Targeted misconception remediation inserted.");
