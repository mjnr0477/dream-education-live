"use strict";
const assert=require("assert");
const {buildValueCommandCenter}=require("../product/gli/value_command_center");
const r=buildValueCommandCenter({
 activities:[
  {learner_id:"l1",role:"learner",created_at:"2026-09-01T10:00:00Z"},
  {account_id:"t1",role:"teacher",created_at:"2026-09-30T10:00:00Z"},
  {account_id:"t1",role:"teacher",created_at:"2026-09-29T10:00:00Z"}
 ],
 outcomes:[{baseline:50,current:70,improvement:20}],
 payments:[{account_id:"t1",amount:500,status:"successful",owner_exempt:false,billing_period_days:30}]
},new Date("2026-10-01T00:00:00Z"));
assert.ok(r.learning.value_evidence);
assert.ok(r.learning.outcome_retention);
assert.ok(r.institutional);
assert.strictEqual(r.commercial.commercial_signal.paying_customers,1);
assert.strictEqual(r.executive_signal.learning_evidence,"early_evidence");
console.log("value-command-center-smoke-test: PASS");
