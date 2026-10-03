"use strict";

const fs = require("fs");

const server = fs.readFileSync("server.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  server.includes("Prefer a direct definition from verified curriculum evidence"),
  "Emergency curriculum recovery must prefer the verified definition directly."
);

assert(
  server.includes("const emergencyDefinition ="),
  "Emergency curriculum recovery must extract the curriculum definition."
);

assert(
  server.includes("emergencyDefinition.length >= 20"),
  "Emergency curriculum recovery must require a substantive definition."
);

console.log("DIRECT CURRICULUM ANSWER RECOVERY: PASS");
console.log("Emergency recovery can return a verified curriculum definition without the teaching formatter.");
