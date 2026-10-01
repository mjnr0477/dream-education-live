"use strict";
const assert=require("assert");
const {buildProductionSecurityPosture}=require("../product/gli/security_posture_intelligence");
const r=buildProductionSecurityPosture({
 environment:{name:"production"},
 configuration:{authentication:true,rate_limiting:true,request_ids:true,body_limits:true,service_role_database:true}
});
assert.strictEqual(r.status,"ready");
assert.strictEqual(r.score,1);
assert.strictEqual(r.checks.length,6);
console.log("security-posture-smoke-test: PASS");
