"use strict";

const { createSolution, createFailure } =
  require("./specialist_contract.js");
const { verifySolution } =
  require("../verifier/independent_verifier.js");
const { crossCheck } =
  require("../crosscheck/crosscheck_engine.js");

function numberAfter(pattern, text) {
  const m = text.match(pattern);
  return m ? Number(m[1]) : null;
}

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
    domain: "word_problems",
    problem_type,
    specialist: "word_problem_specialist",
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
    (
      /speed/.test(l) ||
      (/travels?\s+\d+(?:\.\d+)?\s*(?:km|m|miles?)\s+in\s+\d+(?:\.\d+)?\s*(?:hours?|minutes?|seconds?)/.test(l))
    ) &&
    (
      /distance/.test(l) ||
      /travels?\s+\d+(?:\.\d+)?\s*(?:km|m|miles?)/.test(l)
    ) &&
    /time/.test(l)
  ) {
    const distance = numberAfter(/distance[^0-9]*([0-9.]+)/i, l);
    const time = numberAfter(/time[^0-9]*([0-9.]+)/i, l);

    if (distance !== null && time !== null && time !== 0) {
      const result = distance / time;

      return finish(
        "speed_distance_time",
        "deterministic_word_problem",
        result,
        q,
        [
          "Identify distance and time.",
          "Use speed = distance / time.",
          `Speed = ${distance} / ${time}`,
          `Speed = ${result}`
        ],
        () => distance / time
      );
    }
  }

  if (
    (
      /percentage|percent/.test(l) ||
      /increases?\s+from\s+\d+(?:\.\d+)?\s+to\s+\d+(?:\.\d+)?/.test(l) ||
      /decreases?\s+from\s+\d+(?:\.\d+)?\s+to\s+\d+(?:\.\d+)?/.test(l)
    ) &&
    /increase|increases|decrease|decreases|discount/.test(l)
  ) {
    const amount = numberAfter(
      /(?:amount|price|cost|value)[^0-9]*([0-9.]+)/i,
      l
    );
    const percent = numberAfter(
      /([0-9.]+)\s*(?:%|percent)/i,
      l
    );

    if (amount !== null && percent !== null) {
      let result;

      if (/discount|decrease/.test(l)) {
        result = amount * (1 - percent / 100);
      } else {
        result = amount * (1 + percent / 100);
      }

      return finish(
        "percentage_change_word_problem",
        "deterministic_word_problem",
        result,
        q,
        [
          `Original amount = ${amount}`,
          `Percentage = ${percent}%`,
          /discount|decrease/.test(l)
            ? "Apply the percentage decrease."
            : "Apply the percentage increase.",
          `Final value = ${result}`
        ],
        () =>
          /discount|decrease/.test(l)
            ? amount * (1 - percent / 100)
            : amount * (1 + percent / 100)
      );
    }
  }

  if (
    /bought/.test(l) &&
    /sold/.test(l) &&
    (
      /profit/.test(l) ||
      /buys?\s+(?:an\s+)?item\s+for\s+\d+(?:\.\d+)?\s+and\s+sells?\s+it\s+for\s+\d+(?:\.\d+)?/.test(l)
    )
  ) {
    const cost = numberAfter(
      /bought[^0-9]*([0-9.]+)/i,
      l
    );
    const selling = numberAfter(
      /sold[^0-9]*([0-9.]+)/i,
      l
    );

    if (cost !== null && selling !== null) {
      const result = selling - cost;

      return finish(
        "profit_word_problem",
        "deterministic_word_problem",
        result,
        q,
        [
          `Cost price = ${cost}`,
          `Selling price = ${selling}`,
          "Profit = selling price - cost price.",
          `Profit = ${result}`
        ],
        () => selling - cost
      );
    }
  }

  return createFailure({
    domain: "word_problems",
    problem_type: "unknown",
    specialist: "word_problem_specialist",
    error: "No supported deterministic word-problem pattern matched"
  });
}

module.exports = { solve };
