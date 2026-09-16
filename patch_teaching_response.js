const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const oldBlock = `      teaching: {
        explanation
      },`;

const newBlock = `      teaching: {
        move: teachingAnalysis ? teachingAnalysis.teachingMove : null,
        target: teachingAnalysis ? teachingAnalysis.target : null,
        explanation
      },`;

if (!s.includes(oldBlock)) {
  console.error("Target teaching response block not found.");
  process.exit(1);
}

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(file, s);

console.log("Teaching response patched successfully.");
