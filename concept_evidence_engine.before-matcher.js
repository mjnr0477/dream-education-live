function analyzeConceptEvidence(question, answer, context = {}) {
  const q = String(question || "").toLowerCase();
  const a = String(answer || "").toLowerCase();

  const result = {
    factor: null,
    process: null,
    outcome: null,
    evidence: [],
    completeness: 0
  };

  // FACTOR / INPUT
  if (a.includes("water")) {
    result.factor = "water";
    result.evidence.push("factor");
  } else if (a.includes("carbon dioxide") || a.includes("co2")) {
    result.factor = "carbon dioxide";
    result.evidence.push("factor");
  } else if (a.includes("sunlight") || a.includes("light")) {
    result.factor = "light";
    result.evidence.push("factor");
  }

  // PROCESS / EFFECT
  if (
    a.includes("reduce photosynthesis") ||
    a.includes("reduces photosynthesis") ||
    a.includes("reduced photosynthesis") ||
    a.includes("reduce the rate of photosynthesis") ||
    a.includes("reduces the rate of photosynthesis") ||
    a.includes("less photosynthesis") ||
    a.includes("photosynthesis decreases") ||
    a.includes("photosynthesis would decrease") ||
    a.includes("photosynthesis slows")
  ) {
    result.process = "reduced photosynthesis";
    result.evidence.push("process");
  }

  // OUTCOME
  if (
    a.includes("less food") ||
    a.includes("produce less food") ||
    a.includes("produces less food") ||
    a.includes("food production") ||
    a.includes("glucose") ||
    a.includes("sugar")
  ) {
    result.outcome = "reduced food production";
    result.evidence.push("outcome");
  }

  result.completeness = result.evidence.length / 3;

  return result;
}

module.exports = {
  analyzeConceptEvidence
};
