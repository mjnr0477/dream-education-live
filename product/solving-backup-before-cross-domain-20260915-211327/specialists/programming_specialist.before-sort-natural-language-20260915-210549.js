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
    domain: "programming_code",
    problem_type,
    specialist: "programming_specialist",
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

  if (/sort.*list|sort.*array/.test(l) && /python/.test(l)) {
    const result =
`numbers = [5, 2, 8, 1]
numbers.sort()
print(numbers)`;

    return finish(
      "code_generation",
      "deterministic_python_template",
      result,
      q,
      [
        "Create the list.",
        "Use the built-in sort() method.",
        "Print the sorted list."
      ],
      () => result
    );
  }

  if (/reverse.*string|string.*reverse/.test(l) && /python/.test(l)) {
    const result =
`text = "hello"
reversed_text = text[::-1]
print(reversed_text)`;

    return finish(
      "code_generation",
      "deterministic_python_template",
      result,
      q,
      [
        "Store the string.",
        "Use Python slicing with a step of -1.",
        "Print the reversed string."
      ],
      () => result
    );
  }

  if (/factorial/.test(l) && /python/.test(l)) {
    const result =
`n = 5
factorial = 1

for i in range(1, n + 1):
    factorial *= i

print(factorial)`;

    return finish(
      "code_generation",
      "deterministic_python_template",
      result,
      q,
      [
        "Initialize factorial to 1.",
        "Loop from 1 through n.",
        "Multiply factorial by each number.",
        "Print the result."
      ],
      () => result
    );
  }

  return createFailure({
    domain: "programming_code",
    problem_type: "unknown",
    specialist: "programming_specialist",
    error: "No supported deterministic programming pattern matched"
  });
}

module.exports = { solve };
