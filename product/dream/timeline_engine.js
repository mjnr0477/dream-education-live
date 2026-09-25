function buildTimeline(identity){const events=[];for(const e of identity.evidence||[])events.push({at:e.created_at,type:'evidence',title:e.title,id:e.id});for(const m of identity.milestones||[])events.push({at:m.at||m.created_at,type:'milestone',title:m.title,id:m.id});return events.sort((a,b)=>String(a.at).localeCompare(String(b.at)));}
module.exports={buildTimeline};
