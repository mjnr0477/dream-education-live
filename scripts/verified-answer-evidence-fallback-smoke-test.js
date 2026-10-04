"use strict";

const assert = require("assert");
const { buildVerifiedEvidenceAnswer } = require("../product/verified_answer_recovery.js");

const result = buildVerifiedEvidenceAnswer("What is photosynthesis?", {
  success: true,
  source: { name: "Wikipedia" },
  knowledge: { definition: "", key_ideas: [] },
  evidence: [
    {
      extract:
        "Photosynthesis is the process by which green plants use light energy to convert carbon dioxide and water into chemical energy, releasing oxygen."
    }
  ]
});

assert.ok(result, "verified evidence should produce an answer when structured definition is absent");
assert.ok(result.includes("Photosynthesis is the process"), "answer should contain the verified evidence extract");

console.log("Verified answer recovery evidence fallback: PASS");
