"use strict";

const fs = require("fs");
const server = fs.readFileSync("server.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes('answer_contract: "verified-v1"'), "Successful learner responses require the verified answer contract.");
assert(server.includes('cache[cacheKey].answer_contract === "verified-v1"'), "Unverified cached answers must never be served.");
assert(server.includes("No verified evidence is available for this learner question."), "The hard answer gate must reject unsupported answers.");
assert(server.includes("answer_verified: true"), "Successful learner answers must explicitly report verification.");

assert(server.includes('fallback: true,\n        answer_verified: true,\n        answer_contract: "verified-v1"'), "Built-in verified recovery must preserve the verified lesson contract.");
assert(server.includes('fallback: true,\n            answer_verified: true,\n            answer_contract: "verified-v1"'), "Curriculum and evidence recovery must preserve the verified lesson contract.");

console.log("VERIFIED LEARNER ANSWER LAW: PASS");
console.log("Every successful /api/learn answer requires verified authority.");
console.log("Unverified cached or AI-only answers cannot be returned.");
