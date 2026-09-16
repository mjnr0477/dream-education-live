const fs = require("fs");

const file = "server.js";
let source = fs.readFileSync(file, "utf8");

const oldBlock = `const explainsReducedPhotosynthesis =
      answer.includes("reduce photosynthesis") ||
      answer.includes("reduces photosynthesis") ||
      answer.includes("less photosynthesis") ||
      answer.includes("slow photosynthesis") ||
      answer.includes("slows photosynthesis") ||
      answer.includes("photosynthesis will reduce") ||
      answer.includes("photosynthesis decreases");`;

const newBlock = `const explainsReducedPhotosynthesis =
      answer.includes("reduce photosynthesis") ||
      answer.includes("reduces photosynthesis") ||
      answer.includes("reduce the rate of photosynthesis") ||
      answer.includes("reduces the rate of photosynthesis") ||
      answer.includes("lower rate of photosynthesis") ||
      answer.includes("lower the rate of photosynthesis") ||
      answer.includes("less photosynthesis") ||
      answer.includes("slow photosynthesis") ||
      answer.includes("slows photosynthesis") ||
      answer.includes("photosynthesis will reduce") ||
      answer.includes("photosynthesis decreases");`;

if (!source.includes(oldBlock)) {
  console.error("Shade scoring block not found.");
  process.exit(1);
}

source = source.replace(oldBlock, newBlock);

fs.writeFileSync(file, source);

console.log("Shade application scoring improved.");
