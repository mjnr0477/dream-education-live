const { spawn } = require("child_process");
const path = require("path");
const {
  solveWithSpecialists
} = require("./specialist_gateway.js");

const WORKER_PATH = path.join(__dirname, "general_problem_solver.py");

let worker = null;
let buffer = "";
let pending = null;

function startWorker() {
  if (worker) return;

  worker = spawn("python", [WORKER_PATH]);

  worker.stdout.on("data", (data) => {
    buffer += data.toString();

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim() || !pending) continue;

      try {
        const result = JSON.parse(line);
        const current = pending;
        pending = null;
        current.resolve(result);
      } catch (error) {
        const current = pending;
        pending = null;

        current.resolve({
          success: false,
          solved: false,
          routed: true,
          error: "Invalid solver response."
        });
      }
    }
  });

  worker.stderr.on("data", (data) => {
    console.error(
      "Universal solver:",
      data.toString().trim()
    );
  });

  worker.on("error", (error) => {
    if (pending) {
      const current = pending;
      pending = null;

      current.resolve({
        success: false,
        solved: false,
        routed: true,
        error: error.message
      });
    }

    worker = null;
  });

  worker.on("exit", () => {
    worker = null;
    buffer = "";
  });
}

function solveWithUniversalSolver(question) {
  return new Promise((resolve) => {
    startWorker();

    if (pending) {
      resolve({
        success: false,
        solved: false,
        routed: true,
        error: "Solver is currently busy."
      });
      return;
    }

    pending = { resolve };

    worker.stdin.write(
      JSON.stringify({ question }) + "\n"
    );
  });
}


const EXTERNAL_CALCULATOR_BASE = "https://calculator.free/api/v1";

