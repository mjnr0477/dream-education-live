"use strict";

const assert = require("assert");
const fs = require("fs");
const server = fs.readFileSync("server.js", "utf8");

assert(server.includes('require("./product/gli/ai_evaluation_evidence")'));
assert(server.includes("recordAIEvaluationEvidence({"));
assert(server.includes('evaluation_basis: "proxy_signals"'));
assert(server.includes("teachingGeneratedByAI"));

console.log("Live AI evaluation provenance smoke test passed.");
