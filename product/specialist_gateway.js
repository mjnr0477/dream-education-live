const { spawn } = require("child_process");
const path = require("path");

const MATH_WORKER_PATH = path.join(
  __dirname,
  "math_solver_worker.py"
);

let mathWorker = null;
let mathBuffer = "";
let mathPending = null;

function startMathWorker() {
  if (mathWorker) return;

  mathWorker = spawn("python", [MATH_WORKER_PATH]);

  mathWorker.stdout.on("data", (data) => {
    mathBuffer += data.toString();

    const lines = mathBuffer.split("\n");
    mathBuffer = lines.pop();

    for (const line of lines) {
      if (!line.trim() || !mathPending) continue;

      try {
        const result = JSON.parse(line);
        const current = mathPending;
        mathPending = null;
        current.resolve(result);
      } catch (error) {
        const current = mathPending;
        mathPending = null;

        current.resolve({
          success: false,
          solved: false,
          solver: "sympy",
          verified: false,
          error: "Invalid mathematics worker response."
        });
      }
    }
  });

  mathWorker.stderr.on("data", (data) => {
    console.error(
      "Math specialist:",
      data.toString().trim()
    );
  });

  mathWorker.on("error", (error) => {
    if (mathPending) {
      const current = mathPending;
      mathPending = null;

      current.resolve({
        success: false,
        solved: false,
        solver: "sympy",
        verified: false,
        error: error.message
      });
    }

    mathWorker = null;
  });

  mathWorker.on("exit", () => {
    mathWorker = null;
    mathBuffer = "";
  });
}

function solveWithMathWorker(question) {
  return new Promise((resolve) => {
    startMathWorker();

    if (mathPending) {
      resolve({
        success: false,
        solved: false,
        solver: "sympy",
        verified: false,
        error: "Math specialist is currently busy."
      });
      return;
    }

    mathPending = { resolve };

    mathWorker.stdin.write(
      JSON.stringify({ question }) + "\n"
    );
  });
}

function isMathematicsQuestion(question, queryInfo = {}) {
  const text = String(question || "").toLowerCase();

  if (
    queryInfo &&
    String(queryInfo.subject || "").toLowerCase() ===
      "mathematics"
  ) {
    return true;
  }

  return (
    /\b(solve|equation|simplify|factor|factorise|factorize|derivative|differentiate|integral|integrate|substitute|calculate|algebra|quadratic|polynomial|expression)\b/.test(text) ||
    /x\s*[=+\-*/^]/.test(text)
  );
}

function normalizeMathResult(result, question) {
  if (!result || result.success !== true) {
    return null;
  }

  return {
    success: true,
    solved: result.solved !== false,
    routed: true,

    domain: "mathematics",

    type:
      result.type ||
      "mathematical_problem",

    subject: "mathematics",

    solver: result.solver || "sympy",

    result:
      result.result !== undefined
        ? result.result
        : null,

    expression:
      result.expression !== undefined
        ? result.expression
        : null,

    verified: result.verified === true,

    steps: Array.isArray(result.steps)
      ? result.steps
      : [],

    classification: {
      domain: "mathematics",
      type:
        result.type ||
        "mathematical_problem"
    },

    question,

    error: result.error || null
  };
}

