"use strict";
const assert=require("assert");
const {buildLearningPassport}=require("../product/gli/learning_passport_engine");
const p=buildLearningPassport({
 learner:{learner_id:"l1"},
 assessments:[
  {topic:"Algebra",score:85,created_at:"2026-09-30T10:00:00Z"},
  {topic:"Algebra",score:70,created_at:"2026-09-20T10:00:00Z"}
 ],
 outcomes:[{baseline:50,current:80}],
 credentials:[{credential_id:"c1"}]
});
assert.strictEqual(p.learner_id,"l1");
assert.strictEqual(p.competencies[0].status,"strong");
assert.strictEqual(p.evidence.measured_outcomes,1);
assert.strictEqual(p.credentials.length,1);
assert.strictEqual(p.verification.fingerprint.length,64);
console.log("learning-passport-smoke-test: PASS");
