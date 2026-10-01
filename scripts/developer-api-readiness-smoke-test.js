"use strict";
const assert=require("assert");
const {validateDeveloperApiContract}=require("../product/gli/developer_api_readiness");
let r=validateDeveloperApiContract({tenantId:"tenant_1",scopes:["learner:intelligence","credentials:read"],authenticationConfigured:true});
assert.strictEqual(r.ready,true);
r=validateDeveloperApiContract({tenantId:"tenant_1",scopes:["admin:everything"],authenticationConfigured:true});
assert.strictEqual(r.ready,false);
assert.deepStrictEqual(r.invalid_scopes,["admin:everything"]);
console.log("developer-api-readiness-smoke-test: PASS");
