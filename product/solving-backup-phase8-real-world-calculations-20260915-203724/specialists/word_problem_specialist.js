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

  // ------------------------------------------------------------
  // SPEED = DISTANCE / TIME
  // Supports:
  // "A car travels 120 km in 2 hours. What is its speed?"
  // "distance 120 km and time 2 hours"
  // ------------------------------------------------------------
  if (
    /speed/.test(l) ||
    /travels?\s+\d+(?:\.\d+)?\s*(?:km|m|miles?)\s+in\s+\d+(?:\.\d+)?\s*(?:hours?|minutes?|seconds?)/.test(l)
  ) {
    let distance = null;
    let time = null;

    const travelMatch = l.match(
      /travels?\s+(\d+(?:\.\d+)?)\s*(km|m|miles?)\s+in\s+(\d+(?:\.\d+)?)\s*(hours?|minutes?|seconds?)/
    );

    if (travelMatch) {
      distance = Number(travelMatch[1]);
      time = Number(travelMatch[3]);
    } else {
      const distanceMatch = l.match(
        /distance[^0-9]*([0-9.]+)/
      );
      const timeMatch = l.match(
        /time[^0-9]*([0-9.]+)/
      );

      distance = distanceMatch ? Number(distanceMatch[1]) : null;
      time = timeMatch ? Number(timeMatch[1]) : null;
    }

    if (distance !== null && time !== null && time !== 0) {
      const result = distance / time;

      return finish(
        "speed_distance_time",
        "deterministic_word_problem",
        result,
        q,
        [
          `Distance = ${distance}`,
          `Time = ${time}`,
          "Use speed = distance / time.",
          `Speed = ${distance} / ${time}`,
          `Speed = ${result}`
        ],
        () => distance / time
      );
    }
  }

  // ------------------------------------------------------------
  // PERCENTAGE INCREASE / DECREASE
  // Supports:
  // "A price increases from 200 to 250."
  // "A value decreases from 250 to 200."
  // ------------------------------------------------------------
  const changeMatch = l.match(
    /(?:increases?|decreases?)\s+from\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/
  );

  if (changeMatch) {
    const original = Number(changeMatch[1]);
    const finalValue = Number(changeMatch[2]);

    if (original !== 0) {
      const result =
        Math.abs(finalValue - original) / original * 100;

      const direction =
        finalValue >= original ? "increase" : "decrease";

      return finish(
        "percentage_change_word_problem",
        "deterministic_word_problem",
        result,
        q,
        [
          `Original value = ${original}`,
          `Final value = ${finalValue}`,
          `Change = ${Math.abs(finalValue - original)}`,
          `Percentage ${direction} = change / original × 100`,
          `Percentage ${direction} = ${result}%`
        ],
        () =>
          Math.abs(finalValue - original) / original * 100
      );
    }
  }

  // Existing explicit percentage/discount form
  if (
    /percentage|percent/.test(l) &&
    /increase|increases|decrease|decreases|discount/.test(l)
  ) {
    const amountMatch = l.match(
      /(?:amount|price|cost|value)[^0-9]*([0-9.]+)/
    );

    const percentMatch = l.match(
      /([0-9.]+)\s*(?:%|percent)/
    );

    const amount = amountMatch ? Number(amountMatch[1]) : null;
    const percent = percentMatch ? Number(percentMatch[1]) : null;

    if (amount !== null && percent !== null) {
      const decrease =
        /discount|decrease/.test(l);

      const result = decrease
        ? amount * (1 - percent / 100)
        : amount * (1 + percent / 100);

      return finish(
        "percentage_change_word_problem",
        "deterministic_word_problem",
        result,
        q,
        [
          `Original amount = ${amount}`,
          `Percentage = ${percent}%`,
          decrease
            ? "Apply the percentage decrease."
            : "Apply the percentage increase.",
          `Final value = ${result}`
        ],
        () =>
          decrease
            ? amount * (1 - percent / 100)
            : amount * (1 + percent / 100)
      );
    }
  }

  // ------------------------------------------------------------
  // PROFIT = SELLING PRICE - COST PRICE
  // Supports:
  // "A shop buys an item for 500 and sells it for 650."
  // Existing "bought ... sold ..." form also retained.
  // ------------------------------------------------------------
  const buySellMatch = l.match(
    /buys?\s+(?:an\s+)?item\s+for\s+(\d+(?:\.\d+)?)\s+and\s+sells?\s+it\s+for\s+(\d+(?:\.\d+)?)/
  );

  if (buySellMatch) {
    const cost = Number(buySellMatch[1]);
    const selling = Number(buySellMatch[2]);
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

  if (
    /bought/.test(l) &&
    /sold/.test(l)
  ) {
    const costMatch = l.match(
      /bought[^0-9]*([0-9.]+)/
    );

    const sellingMatch = l.match(
      /sold[^0-9]*([0-9.]+)/
    );

    const cost = costMatch ? Number(costMatch[1]) : null;
    const selling = sellingMatch ? Number(sellingMatch[1]) : null;

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
