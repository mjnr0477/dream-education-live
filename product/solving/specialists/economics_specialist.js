"use strict";

const {
  createSolution,
  createFailure
} = require("./specialist_contract.js");

const {
  verifySolution
} = require("../verifier/independent_verifier.js");

const {
  crossCheck
} = require("../crosscheck/crosscheck_engine.js");

function finish(problem_type, solver, result, expression, steps, recalc) {
  const verification = verifySolution(
    {
      success: true,
      solved: true,
      result,
      steps
    },
    { recalculate: recalc }
  );

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return createSolution({
    success: true,
    solved: true,
    domain: "economics_business",
    problem_type,
    specialist: "economics_specialist",
    solver,
    result,
    expression,
    steps,
    verification,
    crosscheck
  });
}

function solve(question) {
  const q = String(question || "").trim();
  const l = q.toLowerCase();

  // Revenue = price × quantity
  if (
    (/revenue/.test(l) || /(?:sells?|sold)\s+\d+(?:\.\d+)?\s*(?:units|items)/.test(l)) &&
    /(price|selling)/.test(l) &&
    /(quantity|units|items)/.test(l)
  ) {
    const price = l.match(/(?:price|selling(?:\s+price)?)\D*(\d+(?:\.\d+)?)/);
    const quantity =
      l.match(/(\d+(?:\.\d+)?)\s*(?:units|items)/) ||
      l.match(/(?:quantity|units|items)\D*(\d+(?:\.\d+)?)/);

    if (price && quantity) {
      const p = Number(price[1]);
      const qn = Number(quantity[1]);
      const result = p * qn;

      return finish(
        "revenue",
        "deterministic_economics",
        result,
        "Revenue = Price × Quantity",
        [
          `Price = ${p}`,
          `Quantity = ${qn}`,
          `Revenue = ${p} × ${qn}`,
          `Revenue = ${result}`
        ],
        () => p * qn
      );
    }
  }

  // Profit = revenue - cost
  if (/profit/.test(l) && /(revenue|cost)/.test(l)) {
    const revenue = l.match(/revenue\D*(\d+(?:\.\d+)?)/);
    const cost = l.match(/cost\D*(\d+(?:\.\d+)?)/);

    if (revenue && cost) {
      const r = Number(revenue[1]);
      const c = Number(cost[1]);
      const result = r - c;

      return finish(
        "business_profit",
        "deterministic_economics",
        result,
        "Profit = Revenue - Cost",
        [
          `Revenue = ${r}`,
          `Cost = ${c}`,
          `Profit = ${r} - ${c}`,
          `Profit = ${result}`
        ],
        () => r - c
      );
    }
  }

  // Break-even quantity = fixed cost / contribution margin
  if (/break[- ]?even/.test(l)) {
    const fixed = l.match(/fixed\s+(?:cost|costs)\D*(\d+(?:\.\d+)?)/);
    const price = l.match(/(?:selling\s+price|price\s+per\s+unit|unit\s+price)\D*(\d+(?:\.\d+)?)/);
    const variable = l.match(/(?:variable\s+cost|variable\s+cost\s+per\s+unit)\D*(\d+(?:\.\d+)?)/);

    if (fixed && price && variable) {
      const fc = Number(fixed[1]);
      const p = Number(price[1]);
      const vc = Number(variable[1]);
      const margin = p - vc;
      const result = fc / margin;

      return finish(
        "break_even",
        "deterministic_economics",
        result,
        "Break-even quantity = Fixed Cost / (Price - Variable Cost)",
        [
          `Fixed cost = ${fc}`,
          `Unit price = ${p}`,
          `Variable cost per unit = ${vc}`,
          `Contribution margin = ${p} - ${vc} = ${margin}`,
          `Break-even quantity = ${fc} / ${margin}`,
          `Break-even quantity = ${result}`
        ],
        () => fc / (p - vc)
      );
    }
  }

  // Simple percentage growth
  if (/(?:increases?|growth|growth rate)/.test(l) && /from/.test(l) && /to/.test(l)) {
    const m = l.match(/from\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/);

    if (m) {
      const oldValue = Number(m[1]);
      const newValue = Number(m[2]);
      const result = ((newValue - oldValue) / oldValue) * 100;

      return finish(
        "percentage_growth",
        "deterministic_economics",
        result,
        "Growth rate = ((New - Old) / Old) × 100",
        [
          `Old value = ${oldValue}`,
          `New value = ${newValue}`,
          `Growth = ${newValue} - ${oldValue}`,
          `Growth rate = (${newValue} - ${oldValue}) / ${oldValue} × 100`,
          `Growth rate = ${result}%`
        ],
        () => ((newValue - oldValue) / oldValue) * 100
      );
    }
  }

  // Simple demand elasticity
  if (/elasticity/.test(l) && /quantity/.test(l) && /price/.test(l)) {
    const pctQ = l.match(/(?:quantity|demand)[^0-9-]*(-?\d+(?:\.\d+)?)\s*%/);
    const pctP = l.match(/price[^0-9-]*(-?\d+(?:\.\d+)?)\s*%/);

    if (pctQ && pctP && Number(pctP[1]) !== 0) {
      const dq = Number(pctQ[1]);
      const dp = Number(pctP[1]);
      const result = dq / dp;

      return finish(
        "price_elasticity",
        "deterministic_economics",
        result,
        "Elasticity = % change in quantity demanded / % change in price",
        [
          `% change in quantity = ${dq}%`,
          `% change in price = ${dp}%`,
          `Elasticity = ${dq} / ${dp}`,
          `Elasticity = ${result}`
        ],
        () => dq / dp
      );
    }
  }

  return createFailure({
    domain: "economics_business",
    problem_type: "unknown",
    specialist: "economics_specialist",
    solver: "none",
    error: "Economics/business problem type not supported by this specialist"
  });
}

module.exports = {
  solve
};