async function solveWithExternalCalculator(question) {
  const text = String(question || "").trim();
  const lower = text.toLowerCase();

  function nums() {
    return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
  }

  function clean(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function makeResult(result, type, solver, steps, primaryResult = null) {
    const resultText = clean(primaryResult !== null ? primaryResult : result);

    const failedResult =
      /could not parse|error|invalid|unable to calculate|not found/i.test(
        resultText
      );

    return {
      success: !failedResult,
      solved: !failedResult,
      routed: true,
      domain: "external",
      type,
      subject: "external",
      solver,
      result: primaryResult !== null ? primaryResult : result,
      details: result,
      expression: text,
      verified: !failedResult,
      steps,
      classification: {
        domain: "external",
        type
      },
      error: failedResult
        ? resultText
        : null
    };
  }

  async function call(slug, params, type, stepsBuilder) {
    const { calculate } = require("./calculator_free_gateway");

    const data = await calculate(slug, params);

    if (!data || data.ok !== true || !data.results) {
      throw new Error(
        `Calculator.Free ${slug} returned no usable result`
      );
    }

    const steps = stepsBuilder(data.results);

    const primaryKeys = {
      percentage: "result",
      ratio: "ratio",
      "square-root": "root",
      root: "result",
      exponent: "result",
      probability: "probability",
      "mean-median-mode": "mean",
      "standard-deviation": "standard_deviation",
      variance: "variance",
      force: "force",
      "kinetic-energy": "energy",
      "potential-energy": "energy",
      density: "density",
      molarity: "molarity",
      "molecular-weight": "mass",
      "simple-interest": "interest"
    };

    const primaryKey = primaryKeys[slug];
    const primaryResult =
      primaryKey && data.results[primaryKey] !== undefined
        ? data.results[primaryKey]
        : null;

    return makeResult(
      data.results,
      type,
      `calculator.free:${slug}`,
      steps,
      primaryResult
    );
  }

  try {
    const n = nums();

    // Percentage
    const percentage =
      text.match(
        /(-?\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(-?\d+(?:\.\d+)?)/i
      );

    if (percentage) {
      const a = Number(percentage[1]);
      const b = Number(percentage[2]);

      return await call(
        "percentage",
        {
          mode: "of",
          a,
          b
        },
        "percentage",
        results => {
          const answer = clean(results.result);

          return [
            `Identify the percentage: ${a}% of ${b}.`,
            `Convert the percentage to a decimal: ${a} ÷ 100 = ${a / 100}.`,
            `Multiply the decimal by ${b}: ${a / 100} × ${b} = ${answer}.`,
            `Answer: ${answer}.`
          ];
        }
      );
    }

    // Square root
    if (
      /(?:square root|sqrt)/i.test(lower) &&
      n.length >= 1
    ) {
      const value = n[0];

      return await call(
        "square-root",
        {
          value
        },
        "square_root",
        results => [
          `Identify the number: ${value}.`,
          `Find the number that multiplied by itself gives ${value}.`,
          `√${value} = ${clean(results.root)}.`,
          `Answer: ${clean(results.root)}.`
        ]
      );
    }

    // General root
    if (
      /\broot\b/i.test(lower) &&
      !/square root|sqrt/i.test(lower) &&
      n.length >= 2
    ) {
      const value = n[0];
      const degree = n[1];

      return await call(
        "root",
        {
          value,
          degree
        },
        "root",
        results => [
          `Identify the value: ${value}.`,
          `Identify the root degree: ${degree}.`,
          `Find the number which raised to the ${degree}th power gives ${value}.`,
          `${degree}th root of ${value} = ${clean(results.result)}.`,
          `Answer: ${clean(results.result)}.`
        ]
      );
    }

    // Exponent
    if (
      /(?:raised to|power of|exponent)/i.test(lower) &&
      n.length >= 2
    ) {
      const base = n[0];
      const exponent = n[1];

      return await call(
        "exponent",
        {
          base,
          exponent
        },
        "exponent",
        results => [
          `Identify the base: ${base}.`,
          `Identify the exponent: ${exponent}.`,
          `Raise ${base} to the power of ${exponent}.`,
          `${base}^${exponent} = ${clean(results.result)}.`,
          `Answer: ${clean(results.result)}.`
        ]
      );
    }

    // Force
    if (
      /\bforce\b/i.test(lower) &&
      /mass/i.test(lower) &&
      /acceleration/i.test(lower) &&
      n.length >= 2
    ) {
      const mass = n[0];
      const acceleration = n[1];

      return await call(
        "force",
        {
          solve: "force",
          mass,
          acceleration
        },
        "force",
        results => [
          `Identify the mass: ${mass} kg.`,
          `Identify the acceleration: ${acceleration} m/s².`,
          `Use Newton's second law: force = mass × acceleration.`,
          `Substitute the values: ${mass} × ${acceleration}.`,
          `Answer: ${clean(results.force)} N.`
        ]
      );
    }


    // Ratio
    if (/ratio/i.test(lower) && n.length >= 2) {
      const a = n[0];
      const b = n[1];

      return await call(
        "ratio",
        {
          a,
          b
        },
        "ratio",
        results => [
          `Identify the two quantities: ${a} and ${b}.`,
          `Express their relationship as a ratio: ${a}:${b}.`,
          `Simplify the ratio using the common factor when possible.`,
          `Result: ${JSON.stringify(results)}.`
        ]
      );
    }

    // Kinetic energy
    if (
      /kinetic\s+energy/i.test(lower) &&
      n.length >= 2
    ) {
      const mass = n[0];
      const velocity = n[1];

      return await call(
        "kinetic-energy",
        {
          solve: "energy",
          mass,
          velocity
        },
        "kinetic_energy",
        results => [
          `Identify the mass: ${mass} kg.`,
          `Identify the velocity: ${velocity} m/s.`,
          `Use the kinetic-energy relationship: KE = ½mv².`,
          `Substitute the values: ½ × ${mass} × ${velocity}².`,
          `Answer: ${clean(results.energy)} J.`
        ]
      );
    }

    // Potential energy
    if (
      /potential\s+energy/i.test(lower) &&
      n.length >= 2
    ) {
      const mass = n[0];
      const height = n[1];

      return await call(
        "potential-energy",
        {
          solve: "energy",
          mass,
          height,
          gravity: "9.80665"
        },
        "potential_energy",
        results => [
          `Identify the mass: ${mass} kg.`,
          `Identify the height: ${height} m.`,
          `Use gravitational potential energy: PE = mgh.`,
          `Use gravitational acceleration g = 9.80665 m/s².`,
          `Substitute the values: ${mass} × 9.80665 × ${height}.`,
          `Answer: ${clean(results.energy)} J.`
        ]
      );
    }

    // Density
    if (
      /\bdensity\b/i.test(lower) &&
      n.length >= 2
    ) {
      const mass = n[0];
      const volume = n[1];

      return await call(
        "density",
        {
          solve: "density",
          mass,
          volume
        },
        "density",
        results => [
          `Identify the mass: ${mass}.`,
          `Identify the volume: ${volume}.`,
          `Use density = mass ÷ volume.`,
          `Substitute the values: ${mass} ÷ ${volume}.`,
          `Answer: ${clean(results.density)} g/cm³.`
        ]
      );
    }

    // Molarity
    if (
      /\bmolarity\b/i.test(lower) &&
      n.length >= 2
    ) {
      const mass = n[0];
      const molarMass = n[1];
      const volume = n[2] || 1;

      return await call(
        "molarity",
        {
          solve: "molarity",
          mass,
          molar_mass: molarMass,
          volume,
          volume_unit: "l"
        },
        "molarity",
        results => [
          `Identify the solute mass: ${mass} g.`,
          `Identify the molar mass: ${molarMass} g/mol.`,
          `Identify the solution volume: ${volume} L.`,
          `First calculate moles: mass ÷ molar mass.`,
          `Then calculate molarity: moles ÷ volume.`,
          `Answer: ${clean(results.molarity)} mol/L.`
        ]
      );
    }

    // Molecular weight / molar mass
    if (
      /(?:molecular weight|molar mass)/i.test(lower)
    ) {
      /*
       * Calculator.Free should only receive an actual chemical
       * formula here, not a compound name such as "aspirin".
       *
       * Named compounds are handled by trusted information
       * sources such as PubChem.
       */
      const formulaMatch =
        text.match(
          /\b(?:[A-Z][a-z]?\d*(?:\([A-Za-z0-9]+\)\d*)?){2,}\b/
        );

      if (formulaMatch) {
        const formula = formulaMatch[0];

        return await call(
          "molecular-weight",
          {
            formula
          },
          "molecular_weight",
          results => [
            `Identify the chemical formula: ${formula}.`,
            `Identify the elements and their numbers of atoms.`,
            `Look up the atomic masses of the elements.`,
            `Multiply each atomic mass by the number of atoms and add them.`,
            `Answer: ${clean(results.mass)} g/mol.`
          ]
        );
      }
    }

    // Simple interest
    if (
      /simple\s+interest/i.test(lower) &&
      n.length >= 3
    ) {
      const principal = n[0];
      const rate = n[1];
      const years = n[2];

      return await call(
        "simple-interest",
        {
          principal,
          rate,
          years
        },
        "simple_interest",
        results => [
          `Identify the principal: ${principal}.`,
          `Identify the annual interest rate: ${rate}%.`,
          `Identify the time: ${years} years.`,
          `Use simple interest: I = P × r × t.`,
          `Convert the rate from percent to decimal: ${rate} ÷ 100.`,
          `Calculate the interest.`,
          `Interest: ${clean(results.interest)}.`,
          `Total amount: ${clean(results.total)}.`
        ]
      );
    }

    return null;
  } catch (error) {
    console.error(
      "External Calculator:",
      error.message
    );
    return null;
  }
}

async function solveProblem(question, queryInfo = {}) {
  const text = String(question || "").trim();

  if (!text) {
    return {
      success: false,
      solved: false,
      routed: false,
      error: "No problem supplied."
    };
  }

  /*
   * 1. Dedicated internal specialists first.
   * Working specialists remain the fastest path.
   */
  let specialistResult = null;

  try {
    specialistResult = await solveWithSpecialists(
      text,
      queryInfo
    );
  } catch (error) {
    console.error(
      "Specialist gateway:",
      error.message
    );
  }

  if (
    specialistResult &&
    specialistResult.success === true &&
    specialistResult.solved === true &&
    specialistResult.verified === true
  ) {
    return specialistResult;
  }

  /*
   * 2. External specialist first.
   * Calculator.Free is an external specialist resource.
   * If it cannot handle the problem, continue to the next
   * specialist path without calculating the answer here.
   */
  const externalResult =
    await solveWithExternalCalculator(text);

  if (
    externalResult &&
    externalResult.success === true &&
    externalResult.solved === true &&
    externalResult.verified === true
  ) {
    return externalResult;
  }

  /*
   * 3. Existing universal/internal solver.
   */
  const result = await solveWithUniversalSolver(text);

  if (
    result &&
    result.success === true &&
    result.solved === true &&
    result.verified === true
  ) {
    return {
      success: true,
      solved: true,
      routed: true,
      domain:
        result.domain ||
        result.classification?.domain ||
        "unknown",
      type:
        result.type ||
        result.classification?.type ||
        "general_problem",
      subject:
        result.domain ||
        result.classification?.domain ||
        "unknown",
      solver: result.solver || "general_problem_solver",
      result:
        result.result !== undefined
          ? result.result
          : null,
      expression:
        result.expression !== undefined
          ? result.expression
          : null,
      verified: true,
      steps:
        Array.isArray(result.steps)
          ? result.steps
          : [],
      classification:
        result.classification || {
          domain: result.domain || "unknown",
          type: result.type || "general_problem"
        },
      error: null
    };
  }

  /*
   * 4. Honest failure.
   */
  return {
    success: false,
    solved: false,
    routed: true,
    domain:
      result?.domain ||
      result?.classification?.domain ||
      "unknown",
    type:
      result?.type ||
      result?.classification?.type ||
      "general_problem",
    subject:
      result?.domain ||
      result?.classification?.domain ||
      "unknown",
    solver: result?.solver || "general_problem_solver",
    result:
      result?.result !== undefined
        ? result.result
        : null,
    expression:
      result?.expression !== undefined
        ? result.expression
        : null,
    verified: false,
    steps:
      Array.isArray(result?.steps)
        ? result.steps
        : [],
    classification:
      result?.classification || {
        domain: result?.domain || "unknown",
        type: result?.type || "general_problem"
      },
    error:
      result?.error ||
      "No verified solver could solve this problem."
  };
}

module.exports = {
  solveWithUniversalSolver,
  solveProblem
};
