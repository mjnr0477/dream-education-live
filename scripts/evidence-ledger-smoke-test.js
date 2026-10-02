"use strict";

const assert = require("assert");
const {
  stable,
  hashPayload,
  normalizeEvidence
} = require("../product/gli/evidence_ledger");

const input = {
  learner_id: "ci",
  evidence_type: "assessment",
  concept_key: "fractions",
  evidence: {
    learner_answer: "private answer",
    email: "hidden@example.com",
    score: 82,
    nested: { b: 2, a: 1 }
  },
  confidence: 1.2
};

const normalized = normalizeEvidence(input);
assert.strictEqual(normalized.confidence, 1);
assert(normalized.evidence.learner_answer_hash);
assert.strictEqual(normalized.evidence.email, undefined);
assert.strictEqual(normalized.evidence.nested.a, 1);
assert.strictEqual(normalized.evidence.nested.b, 2);
assert.strictEqual(normalized.evidence.learner_answer_length, 13);
assert.strictEqual(hashPayload({b:2,a:1}), hashPayload({a:1,b:2}));

const first = stable({z: 1, a: 2});
assert.deepStrictEqual(Object.keys(first), ["a", "z"]);

console.log("evidence-ledger-smoke-test: PASS");
