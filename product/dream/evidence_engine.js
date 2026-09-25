const crypto = require('crypto');
const id = () => crypto.randomUUID();
const TYPES = new Set(['assessment','exercise','project','teacher_observation','self_report','milestone','external_evidence','learning_activity','reflection','presentation','video','image','document']);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
function addEvidence(identity,input={}){
  const evidence={id:id(),type:TYPES.has(input.type)?input.type:'external_evidence',title:String(input.title||'Untitled evidence'),description:String(input.description||''),source:input.source||'user',source_url:input.source_url||null,license:input.license||null,capability_ids:Array.isArray(input.capability_ids)?input.capability_ids:[],goal_ids:Array.isArray(input.goal_ids)?input.goal_ids:[],confidence:clamp(input.confidence==null?.7:input.confidence),verified:!!input.verified,created_at:input.created_at||new Date().toISOString(),metadata:input.metadata||{}};
  identity.evidence=identity.evidence||[]; identity.evidence.push(evidence); return evidence;
}
function evidenceScore(e){const typeWeight={assessment:.9,teacher_observation:.9,external_evidence:.85,project:.85,presentation:.8,video:.75,document:.75,exercise:.7,learning_activity:.65,milestone:.65,reflection:.45,self_report:.3,image:.55}; return clamp((typeWeight[e.type]||.5)*clamp(e.confidence));}
function findEvidence(identity,query={}){return (identity.evidence||[]).filter(e=>(!query.type||e.type===query.type)&&(!query.capability_id||e.capability_ids.includes(query.capability_id))&&(!query.goal_id||e.goal_ids.includes(query.goal_id)));}
module.exports={addEvidence,evidenceScore,findEvidence,TYPES};
