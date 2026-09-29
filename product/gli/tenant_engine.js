"use strict";
const crypto=require("crypto");
function createTenant({name,type="school",metadata={}}){const clean=String(name||"").trim();if(!clean)throw new Error("Tenant name is required");const now=new Date().toISOString();return {tenant_id:"tenant_"+crypto.randomUUID(),type,name:clean,status:"active",metadata,created_at:now,updated_at:now};}
module.exports={createTenant};
