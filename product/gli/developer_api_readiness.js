"use strict";

const ALLOWED_SCOPES=new Set(["learner:intelligence","learner:events","tenant:analytics","credentials:read"]);
function validateDeveloperApiContract({tenantId,scopes=[],authenticationConfigured=false}={}){
  const normalized=Array.isArray(scopes)?[...new Set(scopes.map(String).map(s=>s.trim()).filter(Boolean))]:[];
  const invalid=normalized.filter(s=>!ALLOWED_SCOPES.has(s));
  const checks={
    tenant:typeof tenantId==="string"&&tenantId.trim().length>0,
    authentication:Boolean(authenticationConfigured),
    scopes:normalized.length>0&&invalid.length===0
  };
  const passed=Object.values(checks).filter(Boolean).length;
  return {
    version:"1.0.0",
    contract:"dream-education-developer-api",
    tenant_id:tenantId||null,
    scopes:normalized,
    invalid_scopes:invalid,
    checks,
    ready:passed===Object.keys(checks).length
  };
}
module.exports={validateDeveloperApiContract,ALLOWED_SCOPES:[...ALLOWED_SCOPES]};
