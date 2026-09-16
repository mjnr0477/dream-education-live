const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function finish(type,solver,result,expression,steps,recalculate){
  const s=createSolution({
    success:true,solved:true,domain:"finance_accounting",
    problem_type:type,specialist:"finance_specialist",
    solver,result,expression,steps
  });
  s.verification=verifySolution(s,{recalculate});
  s.crosscheck=crossCheck({primary:result,alternatives:[result]});
  s.verified=s.verification.status==="PASS"&&s.crosscheck.status!=="FAIL";
  return s;
}

function solve(question){
  const q=String(question||"").toLowerCase();

  const amount=q.match(/(?:principal|amount|borrow|loan)[^0-9]*([0-9.]+)/) ||
             q.match(/\bon\s+([0-9.]+)/);
  const rate=q.match(/(?:rate|interest)[^0-9]*([0-9.]+)\s*%/) ||
             q.match(/([0-9.]+)\s*%/);
  const years=q.match(/(?:for|period)[^0-9]*([0-9.]+)\s*(?:years?|yr)/);

  if(amount&&rate&&years&&/simple interest/.test(q)){
    const P=Number(amount[1]);
    const r=Number(rate[1])/100;
    const t=Number(years[1]);
    const interest=P*r*t;
    const total=P+interest;

    return finish(
      "simple_interest",
      "deterministic_simple_interest",
      total,
      "A = P(1 + rt)",
      [`P = ${P}`,`r = ${r}`,`t = ${t}`,
       `Interest = ${interest}`,`Total = ${total}`],
      ()=>P*(1+r*t)
    );
  }

  if(amount&&rate&&years&&/compound interest/.test(q)){
    const P=Number(amount[1]);
    const r=Number(rate[1])/100;
    const t=Number(years[1]);
    const total=P*Math.pow(1+r,t);

    return finish(
      "compound_interest",
      "deterministic_compound_interest",
      total,
      "A = P(1+r)^t",
      [`P = ${P}`,`r = ${r}`,`t = ${t}`,`A = ${total}`],
      ()=>P*Math.pow(1+r,t)
    );
  }

  const cost=q.match(/(?:cost|buying|purchase)\s*(?:price)?[^0-9]*([0-9.]+)/);
  const sell=q.match(/(?:selling|sell)\s*(?:price)?[^0-9]*([0-9.]+)/);

  if(cost&&sell&&/profit|loss/.test(q)){
    const cp=Number(cost[1]);
    const sp=Number(sell[1]);
    const difference=sp-cp;

    return finish(
      difference>=0?"profit":"loss",
      "deterministic_profit_loss",
      Math.abs(difference),
      "Profit/Loss = SP - CP",
      [`Cost price = ${cp}`,
       `Selling price = ${sp}`,
       `${difference>=0?"Profit":"Loss"} = ${Math.abs(difference)}`],
      ()=>Math.abs(sp-cp)
    );
  }

  return createFailure({
    domain:"finance_accounting",
    problem_type:"unknown",
    specialist:"finance_specialist",
    error:"No supported deterministic finance pattern matched"
  });
}

module.exports={solve};
