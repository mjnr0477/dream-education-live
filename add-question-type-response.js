const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldText = `        misconceptions
      },

      teaching: {`;

const newText = `        misconceptions
      },

      question_type: questionType,

      teaching: {`;

if (!source.includes(oldText)) {
  console.error("Target response section not found.");
  process.exit(1);
}

if (source.includes("question_type: questionType")) {
  console.error("question_type already exists.");
  process.exit(1);
}

source = source.replace(oldText, newText);

fs.writeFileSync(file, source);

console.log("question_type added to session response.");
