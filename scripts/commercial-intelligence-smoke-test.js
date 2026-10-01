"use strict";
const assert=require("assert");
const {buildCommercialIntelligence}=require("../product/gli/commercial_intelligence");
const r=buildCommercialIntelligence({payments:[
 {account_id:"a",amount:500,plan_id:"monthly",billing_period_days:30,status:"successful"},
 {account_id:"b",amount:100,plan_id:"weekly",billing_period_days:7,status:"successful"},
 {account_id:"owner",amount:999,owner_exempt:true,status:"successful"}
]},new Date("2026-10-01T00:00:00Z"));
assert.strictEqual(r.commercial_signal.paying_customers,2);
assert.strictEqual(r.commercial_signal.total_revenue,600);
assert.strictEqual(r.billing_evidence.recurring_transactions,2);
assert.strictEqual(r.plan_mix.length,2);
console.log("commercial-intelligence-smoke-test: PASS");
