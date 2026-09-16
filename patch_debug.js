const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const marker = `/*\n  SAVE CURRENT ASSESSMENT`;

const debug = `console.log("STATE AFTER MISCONCEPTION REMEDIATION:", {\n  understanding,\n  score,\n  feedback,\n  misconceptions\n});\n\n`;

if (!s.includes(marker)) {
  throw new Error("SAVE CURRENT ASSESSMENT marker not found");
}

if (s.includes("STATE AFTER MISCONCEPTION REMEDIATION")) {
  console.log("Debug already inserted.");
} else {
  s = s.replace(marker, debug + marker);
  fs.writeFileSync(file, s);
  console.log("Debug inserted.");
}
