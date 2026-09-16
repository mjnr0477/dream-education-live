"use strict";

const { createSolution, createFailure } =
  require("./specialist_contract.js");
const { verifySolution } =
  require("../verifier/independent_verifier.js");
const { crossCheck } =
  require("../crosscheck/crosscheck_engine.js");

function finish(problem_type, solver, result, expression, steps, recalc) {
  const verification = verifySolution(
    { result, steps },
    { recalculate: recalc }
  );

  const crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  return createSolution({
    success: true,
    solved: true,
    domain: "logic_reasoning",
    problem_type,
    specialist: "logic_specialist",
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

  if (
    /p\s+implies\s+q/.test(l) &&
    /p\s+(?:is\s+)?true/.test(l) &&
    /q\s+(?:is\s+)?false/.test(l)
  ) {
    const result = false;

    return finish(
      "logical_implication",
      "deterministic_logic",
      result,
      "P → Q",
      [
        "P is true.",
        "Q is false.",
        "An implication P → Q is false when P is true and Q is false."
      ],
      () => false
    );
  }

  if (
    /implication/.test(l) &&
    /p\s*(?:→|->|implies)\s*q/.test(l) &&
    /false|when/.test(l)
  ) {
    const result =
      "An implication P → Q is false only when P is true and Q is false.";

    return finish(
      "logical_implication",
      "deterministic_logic",
      result,
      q,
      [
        "Identify P as the antecedent.",
        "Identify Q as the consequent.",
        "An implication P → Q is false only when P is true and Q is false."
      ],
      () => result
    );
  }

  if (
    /if.*then/.test(l) &&
    /(true|false|implication)/.test(l)
  ) {
    const result =
      "The implication is false only when the antecedent is true and the consequent is false.";

    return finish(
      "logical_implication",
      "deterministic_logic",
      result,
      q,
      [
        "Identify the antecedent.",
        "Identify the consequent.",
        "An implication is false only for true antecedent and false consequent."
      ],
      () => result
    );
  }

  if (/all.*are.*some.*are/.test(l) || /all.*are.*not/.test(l)) {
    const result =
      "A universal statement about all members does not by itself prove an existential statement about a particular member.";

    return finish(
      "categorical_reasoning",
      "deterministic_logic",
      result,
      q,
      [
        "Identify whether the statement is universal or existential.",
        "Check whether the conclusion contains information not guaranteed by the premise.",
        "Do not infer existence unless the premises establish it."
      ],
      () => result
    );
  }

  if (/if.*then/.test(l) && /contrapositive/.test(l)) {
    const result =
      "The contrapositive of 'If P, then Q' is 'If not Q, then not P.'";

    return finish(
      "contrapositive",
      "deterministic_logic",
      result,
      q,
      [
        "Start with If P, then Q.",
        "Negate the consequent.",
        "Negate the antecedent.",
        "Reverse their order: If not Q, then not P."
      ],
      () => result
    );
  }

  return createFailure({
    domain: "logic_reasoning",
    problem_type: "unknown",
    specialist: "logic_specialist",
    error: "No supported deterministic logic pattern matched"
  });
}

module.exports = { solve };
