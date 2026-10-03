"use strict";

const assert = require("assert");
const fs = require("fs");
const server = fs.readFileSync("server.js", "utf8");

assert(server.includes('/api/v1/learner/:learner_id/evidence-timeline'));
assert(server.includes('listLearnerEvidence(req.params.learner_id'));
assert(server.includes('getLearnerDecisionHistory(req.params.learner_id'));
assert(server.includes('kind: "evidence"'));
assert(server.includes('kind: "decision"'));
assert(server.includes('You are not authorized to access this learner timeline.'));

console.log("Learner evidence timeline API smoke test passed.");
