const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `  }

} else {

  /*
    GENERAL UNDERSTANDING
  */`;

const replacement = `  }

} else if (questionType !== "application") {

  /*
    GENERAL UNDERSTANDING
  */`;

if (!source.includes(marker)) {
  console.error("General assessment boundary not found.");
  process.exit(1);
}

source = source.replace(marker, replacement);

fs.writeFileSync(file, source);

console.log("General assessment now excludes application questions.");
