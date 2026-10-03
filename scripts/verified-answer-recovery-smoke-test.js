"use strict";

const assert = require("assert");
const { buildVerifiedEvidenceAnswer } = require("../product/verified_answer_recovery");

const retrieval = {
  success: true,
  source: {
    name: "Wikipedia",
    title: "Photosynthesis"
  },
  knowledge: {
    source: "Wikipedia",
    title: "Photosynthesis",
    definition:
      "Photosynthesis is a biological process in which organisms convert light energy into chemical energy.",
    key_ideas: [
      "Plants use light energy to produce organic compounds.",
      "The process can release oxygen."
    ]
  }
};

const answer = buildVerifiedEvidenceAnswer(
  "What is photosynthesis?",
  retrieval
);

assert.ok(answer, "verified recovery should produce an answer");
assert.match(answer, /Photosynthesis is a biological process/i);
assert.match(answer, /Key ideas:/i);
assert.match(answer, /Wikipedia/i);

assert.strictEqual(
  buildVerifiedEvidenceAnswer("What is photosynthesis?", {
    success: false,
    knowledge: retrieval.knowledge
  }),
  null,
  "unverified retrieval must never produce a recovery answer"
);

assert.strictEqual(
  buildVerifiedEvidenceAnswer("What is photosynthesis?", {
    success: true,
    knowledge: { definition: "too short" }
  }),
  null,
  "insufficient evidence must not produce a recovery answer"
);

console.log("Verified answer recovery smoke test passed.");
