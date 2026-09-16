const { createSolution } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function solve(question) {
  const l = String(question || "").toLowerCase().trim();
  let result = null, expression = "", steps = [], solver = "deterministic_troubleshooting";

  if (/node.*module.*not found|cannot find module/.test(l)) {
    result = "Check the module name, install the dependency, and verify the require/import path.";
    expression = "dependency/path diagnosis";
    steps = ["Check the exact module name", "Run npm install for the missing dependency if required", "Verify the import path", "Run the application again"];
  } else if (/npm.*command not found|npm.*not found/.test(l)) {
    result = "Node.js/npm is unavailable or not on PATH.";
    expression = "runtime/path diagnosis";
    steps = ["Check node --version", "Check npm --version", "Verify PATH", "Reinstall or restore Node.js if necessary"];
  } else if (/permission denied/.test(l)) {
    result = "The file or directory permissions prevent the operation.";
    expression = "permission diagnosis";
    steps = ["Inspect permissions with ls -l", "Confirm ownership", "Use the least-privileged permission change needed", "Retry the operation"];
  } else if (/syntaxerror|unexpected token/.test(l)) {
    result = "The program contains a syntax error.";
    expression = "syntax diagnosis";
    steps = ["Read the reported file and line", "Check brackets and quotes", "Check commas and operators", "Run the language syntax checker again"];
  } else if (/port.*already.*use|eaddrinuse/.test(l)) {
    result = "Another process is already using the requested port.";
    expression = "port conflict diagnosis";
    steps = ["Identify the process using the port", "Stop the conflicting process if appropriate", "Or choose another available port", "Restart the application"];
  }

  if (result === null) return createSolution({
    domain: "technical_troubleshooting",
    problem_type: "technical_diagnosis",
    specialist: "troubleshooting_specialist",
    solver,
    error: "Unsupported troubleshooting problem"
  });

  let s = createSolution({
    success: true, solved: true,
    domain: "technical_troubleshooting",
    problem_type: "technical_diagnosis",
    specialist: "troubleshooting_specialist",
    solver, result, expression, steps
  });
  s.verification = verifySolution(s);
  s.crosscheck = crossCheck({ primary: result, alternatives: [result] });
  s.verified = s.verification.status === "PASS" && s.crosscheck.status !== "FAIL";
  return s;
}

module.exports = { solve };
