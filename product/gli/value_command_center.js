"use strict";

const {buildValueEvidence}=require("./value_evidence_engine");
const {buildOutcomeRetentionIntelligence}=require("./outcome_retention_intelligence");
const {buildInstitutionalAdoptionIntelligence}=require("./institutional_adoption_intelligence");
const {buildCommercialIntelligence}=require("./commercial_intelligence");

function buildValueCommandCenter(data={},now=new Date()){
  const value=buildValueEvidence(data,now);
  const retention=buildOutcomeRetentionIntelligence(data,now);
  const institutional=buildInstitutionalAdoptionIntelligence(data,now);
  const commercial=buildCommercialIntelligence(data,now);
  return {
    version:"1.0.0",
    generated_at:now.toISOString(),
    learning:{value_evidence:value,outcome_retention:retention},
    institutional:institutional,
    commercial:commercial,
    executive_signal:{
      learning_evidence:value.value_proof_status,
      retention_evidence:retention.evidence_status,
      institutional_evidence:institutional.evidence_status,
      commercial_evidence:commercial.evidence_status
    },
    principle:"Signals are evidence-backed and may be insufficient; the command center never invents traction."
  };
}
module.exports={buildValueCommandCenter};