function detectSpecialistDomain(question, queryInfo = {}) {
  const text = String(question || "").toLowerCase();

  const subject = String(
    queryInfo.subject || ""
  ).toLowerCase();

  if (
    subject.includes("mathematics") ||
    subject === "math"
  ) {
    return "mathematics";
  }

  if (subject.includes("physics")) {
    return "physics";
  }

  if (subject.includes("chemistry")) {
    return "chemistry";
  }

  if (
    subject.includes("biology") ||
    subject.includes("life science")
  ) {
    return "biology";
  }

  if (
    subject.includes("statistics") ||
    subject.includes("data")
  ) {
    return "statistics";
  }

  if (
    subject.includes("finance") ||
    subject.includes("accounting") ||
    subject.includes("business")
  ) {
    return "finance";
  }

  if (
    /\b(textbook|textbooks|exercise book|exercise books)\b/.test(text) &&
    /\b(altogether|in total|spent|cost|costs|paid)\b/.test(text)
  ) {
    return "word_problem";
  }

  /*
   * Unit conversion.
   */
  if (
    /\b(convert|conversion|converting)\b/.test(text) &&
    /\b(km|kilometre|kilometres|kilometer|kilometers|m|metre|metres|meter|meters|cm|centimetre|centimetres|mm|millimetre|millimetres|g|gram|grams|kg|kilogram|kilograms|mg|milligram|milligrams|l|litre|litres|liter|liters|ml|millilitre|millilitres|milliliter|milliliters|s|second|seconds|min|minute|minutes|h|hour|hours)\b/.test(text)
  ) {
    return "unit_conversion";
  }

  /*
   * Rate problems.
   * This must come before the generic physics speed rule.
   */
  if (
    /\b(average speed|rate|unit rate|per hour|per minute|per second)\b/.test(text)
  ) {
    return "rate";
  }

  /*
   * General mathematics.
   */
  if (
    /\b(derivative|differentiate|integral|integrate|factor|factorise|factorize|equation|quadratic|algebra|simplify|substitute)\b/.test(text) ||
    /x\s*[=+\-*/^]/.test(text)
  ) {
    return "mathematics";
  }

  /*
   * Physics.
   */
  if (
    /\b(force|acceleration|velocity|speed|mass|weight|kinetic energy|work done|power|voltage|current|resistance)\b/.test(text)
  ) {
    return "physics";
  }

  /*
   * Chemistry.
   */
  if (
    /\b(moles?|molar mass|molarity|concentration|dilution|chemical|chemistry|h2o|co2|nacl)\b/.test(text)
  ) {
    return "chemistry";
  }

  /*
   * Biology.
   */
  if (
    /\b(gene|genotype|phenotype|allele|offspring|dna|genetics|biology|organism|cell|cells|photosynthesis|respiration|ecosystem|ecology)\b/.test(text) ||
    /\b[acgt]{2}\b/.test(text)
  ) {
    return "biology";
  }

  /*
   * Statistics.
   */
  if (
    /\b(mean|median|mode|variance|standard deviation|dataset|data set|statistics)\b/.test(text)
  ) {
    return "statistics";
  }

  /*
   * Finance.
   */
  if (
    /\b(finance|financial|loan|borrowed|borrow|interest|simple interest|compound interest|principal|profit|loss|revenue|investment|salary|tax|discount)\b/.test(text)
  ) {
    return "finance";
  }

  return "unknown";
}

async function solveWithSpecialists(
  question,
  queryInfo = {}
) {
  const text = String(question || "").trim();

  if (!text) {
    return {
      success: false,
      solved: false,
      routed: false,
      error: "No problem supplied."
    };
  }

  const domain = detectSpecialistDomain(
    text,
    queryInfo
  );

  /*
   * Mathematics has a dedicated SymPy worker.
   * Keep the universal solver as the fallback.
   */
  if (domain === "mathematics") {
    const mathResult =
      await solveWithMathWorker(text);

    const normalized =
      normalizeMathResult(
        mathResult,
        text
      );

    if (
      normalized &&
      normalized.solved &&
      normalized.verified
    ) {
      return normalized;
    }
  }

  /*
   * These domains are currently handled by the
   * existing universal solver. Returning null here
   * deliberately activates that fallback.
   *
   * The gateway now knows the domain, so additional
   * dedicated specialists can be plugged in later
   * without changing the teaching engine.
   */
  return null;
}

module.exports = {
  solveWithMathWorker,
  solveWithSpecialists,
  isMathematicsQuestion,
  detectSpecialistDomain
};
