const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const marker = `    /*
      7. RETURN COMPLETE LEARNING SESSION
    */`;

if (!source.includes(marker)) {
  console.error("Final response marker not found.");
  process.exit(1);
}

if (source.includes("FINAL SESSION DEBUG")) {
  console.error("Final debug already exists.");
  process.exit(1);
}

const patch = `    /*
      FINAL SESSION DEBUG
    */
    console.log("FINAL SESSION DEBUG:", {
      understanding,
      misconceptions,
      explanation,
      nextQuestion
    });

`;

source = source.replace(marker, patch + marker);

fs.writeFileSync(file, source);

console.log("Final session debug inserted.");
