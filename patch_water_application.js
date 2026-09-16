const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const oldBlock = `  "not making enough",
  "what would happen to",
  "what effect would",
  "how would this affect"
];`;

const newBlock = `  "not making enough",
  "what would happen to",
  "what effect would",
  "how would this affect",
  "not getting enough water",
  "not enough water",
  "lack of water",
  "limited water",
  "water shortage",
  "water is limited",
  "does not have enough water",
  "without enough water",
  "water stress"
];`;

if (!s.includes(oldBlock)) {
  throw new Error("Application scenario signal block not found");
}

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(file, s);

console.log("Water application signals patched.");
