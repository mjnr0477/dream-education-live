const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `/*
  SAVE CURRENT ASSESSMENT

  The assessment must be stored before trajectory and mastery
  are calculated so those systems can see the current attempt.
*/`;

if (!source.includes(marker)) {
  console.error("Insertion marker not found.");
  process.exit(1);
}

if (source.includes("MISCONCEPTION ENGINE")) {
  console.error("Misconception engine already exists.");
  process.exit(1);
}

const block = `
/*
  MISCONCEPTION ENGINE

  The assessment engine first determines whether the learner
  is correct, partially correct, or incorrect.

  This layer then looks for specific conceptual mistakes.
  It does not replace the existing scoring system.
*/

if (
  topic &&
  topic.toLowerCase().includes("photosynthesis")
) {

  /*
    1. OXYGEN VS CARBON DIOXIDE

    The learner may confuse the gas used in photosynthesis
    with the gas released by photosynthesis.
  */

  if (
    (
      answer.includes("oxygen") &&
      (
        answer.includes("take in") ||
        answer.includes("takes in") ||
        answer.includes("uses") ||
        answer.includes("use")
      )
    ) &&
    !answer.includes("carbon dioxide") &&
    !answer.includes("co2")
  ) {

    misconceptions =
      "The learner appears to confuse oxygen with carbon dioxide as the gas taken in during photosynthesis.";

  /*
    2. PLANTS GET FOOD FROM SOIL

    The learner may think soil directly provides the food
    made by the plant.
  */

  } else if (
    (
      answer.includes("soil") ||
      answer.includes("ground") ||
      answer.includes("earth")
    ) &&
    (
      answer.includes("food") ||
      answer.includes("gets food") ||
      answer.includes("get food") ||
      answer.includes("food from")
    )
  ) {

    misconceptions =
      "The learner appears to believe that plants obtain their food directly from the soil instead of making food through photosynthesis.";

  /*
    3. SUNLIGHT IS FOOD

    The learner may treat sunlight itself as the food
    produced by photosynthesis.
  */

  } else if (
    (
      answer.includes("sunlight is food") ||
      answer.includes("sunlight is the food") ||
      answer.includes("light is food") ||
      answer.includes("light is the food") ||
      answer.includes("food is sunlight")
    )
  ) {

    misconceptions =
      "The learner appears to confuse sunlight, which provides energy for photosynthesis, with the food produced by the plant.";

  /*
    4. WATER IS FOOD

    Water is an input to photosynthesis, but it is not
    the food produced by the process.
  */

  } else if (
    (
      answer.includes("water is food") ||
      answer.includes("water is the food") ||
      answer.includes("food is water") ||
      answer.includes("plant makes water as food")
    )
  ) {

    misconceptions =
      "The learner appears to confuse water, an input to photosynthesis, with the food produced by the plant.";

  /*
    5. PHOTOSYNTHESIS AND RESPIRATION

    The learner may describe photosynthesis as the process
    in which plants take in oxygen and release carbon dioxide.
  */

  } else if (
    (
      answer.includes("take in oxygen") ||
      answer.includes("takes in oxygen") ||
      answer.includes("use oxygen") ||
      answer.includes("uses oxygen")
    ) &&
    (
      answer.includes("release carbon dioxide") ||
      answer.includes("releases carbon dioxide") ||
      answer.includes("give out carbon dioxide") ||
      answer.includes("gives out carbon dioxide")
    )
  ) {

    misconceptions =
      "The learner appears to confuse photosynthesis with respiration by reversing the main gas exchange associated with photosynthesis.";

  /*
    6. SUNLIGHT CAUSES WATER ABSORPTION

    The learner may confuse the role of light in
    photosynthesis with the uptake of water by roots.
  */

  } else if (
    (
      answer.includes("sunlight") ||
      answer.includes("light")
    ) &&
    (
      answer.includes("drink water") ||
      answer.includes("drinks water") ||
      answer.includes("absorb water") ||
      answer.includes("absorbs water") ||
      answer.includes("take in water") ||
      answer.includes("takes in water")
    ) &&
    !answer.includes("photosynthesis")
  ) {

    misconceptions =
      "The learner appears to confuse the role of light in photosynthesis with the process by which roots absorb water.";

  /*
    7. CARBON DIOXIDE AS A WASTE PRODUCT

    The learner may identify carbon dioxide as waste
    rather than as an input used during photosynthesis.
  */

  } else if (
    (
      answer.includes("carbon dioxide") ||
      answer.includes("co2")
    ) &&
    (
      answer.includes("waste") ||
      answer.includes("waste product") ||
      answer.includes("harmful") ||
      answer.includes("poison")
    )
  ) {

    misconceptions =
      "The learner appears to think that carbon dioxide is a waste product or harmful substance during photosynthesis, rather than an important input.";

  /*
    8. PHOTOSYNTHESIS WITHOUT LIGHT

    The learner may claim that photosynthesis can continue
    normally without light.
  */

  } else if (
    (
      answer.includes("no light") ||
      answer.includes("without light") ||
      answer.includes("without sunlight") ||
      answer.includes("darkness") ||
      answer.includes("dark")
    ) &&
    (
      answer.includes("photosynthesis continues") ||
      answer.includes("photosynthesis will continue") ||
      answer.includes("photosynthesis can continue") ||
      answer.includes("photosynthesis continues normally") ||
      answer.includes("still photosynthesis")
    )
  ) {

    misconceptions =
      "The learner appears to believe that photosynthesis can continue normally without light.";

  /*
    9. SUNLIGHT DIRECTLY BECOMES FOOD

    The learner may understand that light is important but
    incorrectly describe light itself as being converted
    directly into food.
  */

  } else if (
    (
      answer.includes("sunlight becomes food") ||
      answer.includes("sunlight turns into food") ||
      answer.includes("light becomes food") ||
      answer.includes("light turns into food")
    )
  ) {

    misconceptions =
      "The learner appears to believe that sunlight itself is directly converted into food, rather than providing energy for the photosynthesis process.";

  /*
    10. NO PHOTOSYNTHESIS BECAUSE OF WATER

    The learner may incorrectly state that lack of water
    affects photosynthesis because plants use water as food.
  */

  } else if (
    answer.includes("water") &&
    (
      answer.includes("because water is food") ||
      answer.includes("water is food") ||
      answer.includes("water makes food")
    )
  ) {

    misconceptions =
      "The learner appears to confuse water as an input to photosynthesis with the food produced by the process.";
  }
}

`;

source = source.replace(marker, block + marker);

fs.writeFileSync(file, source);

console.log("Misconception engine inserted successfully.");
