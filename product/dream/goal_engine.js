const crypto=require('crypto');const id=()=>crypto.randomUUID();
function createGoal(identity,input={}){identity.goals=identity.goals||[];const g={id:id(),title:String(input.title||'Untitled goal'),description:String(input.description||''),status:'active',progress:0,desired_capabilities:Array.isArray(input.desired_capabilities)?input.desired_capabilities:[],deadline:input.deadline||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};identity.goals.push(g);return g;}
function findGoal(identity,gid){return (identity.goals||[]).find(g=>g.id===gid||g.title===gid)||null;}
function updateGoalProgress(identity,gid,progress){const g=findGoal(identity,gid);if(!g)return null;g.progress=Math.max(0,Math.min(1,Number(progress)||0));g.status=g.progress>=1?'completed':'active';g.updated_at=new Date().toISOString();return g;}
module.exports={createGoal,findGoal,updateGoalProgress};
