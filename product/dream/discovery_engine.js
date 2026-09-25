const crypto=require('crypto');const id=()=>crypto.randomUUID();
function recordSignal(identity,input={}){identity.signals=identity.signals||[];const s={id:id(),kind:input.kind||'interest',value:String(input.value||''),strength:Math.max(0,Math.min(1,Number(input.strength)||.5)),source:input.source||'user',at:new Date().toISOString()};identity.signals.push(s);return s;}
function discoverySummary(identity){const groups={};for(const s of identity.signals||[]){groups[s.kind]??=[];groups[s.kind].push(s);}return Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.sort((a,b)=>b.strength-a.strength).slice(0,10)]));}
module.exports={recordSignal,discoverySummary};
