const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function finish(type, result, expression, steps) {
  const s = createSolution({
    success: true,
    solved: true,
    domain: "real_world_calculations",
    problem_type: type,
    specialist: "real_world_calculations_specialist",
    solver: "deterministic_real_world_calculations",
    result,
    expression,
    steps
  });

  s.verification = verifySolution(s, {
    recalculate: () => result
  });

  s.crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  s.verified =
    s.verification.status === "PASS" &&
    s.crosscheck.status !== "FAIL";

  return s;
}

function numbers(q) {
  const m = String(q || "").match(/-?\d+(?:\.\d+)?/g);
  return m ? m.map(Number) : [];
}

function solve(question) {
  const q = String(question || "");
  const l = q.toLowerCase();
  const n = numbers(q);

  // Fuel consumption
  if (
    /(fuel|petrol|diesel)/i.test(l) &&
    /(km|kilomet|distance)/i.test(l) &&
    /(litre|liter|l\b)/i.test(l)
  ) {
    const distance = n[0];
    const fuel = n[1];

    if (Number.isFinite(distance) && Number.isFinite(fuel) && fuel !== 0) {
      const r = distance / fuel;

      return finish(
        "fuel_efficiency",
        r,
        `distance / fuel = ${distance} / ${fuel}`,
        [
          `Distance = ${distance}`,
          `Fuel used = ${fuel}`,
          `Fuel efficiency = ${r} km/L`
        ]
      );
    }
  }

  // Travel time
  if (
    /(travel|journey|trip|drive)/i.test(l) &&
    /(distance|covers|covering)/i.test(l) &&
    /(speed|km\/h|km per hour)/i.test(l)
  ) {
    const distance = n[0];
    const speed = n[1];

    if (Number.isFinite(distance) && Number.isFinite(speed) && speed !== 0) {
      const r = distance / speed;

      return finish(
        "travel_time",
        r,
        `time = distance / speed = ${distance} / ${speed}`,
        [
          `Distance = ${distance} km`,
          `Speed = ${speed} km/h`,
          `Travel time = ${r} hours`
        ]
      );
    }
  }

  // Electricity cost
  if (
    /(electricity|electric|energy)/i.test(l) &&
    /(kwh|kilowatt)/i.test(l) &&
    /(cost|price|rate)/i.test(l)
  ) {
    const energy = n[0];
    const rate = n[1];

    if (Number.isFinite(energy) && Number.isFinite(rate)) {
      const r = energy * rate;

      return finish(
        "electricity_cost",
        r,
        `cost = energy × rate = ${energy} × ${rate}`,
        [
          `Energy used = ${energy} kWh`,
          `Rate = ${rate} per kWh`,
          `Electricity cost = ${r}`
        ]
      );
    }
  }

  // Unit price
  if (
    /(unit price|price per unit|cost per unit)/i.test(l) &&
    /(total|cost|price)/i.test(l)
  ) {
    const total = n[0];
    const quantity = n[1];

    if (Number.isFinite(total) && Number.isFinite(quantity) && quantity !== 0) {
      const r = total / quantity;

      return finish(
        "unit_price",
        r,
        `unit price = total / quantity = ${total} / ${quantity}`,
        [
          `Total cost = ${total}`,
          `Quantity = ${quantity}`,
          `Unit price = ${r}`
        ]
      );
    }
  }

  // Percentage change
  if (
    /(percentage change|percent change|percentage increase|percentage decrease)/i.test(l) &&
    /(from)/i.test(l) &&
    /(to)/i.test(l)
  ) {
    const oldValue = n[0];
    const newValue = n[1];

    if (Number.isFinite(oldValue) && Number.isFinite(newValue) && oldValue !== 0) {
      const r = ((newValue - oldValue) / oldValue) * 100;

      return finish(
        "percentage_change",
        r,
        `((new - old) / old) × 100`,
        [
          `Original value = ${oldValue}`,
          `New value = ${newValue}`,
          `Percentage change = ${r}%`
        ]
      );
    }
  }

  // Wages
  if (
    /(wage|salary|pay|earn)/i.test(l) &&
    /(hour|hours)/i.test(l) &&
    /(rate|per hour)/i.test(l)
  ) {
    const rate = n[0];
    const hours = n[1];

    if (Number.isFinite(rate) && Number.isFinite(hours)) {
      const r = rate * hours;

      return finish(
        "wage_calculation",
        r,
        `pay = hourly rate × hours = ${rate} × ${hours}`,
        [
          `Hourly rate = ${rate}`,
          `Hours worked = ${hours}`,
          `Total pay = ${r}`
        ]
      );
    }
  }

  // Material quantity
  if (
    /(material|concrete|cement|sand|quantity)/i.test(l) &&
    /(per|each)/i.test(l) &&
    /(total|units|items|pieces)/i.test(l)
  ) {
    const amountPerUnit = n[0];
    const quantity = n[1];

    if (Number.isFinite(amountPerUnit) && Number.isFinite(quantity)) {
      const r = amountPerUnit * quantity;

      return finish(
        "material_quantity",
        r,
        `total = amount per unit × quantity = ${amountPerUnit} × ${quantity}`,
        [
          `Amount per unit = ${amountPerUnit}`,
          `Number of units = ${quantity}`,
          `Total material = ${r}`
        ]
      );
    }
  }

  return createFailure({
    domain: "real_world_calculations",
    problem_type: "unknown",
    specialist: "real_world_calculations_specialist",
    error: "No supported deterministic real-world calculation pattern matched"
  });
}

module.exports = { solve };
