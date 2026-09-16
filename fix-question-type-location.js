const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const misplaced = `      question_type: questionType,\n`;

const firstIndex = source.indexOf(misplaced);

if (firstIndex === -1) {
  console.error("Misplaced question_type line not found.");
  process.exit(1);
}

source =
  source.slice(0, firstIndex) +
  source.slice(firstIndex + misplaced.length);

const sessionMarker = `        misconceptions
      },

      teaching: {`;

const sessionReplacement = `        misconceptions
      },

      question_type: questionType,

      teaching: {`;

if (!source.includes(sessionMarker)) {
  console.error("Session response assessment block not found.");
  process.exit(1);
}

source = source.replace(sessionMarker, sessionReplacement);

fs.writeFileSync(file, source);

console.log("question_type moved to /api/session successfully.");
