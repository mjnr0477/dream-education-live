const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = `    misconceptions =
      "The learner appears to confuse water as an input to photosynthesis with the food produced by the process.";
  }
}
`;

const replacement = `    misconceptions =
      "The learner appears to confuse water as an input to photosynthesis with the food produced by the process.";
  }
}

/*
  MISCONCEPTION ASSESSMENT OVERRIDE

  A detected conceptual misconception should affect the
  actual assessment, not only the misconception description.
*/

if (
  misconceptions !== "No clear misconception detected."
) {
  understanding = "misconception";
  score = 20;

  feedback =
    "There is an important idea to correct before we move on. " +
    misconceptions;

  strengths =
    "The learner attempted to explain the situation and identified part of the relevant concept.";

  gaps =
    misconceptions;
}
`;

if (!code.includes(marker)) {
  console.error("EXACT ENDING NOT FOUND");
  process.exit(1);
}

code = code.replace(marker, replacement);

fs.writeFileSync(file, code);
console.log("Misconception assessment override added successfully.");
