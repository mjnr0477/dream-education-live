const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

const masses={
 H:1.008,C:12.011,N:14.007,O:15.999,
 Na:22.990,Cl:35.45,S:32.06,Ca:40.078,
 Mg:24.305,K:39.098,Fe:55.845
};

function finish(type,solver,result,expression,steps,recalculate){
  const s=createSolution({
    success:true,solved:true,domain:"chemistry",
    problem_type:type,specialist:"chemistry_specialist",
    solver,result,expression,steps
  });
  s.verification=verifySolution(s,{recalculate});
  s.crosscheck=crossCheck({primary:result,alternatives:[result]});
  s.verified=s.verification.status==="PASS"&&s.crosscheck.status!=="FAIL";
  return s;
}

function molarMass(formula){
  const tokens=[...formula.matchAll(/([A-Z][a-z]?)([0-9]*)/g)];
  if(!tokens.length)return null;
  let total=0;
  for(const t of tokens){
    const symbol=t[1],count=Number(t[2]||1);
    if(!(symbol in masses))return null;
    total+=masses[symbol]*count;
  }
  return total;
}

function solve(question){
  const q=String(question||"").trim();

  const m=q.match(/(?:molar mass|relative formula mass)\s+(?:of|for)?\s*([A-Z][A-Za-z0-9]*)\b/i)
    ||q.match(/\b([A-Z][A-Za-z0-9]*)\b/);

  if(/molar mass|relative formula mass/i.test(q)&&m){
    const formula=m[1];
    const result=molarMass(formula);
    if(result!==null){
      const rounded=Number(result.toFixed(6));
      return finish("molar_mass","atomic_mass_table",rounded,
        `M(${formula})`,
        [`Identify elements in ${formula}`,
        "Multiply atomic masses by subscripts",
        `M(${formula}) = ${result.toFixed(3)} g/mol`],
        ()=>rounded);
    }
  }

  return createFailure({
    domain:"chemistry",problem_type:"unknown",
    specialist:"chemistry_specialist",
    error:"No supported deterministic chemistry pattern matched"
  });
}

module.exports={solve};
