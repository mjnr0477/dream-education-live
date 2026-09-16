const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `  } else if (shadeScenario) {`;

const newBlock = `  } else if (waterScenario) {
    const mentionsWater =
      answer.includes("water") ||
      answer.includes("lack of water") ||
      answer.includes("not enough water");

    const mentionsReducedPhotosynthesis =
      answer.includes("reduce photosynthesis") ||
      answer.includes("reduces photosynthesis") ||
      answer.includes("reduced photosynthesis") ||
      answer.includes("less photosynthesis") ||
      answer.includes("photosynthesis would reduce") ||
      answer.includes("photosynthesis would be reduced");

    const mentionsFood =
      answer.includes("food") ||
      answer.includes("glucose") ||
      answer.includes("sugar");

    if (
      mentionsWater &&
      mentionsReducedPhotosynthesis &&
      mentionsFood
    ) {
      score = 100;
      understanding = "strong";
      feedback =
        "Excellent. You correctly explained that water is needed for photosynthesis, so a lack of water can reduce photosynthesis and lead to less food production.";
      strengths =
        "The learner connected water availability with photosynthesis and food production.";
      gaps =
        "No major knowledge gap detected for this application.";
    } else if (
      mentionsWater &&
      (mentionsReducedPhotosynthesis || mentionsFood)
    ) {
      score = 65;
      understanding = "partial";
      feedback =
        "Good start. You recognized the effect of water availability, but strengthen the connection between water, photosynthesis, and food production.";
      strengths =
        "The learner recognized an important relationship involving water.";
      gaps =
        "The learner needs to clearly connect water shortage with reduced photosynthesis and reduced food production.";
    } else if (mentionsWater) {
      score = 45;
      understanding = "basic";
      feedback =
        "You recognized that water is involved. Now explain how a lack of water affects photosynthesis and the food the plant produces.";
      strengths =
        "The learner recognized that water is relevant to photosynthesis.";
      gaps =
        "The effect of insufficient water on photosynthesis and food production needs further explanation.";
    }

${marker}`;

if (!s.includes(marker)) {
  throw new Error("Shade application assessor marker not found");
}

if (s.includes("const waterScenario =")) {
  console.log("Water application assessor already patched.");
} else {
  s = s.replace(marker, newBlock);
  fs.writeFileSync(file, s);
  console.log("Water application assessor patched.");
}
