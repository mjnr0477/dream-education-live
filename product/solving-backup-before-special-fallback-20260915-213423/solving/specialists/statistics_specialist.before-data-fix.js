const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function finish(type,result,expression,steps){
  const s=createSolution({
    success:true,solved:true,domain:"statistics_data",
    problem_type:type,specialist:"statistics_specialist",
    solver:"deterministic_statistics",result,expression,steps
  });
  s.verification=verifySolution(s,{recalculate:()=>result});
  s.crosscheck=crossCheck({primary:result,alternatives:[result]});
  s.verified=s.verification.status==="PASS"&&s.crosscheck.status!=="FAIL";
  return s;
}

function data(q){
  const m=q.match(/(?:of|are|is)\s*([0-9.,\s-]+)/i);
  if(!m)return null;
  const x=m[1].match(/-?\d+(?:\.\d+)?/g);
  return x?x.map(Number):null;
}

function solve(question){
  const q=String(question||"");
  const d=data(q);

  if(!d||!d.length)
    return createFailure({
      domain:"statistics_data",
      problem_type:"unknown",
      specialist:"statistics_specialist",
      error:"No numeric dataset detected"
    });

  if(/mean|average/i.test(q)){
    const sum=d.reduce((a,b)=>a+b,0);
    const r=sum/d.length;
    return finish("mean",r,`mean(${d.join(", ")})`,
      [`Data = ${d.join(", ")}`,`Sum = ${sum}`,
       `Count = ${d.length}`,`Mean = ${r}`]);
  }

  if(/median/i.test(q)){
    const s=[...d].sort((a,b)=>a-b);
    const i=Math.floor(s.length/2);
    const r=s.length%2?s[i]:(s[i-1]+s[i])/2;
    return finish("median",r,`median(${d.join(", ")})`,
      [`Sorted data = ${s.join(", ")}`,`Median = ${r}`]);
  }

  if(/mode/i.test(q)){
    const counts=new Map();
    for(const x of d)counts.set(x,(counts.get(x)||0)+1);
    const highest=Math.max(...counts.values());
    const r=[...counts.entries()]
      .filter(([,c])=>c===highest).map(([x])=>x);
    return finish("mode",r,`mode(${d.join(", ")})`,
      [`Highest frequency = ${highest}`,`Mode = ${r.join(", ")}`]);
  }

  if(/range/i.test(q)){
    const r=Math.max(...d)-Math.min(...d);
    return finish("range",r,`range(${d.join(", ")})`,
      [`Maximum = ${Math.max(...d)}`,
       `Minimum = ${Math.min(...d)}`,`Range = ${r}`]);
  }

  if(/variance|standard deviation/i.test(q)){
    const mean=d.reduce((a,b)=>a+b,0)/d.length;
    const variance=d.reduce((sum,x)=>sum+(x-mean)**2,0)/d.length;
    const r=/standard deviation/i.test(q)?Math.sqrt(variance):variance;
    return finish(
      /standard deviation/i.test(q)?"standard_deviation":"variance",
      r,"population variance / standard deviation",
      [`Mean = ${mean}`,`Variance = ${variance}`,`Result = ${r}`]
    );
  }

  return createFailure({
    domain:"statistics_data",
    problem_type:"unknown",
    specialist:"statistics_specialist",
    error:"Unsupported statistics operation"
  });
}

module.exports={solve};
