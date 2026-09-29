"use strict";
const crypto=require("crypto");
function issueCompetencyCredential({learnerId,competency,evidence={}}){if(!learnerId||!competency)throw new Error("learnerId and competency are required");const issuedAt=new Date().toISOString();const credentialId="cred_"+crypto.randomUUID();return {credential_id:credentialId,learner_id:String(learnerId),competency:String(competency),evidence,status:"issued",issued_at:issuedAt,verification:{protocol:"dream-education",version:"1.0.0",immutable_reference:crypto.createHash("sha256").update(JSON.stringify({credentialId,learnerId,competency,evidence,issuedAt})).digest("hex")}};}
module.exports={issueCompetencyCredential};
