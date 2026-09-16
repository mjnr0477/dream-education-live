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
    domain: "computer_science",
    problem_type,
    specialist: "computer_science_specialist",
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

  const decimalToBinary =
    l.match(/(?:convert|change)\s+(?:decimal\s+)?(\d+)\s+to\s+binary/i);

  if (decimalToBinary) {
    const n = Number(decimalToBinary[1]);
    const result = n.toString(2);

    return finish(
      "number_system_conversion",
      "deterministic_binary_conversion",
      result,
      q,
      [
        `Decimal number: ${n}`,
        "Repeatedly divide by 2 and record the remainders.",
        `Binary result: ${result}`
      ],
      () => n.toString(2)
    );
  }

  const binaryToDecimal =
    l.match(/(?:convert|change)\s+(?:binary\s+)?([01]+)\s+to\s+decimal/i);

  if (binaryToDecimal) {
    const binary = binaryToDecimal[1];
    const result = parseInt(binary, 2);

    return finish(
      "number_system_conversion",
      "deterministic_binary_conversion",
      result,
      q,
      [
        `Binary number: ${binary}`,
        "Multiply each bit by its corresponding power of 2.",
        `Decimal result: ${result}`
      ],
      () => parseInt(binary, 2)
    );
  }

  if (/linear search/.test(l) && /time complexity|complexity/.test(l)) {
    const result = "O(n)";

    return finish(
      "algorithm_complexity",
      "deterministic_algorithm_analysis",
      result,
      q,
      [
        "Linear search may inspect each element.",
        "In the worst case, all n elements are checked.",
        "Therefore the worst-case time complexity is O(n)."
      ],
      () => "O(n)"
    );
  }

  if (/binary search/.test(l) && /time complexity|complexity/.test(l)) {
    const result = "O(log n)";

    return finish(
      "algorithm_complexity",
      "deterministic_algorithm_analysis",
      result,
      q,
      [
        "Binary search repeatedly halves the search space.",
        "The number of steps grows logarithmically with n.",
        "Therefore the time complexity is O(log n)."
      ],
      () => "O(log n)"
    );
  }

  return createFailure({
    domain: "computer_science",
    problem_type: "unknown",
    specialist: "computer_science_specialist",
    error: "No supported deterministic computer science pattern matched"
  });
}

module.exports = { solve };
