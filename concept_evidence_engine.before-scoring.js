function analyzeConceptEvidence(question, answer, context = {}) {
  const q = String(question || "").toLowerCase();
  const a = String(answer || "").toLowerCase();

  const result = {
    factor: null,
    process: null,
    outcome: null,
    evidence: [],
    completeness: 0,
    factorCorrect: null,
    processCorrect: null,
    outcomePresent: null,
    reasoningQuality: "insufficient"
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
    a.includes("lower photosynthesis") ||
    a.includes("lower the rate of photosynthesis") ||
    a.includes("photosynthesis decreases") ||
    a.includes("photosynthesis decrease") ||
    a.includes("photosynthesis is reduced") ||
    a.includes("photosynthesis would be reduced") ||
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

  // EXPECTED FACTOR FROM THE QUESTION
  if (
    q.includes("carbon dioxide") ||
    q.includes("co2")
  ) {
    result.factorCorrect = result.factor === "carbon dioxide";
  } else if (
    q.includes("water")
  ) {
    result.factorCorrect = result.factor === "water";
  } else if (
    q.includes("sunlight") ||
    q.includes("light")
  ) {
    result.factorCorrect = result.factor === "light";
  }

  // EXPECTED PROCESS
  result.processCorrect =
    result.process === "reduced photosynthesis";

  result.outcomePresent =
    result.outcome === "reduced food production";

  // REASONING QUALITY
  if (
    result.factorCorrect === true &&
    result.processCorrect === true &&
    result.outcomePresent === true
  ) {
    result.reasoningQuality = "strong";
  } else if (
    result.factorCorrect === true &&
    (
      result.processCorrect === true ||
      result.outcomePresent === true
    )
  ) {
    result.reasoningQuality = "partial";
  } else if (
    result.factorCorrect === true
  ) {
    result.reasoningQuality = "basic";
  } else if (
    result.factorCorrect === false &&
    result.factor !== null
  ) {
    result.reasoningQuality = "misconception";
  }

  return result;
}

module.exports = {
  analyzeConceptEvidence
};
