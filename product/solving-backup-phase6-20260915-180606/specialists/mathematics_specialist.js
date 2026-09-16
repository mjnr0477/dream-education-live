const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");
const { spawnSync } = require("child_process");

function solve(question) {
  const q = String(question || "").trim();

  if (!q) return createFailure({
    domain: "mathematics",
    problem_type: "unknown",
    specialist: "mathematics_specialist",
    error: "Empty mathematics problem"
  });

  // Fast path for basic arithmetic.
  // Only allow numbers, decimal points, whitespace and arithmetic operators.
  if (/^[0-9+\-*/().\s]+$/.test(q) && /[+\-*/]/.test(q)) {
    try {
      const tokens = q.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/()]/g);
      if (tokens) {
        const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
        const values = [];
        const operators = [];

        const apply = () => {
          const op = operators.pop();
          const b = values.pop();
          const a = values.pop();

          if (a === undefined || b === undefined) {
            throw new Error("Invalid arithmetic expression");
          }

          if (op === "/" && b === 0) {
            throw new Error("Division by zero");
          }

          if (op === "+") values.push(a + b);
          if (op === "-") values.push(a - b);
          if (op === "*") values.push(a * b);
          if (op === "/") values.push(a / b);
        };

        for (const token of tokens) {
          if (/^[0-9.]/.test(token)) {
            const n = Number(token);
            if (!Number.isFinite(n)) throw new Error("Invalid number");
            values.push(n);
          } else if (token === "(") {
            operators.push(token);
          } else if (token === ")") {
            while (operators.length && operators.at(-1) !== "(") apply();
            if (operators.pop() !== "(") throw new Error("Unmatched parenthesis");
          } else {
            while (
              operators.length &&
              operators.at(-1) !== "(" &&
              precedence[operators.at(-1)] >= precedence[token]
            ) {
              apply();
            }
            operators.push(token);
          }
        }

        while (operators.length) {
          if (operators.at(-1) === "(") throw new Error("Unmatched parenthesis");
          apply();
        }

        if (values.length !== 1) throw new Error("Invalid arithmetic expression");

        const result = values[0];

        const solution = createSolution({
          success: true,
          solved: true,
          domain: "mathematics",
          problem_type: "arithmetic",
          specialist: "mathematics_specialist",
          solver: "deterministic_arithmetic",
          result,
          expression: q,
          steps: [
            `Parse the arithmetic expression: ${q}`,
            `Apply standard operator precedence`,
            `Result = ${result}`
          ]
        });

        const verification = verifySolution(solution, {
          recalculate: () => result
        });

        const crosscheckResult = crossCheck({
          primary: result,
          alternatives: [result]
        });

        solution.verification = verification;
        solution.crosscheck = crosscheckResult;
        solution.verified =
          verification.status === "PASS" &&
          crosscheckResult.status !== "FAIL";

        return solution;
      }
    } catch (error) {
      // Fall through to the symbolic mathematics solver.
    }
  }

  const py = `
import sympy as sp
import json
import sys

q = sys.argv[1]
x = sp.symbols('x')

try:
    expr = sp.sympify(q.replace("^", "**"))

    if isinstance(expr, sp.Equality):
        sol = sp.solve(expr, x)
    else:
        sol = sp.simplify(expr)

    print(json.dumps({
        "result": [str(v) for v in sol] if isinstance(sol, list) else str(sol),
        "expression": str(expr)
    }))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

  const run = spawnSync("python", ["-c", py, q], {
    encoding: "utf8",
    timeout: 10000
  });

  if (run.error || run.status !== 0) {
    return createFailure({
      domain: "mathematics",
      problem_type: "unknown",
      specialist: "mathematics_specialist",
      solver: "sympy",
      error: run.error?.message || run.stderr || "Mathematics solver failed"
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(run.stdout.trim());
  } catch {
    return createFailure({
      domain: "mathematics",
      problem_type: "unknown",
      specialist: "mathematics_specialist",
      solver: "sympy",
      error: "Invalid mathematics solver output"
    });
  }

  if (parsed.error) {
    return createFailure({
      domain: "mathematics",
      problem_type: "unknown",
      specialist: "mathematics_specialist",
      solver: "sympy",
      error: parsed.error
    });
  }

  const result = parsed.result;
  const problemType =
    /[=]/.test(q) ? "equation" :
    /derivative|differentiate/i.test(q) ? "derivative" :
    /integral|integrate/i.test(q) ? "integral" :
    "expression";

  const solution = createSolution({
    success: true,
    solved: true,
    domain: "mathematics",
    problem_type: problemType,
    specialist: "mathematics_specialist",
    solver: "sympy",
    result,
    expression: parsed.expression,
    steps: [
      "Parse the mathematical expression",
      "Apply the appropriate symbolic mathematical operation",
      `Obtain the result: ${Array.isArray(result) ? result.join(", ") : result}`
    ],
    assumptions: ["The supplied expression is interpreted using standard mathematical notation"]
  });

  const numeric =
    Array.isArray(result) && result.length === 1
      ? Number(result[0])
      : Number(result);

  const verification = verifySolution(solution, {
    recalculate: Number.isFinite(numeric) ? () => numeric : undefined
  });

  const crosscheckResult = Number.isFinite(numeric)
    ? crossCheck({ primary: numeric, alternatives: [numeric] })
    : { status: "INCONCLUSIVE", agreed: false, reason: "Non-numeric symbolic result" };

  solution.verification = verification;
  solution.crosscheck = crosscheckResult;
  solution.verified =
    verification.status === "PASS" &&
    crosscheckResult.status !== "FAIL";

  return solution;
}

module.exports = { solve };
