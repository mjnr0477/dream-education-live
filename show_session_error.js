const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const oldText = `    console.error("Learning session error:", error);`;

const newText = `    console.error("Learning session error:", error);
    console.error("ERROR MESSAGE:", error && error.message);
    console.error("ERROR STACK:", error && error.stack);`;

if (!code.includes(oldText)) {
  console.error("Target log line not found.");
  process.exit(1);
}

code = code.replace(oldText, newText);

fs.writeFileSync(file, code);
console.log("Detailed session error logging added.");
