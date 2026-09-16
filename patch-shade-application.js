const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `  if (darkRoomScenario) {`;

const insertion = `  const shadeScenario =
    questionText.includes("shade") ||
    questionText.includes("shaded") ||
    questionText.includes("thick shade") ||
    questionText.includes("little sunlight") ||
    questionText.includes("less sunlight") ||
    questionText.includes("low sunlight");

  if (darkRoomScenario) {`;

if (!source.includes(marker)) {
  console.error("Application scenario marker not found.");
  process.exit(1);
}

source = source.replace(marker, insertion);

const ending = `    }
  }
}

/*
  PHOTOSYNTHESIS UNDERSTANDING
*/`;

const replacement = `    }
  } else if (shadeScenario) {

    const explainsReducedPhotosynthesis =
      answer.includes("reduce photosynthesis") ||
      answer.includes("reduces photosynthesis") ||
      answer.includes("less photosynthesis") ||
      answer.includes("slow photosynthesis") ||
      answer.includes("slows photosynthesis") ||
      answer.includes("photosynthesis will reduce") ||
      answer.includes("photosynthesis decreases");

    const connectsLightToFood =
      answer.includes("light") &&
      (
        answer.includes("food") ||
        answer.includes("glucose") ||
        answer.includes("sugar") ||
        answer.includes("energy")
      );

    const recognizesShadeEffect =
      answer.includes("shade") ||
      answer.includes("less sunlight") ||
      answer.includes("little sunlight") ||
      answer.includes("less light") ||
      answer.includes("not enough light");

    if (explainsReducedPhotosynthesis && connectsLightToFood) {

      score = 100;
      understanding = "strong";

      feedback =
        "Excellent application. You correctly connected reduced sunlight with a lower rate of photosynthesis and explained that this limits the plant's ability to make food.";

      strengths =
        "The learner successfully transferred the role of light in photosynthesis to a farming situation.";

      gaps =
        "No major knowledge gap detected.";

      misconceptions =
        "No clear misconception detected.";

    } else if (
      recognizesShadeEffect &&
      (
        answer.includes("photosynthesis") ||
        answer.includes("food") ||
        answer.includes("grow") ||
        answer.includes("growth")
      )
    ) {

      score = 70;
      understanding = "partial";

      feedback =
        "Good application. You recognized that shade or reduced sunlight affects the plant, but your explanation needs a clearer connection between light, photosynthesis, and food production.";

      strengths =
        "The learner recognized that reduced sunlight affects plant growth or food production.";

      gaps =
        "The learner needs to explain more clearly how reduced light affects the rate of photosynthesis.";

      misconceptions =
        "No clear misconception detected.";

    } else {

      score = 40;
      understanding = "basic";

      feedback =
        "You identified part of the situation, but let's connect it to photosynthesis. Think about what happens when a plant receives less sunlight.";

      strengths =
        "The learner attempted to apply knowledge to a real-life farming situation.";

      gaps =
        "The learner needs to connect sunlight availability with photosynthesis and food production.";

      misconceptions =
        "No clear misconception detected.";
    }
  }
}

/*
  PHOTOSYNTHESIS UNDERSTANDING
*/`;

if (!source.includes(ending)) {
  console.error("Exact application assessment ending not found.");
  process.exit(1);
}

source = source.replace(ending, replacement);

fs.writeFileSync(file, source);

console.log("Shade application assessment added.");
