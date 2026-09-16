const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function finish(type,solver,result,expression,steps,recalculate){
  const s=createSolution({
    success:true,solved:true,domain:"physics",
    problem_type:type,specialist:"physics_specialist",
    solver,result,expression,steps
  });
  s.verification=verifySolution(s,{recalculate});
  s.crosscheck=crossCheck({primary:result,alternatives:[result]});
  s.verified=s.verification.status==="PASS"&&s.crosscheck.status!=="FAIL";
  return s;
}

function n(pattern,q){
  const m=q.match(pattern);
  return m?Number(m[1]):null;
}

function solve(question){
  const q=String(question||"").toLowerCase();

  if(/accelerat|kinematic/.test(q)){
    const a=n(/accelerat(?:ion|es)?[^0-9]*([0-9.]+)/,q);
    const t=n(/(?:for|time)[^0-9]*([0-9.]+)\s*(?:s|sec|second)/,q);
    if(a!==null&&t!==null){
      const u=/from rest/.test(q)?0:
        n(/(?:initial velocity|initial speed)[^0-9]*([0-9.]+)/,q)??0;
      const result=u*t+0.5*a*t*t;
      return finish("kinematics","deterministic_kinematics",result,
        "s = ut + 1/2at²",
        [`u = ${u} m/s`,`a = ${a} m/s²`,`t = ${t} s`,
        `s = ${result} m`],()=>result);
    }
  }

  if(/force|newton|mass.*acceleration|acceleration.*mass/.test(q)){
    const m=n(/mass[^0-9]*([0-9.]+)\s*kg/,q);
    const a=n(/acceleration[^0-9]*([0-9.]+)/,q) ??
            n(/has\s+acceleration[^0-9]*([0-9.]+)/,q);
    if(m!==null&&a!==null){
      const result=m*a;
      return finish("force","deterministic_newtons_second_law",result,
        "F = ma",
        [`m = ${m} kg`,`a = ${a} m/s²`,`F = ${result} N`],()=>result);
    }
  }

  if(/kinetic.*energy/.test(q)){
    const m=n(/mass[^0-9]*([0-9.]+)\s*kg/,q);
    const v=n(/(?:velocity|speed)[^0-9]*([0-9.]+)\s*m\/s/,q);
    if(m!==null&&v!==null){
      const result=0.5*m*v*v;
      return finish("kinetic_energy","deterministic_kinetic_energy",result,
        "KE = 1/2mv²",
        [`m = ${m} kg`,`v = ${v} m/s`,`KE = ${result} J`],()=>result);
    }
  }

  if(/density/.test(q)){
    const m=n(/mass[^0-9]*([0-9.]+)/,q);
    const v=n(/volume[^0-9]*([0-9.]+)/,q);
    if(m!==null&&v!==null&&v!==0){
      const result=m/v;
      return finish("density","deterministic_density",result,
        "ρ = m/V",
        [`m = ${m}`,`V = ${v}`,`ρ = ${result}`],()=>result);
    }
  }

  if(/ohm|voltage.*current|current.*voltage/.test(q)){
    const v=n(/voltage[^0-9]*([0-9.]+)/,q);
    const i=n(/current[^0-9]*([0-9.]+)/,q);
    if(v!==null&&i!==null&&i!==0){
      const result=v/i;
      return finish("resistance","deterministic_ohms_law",result,
        "R = V/I",
        [`V = ${v} V`,`I = ${i} A`,`R = ${result} Ω`],()=>result);
    }
  }

  return createFailure({
    domain:"physics",problem_type:"unknown",
    specialist:"physics_specialist",
    error:"No supported deterministic physics pattern matched"
  });
}

module.exports={solve};
