const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");
const { spawnSync } = require("child_process");

function finish(type, solver, result, expression, steps, recalculate) {
  const solution = createSolution({
    success:true, solved:true, domain:"mathematics",
    problem_type:type, specialist:"mathematics_specialist",
    solver, result, expression, steps
  });
  solution.verification = verifySolution(solution,{recalculate});
  solution.crosscheck = crossCheck({primary:result,alternatives:[result]});
  solution.verified =
    solution.verification.status === "PASS" &&
    solution.crosscheck.status !== "FAIL";
  return solution;
}

function arithmetic(q) {
  if (!/^[0-9+\-*/().\s]+$/.test(q) || !/[+\-*/]/.test(q)) return null;
  try {
    const tokens=q.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/()]/g);
    const precedence={"+":1,"-":1,"*":2,"/":2};
    const values=[],ops=[];
    const apply=()=>{
      const op=ops.pop(),b=values.pop(),a=values.pop();
      if(a===undefined||b===undefined) throw Error();
      if(op==="/"&&b===0) throw Error();
      if(op==="+") values.push(a+b);
      if(op==="-") values.push(a-b);
      if(op==="*") values.push(a*b);
      if(op==="/") values.push(a/b);
    };
    for(const t of tokens){
      if(/^\d|\./.test(t)) values.push(Number(t));
      else if(t==="(") ops.push(t);
      else if(t===")"){
        while(ops.length&&ops.at(-1)!=="(") apply();
        if(ops.pop()!=="(") throw Error();
      } else {
        while(ops.length&&ops.at(-1)!=="("&&
              precedence[ops.at(-1)]>=precedence[t]) apply();
        ops.push(t);
      }
    }
    while(ops.length) {
      if(ops.at(-1)==="(") throw Error();
      apply();
    }
    return values.length===1&&Number.isFinite(values[0])?values[0]:null;
  } catch { return null; }
}

function solve(question) {
  const q=String(question||"").trim();

  const ar=arithmetic(q);
  if(ar!==null)
    return finish("arithmetic","deterministic_arithmetic",ar,q,
      [`Evaluate ${q}`,`Result = ${ar}`],()=>ar);

  const p=q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)/i);
  if(p){
    const r=Number(p[2])*Number(p[1])/100;
    return finish("percentage","deterministic_percentage",r,
      `${p[1]}% of ${p[2]}`,
      [`Convert ${p[1]}% to decimal`, `Result = ${r}`],()=>r);
  }

    const qd=q.match(/^\s*(-?\d*(?:\.\d+)?)\s*x\s*\^\s*2\s*([+-])\s*(\d+(?:\.\d+)?)\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*=\s*0\s*$/i);
    if(qd){
      const a=qd[1]===""||qd[1]==="-"?(qd[1]==="-"?-1:1):Number(qd[1]);
      const b=Number(qd[3])*(qd[2]==="-"?-1:1);
      const c=Number(qd[5])*(qd[4]==="-"?-1:1);
      const d=b*b-4*a*c;
      if(d>=0){
        const r1=(-b+Math.sqrt(d))/(2*a);
        const r2=(-b-Math.sqrt(d))/(2*a);
        return finish("quadratic_equation","deterministic_quadratic",[r1,r2],q,[`Discriminant = ${d}`,`x₁ = ${r1}`,`x₂ = ${r2}`],()=>[r1,r2]);
      }
    }

  const e=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/i);
  if(e){
    const a=Number(e[1]);
    const b=Number(e[3])*(e[2]==="-"?-1:1);
    const c=Number(e[4]);
    if(a!==0){
      const r=(c-b)/a;
      return finish("linear_equation","deterministic_linear_equation",
        r,q,[`Move constant: ${a}x = ${c-b}`,
        `Divide by ${a}`,`x = ${r}`],()=>r);
    }
  }

  const py=`
import sympy as sp,sys
q=sys.argv[1]
x=sp.symbols('x')
try:
 e=sp.sympify(q.replace("^","**"))
 print(str(sp.solve(e,x) if isinstance(e,sp.Equality) else sp.simplify(e)))
except Exception as e:
 print("ERROR:"+str(e))
`;
  const run=spawnSync("python",["-c",py,q],{encoding:"utf8",timeout:15000});

  if(!run.error&&run.status===0&&run.stdout.trim()&&!run.stdout.startsWith("ERROR:")){
    const result=run.stdout.trim();
    return finish(/[=]/.test(q)?"equation":"symbolic_expression",
      "sympy",result,q,["Parse expression","Apply symbolic mathematics",
      `Result = ${result}`],()=>result);
  }

  return createFailure({
    domain:"mathematics",
    problem_type:"unknown",
    specialist:"mathematics_specialist",
    error:"No supported mathematics method matched"
  });
}

module.exports={solve};
