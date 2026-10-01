"use strict";
const assert=require("assert");
const {buildInstitutionalAdoptionIntelligence}=require("../product/gli/institutional_adoption_intelligence");
const result=buildInstitutionalAdoptionIntelligence({
 activities:[
  {account_id:"t1",role:"teacher",created_at:"2026-09-29T10:00:00Z"},
  {account_id:"t1",role:"teacher",created_at:"2026-09-30T10:00:00Z"},
  {account_id:"l1",role:"learner",created_at:"2026-09-30T10:00:00Z"}
 ],
 payments:[{account_id:"t1",amount:500,status:"successful",owner_exempt:false}]
},new Date("2026-10-01T00:00:00Z"));
assert.strictEqual(result.role_engagement.teacher.active_accounts_30d,1);
assert.strictEqual(result.institutional_adoption.returning_institutional_accounts_30d,1);
assert.strictEqual(result.institutional_adoption.paid_institutional_accounts,1);
assert.strictEqual(result.institutional_adoption.repeat_engagement_rate,1);
console.log("institutional-adoption-smoke-test: PASS");
