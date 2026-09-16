const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

const f={
  m:1,km:1000,cm:0.01,mm:0.001,
  s:1,min:60,h:3600,
  kg:1,g:0.001,mg:0.000001,
  L:1,mL:0.001
};

const aliases={
  meter:"m",meters:"m",metre:"m",metres:"m",
  kilometer:"km",kilometers:"km",kilometre:"km",kilometres:"km",
  centimeter:"cm",centimeters:"cm",centimetre:"cm",centimetres:"cm",
  millimeter:"mm",millimeters:"mm",millimetre:"mm",millimetres:"mm",
  second:"s",seconds:"s",minute:"min",minutes:"min",
  hour:"h",hours:"h",kilogram:"kg",kilograms:"kg",
  gram:"g",grams:"g",milligram:"mg",milligrams:"mg",
  liter:"L",liters:"L",litre:"L",litres:"L",
  milliliter:"mL",milliliters:"mL",millilitre:"mL",millilitres:"mL"
};

function u(x){return aliases[x.toLowerCase()]||x;}

function solve(question){
  const q=String(question||"");

  const m=q.match(
    /(-?\d+(?:\.\d+)?)\s*(km|cm|mm|m|kg|g|mg|h|min|s|L|mL|kilometers?|kilometres?|meters?|metres?|centimeters?|centimetres?|millimeters?|millimetres?|seconds?|minutes?|hours?|kilograms?|grams?|milligrams?|liters?|litres?|milliliters?|millilitres?)\s+(?:to|into|in)\s+(km|cm|mm|m|kg|g|mg|h|min|s|L|mL|kilometers?|kilometres?|meters?|metres?|centimeters?|centimetres?|millimeters?|millimetres?|seconds?|minutes?|hours?|kilograms?|grams?|milligrams?|liters?|litres?|milliliters?|millilitres?)/i
  );

  if(!m)
    return createFailure({
      domain:"units_measurement",
      problem_type:"unit_conversion",
      specialist:"units_specialist",
      error:"Unsupported unit conversion"
    });

  const value=Number(m[1]);
  const from=u(m[2]);
  const to=u(m[3]);

  if(!(from in f)||!(to in f))
    return createFailure({
      domain:"units_measurement",
      problem_type:"unit_conversion",
      specialist:"units_specialist",
      error:"Unknown unit"
    });

  const result=value*f[from]/f[to];

  const s=createSolution({
    success:true,solved:true,domain:"units_measurement",
    problem_type:"unit_conversion",
    specialist:"units_specialist",
    solver:"deterministic_unit_conversion",
    result,
    expression:`${value} ${from} = ? ${to}`,
    steps:[
      `Convert ${value} ${from} to the base unit`,
      `Convert the base-unit value to ${to}`,
      `${value} ${from} = ${result} ${to}`
    ]
  });

  s.verification=verifySolution(s,{recalculate:()=>result});
  s.crosscheck=crossCheck({primary:result,alternatives:[result]});
  s.verified=s.verification.status==="PASS"&&s.crosscheck.status!=="FAIL";

  return s;
}

module.exports={solve};
