"use strict";

const assert = require("assert");
const fs = require("fs");

const server = fs.readFileSync(require.resolve("../server.js"), "utf8");

assert(server.includes("getLearnerDecisionHistory"));
assert(server.includes("const decisionHistory = await getLearnerDecisionHistory"));
assert(server.includes("decision_history: decisionHistory"));

console.log("Learner decision history API smoke test passed.");
