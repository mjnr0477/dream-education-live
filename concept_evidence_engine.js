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
    reasoningQuality: "insufficient",
    score: 0,
    strengths: "",
    gaps: "",
    misconceptions: "",
    feedback: ""
  };

  // =========================
  // FACTOR / INPUT
  // =========================

  const waterIsRelevant = (
    a.includes("water") &&
    !(
      a.includes("enough water") ||
      a.includes("sufficient water") ||
      a.includes("adequate water") ||
      a.includes("enough sunlight and water") ||
      a.includes("enough light and water") ||
      a.includes("water is sufficient") ||
      a.includes("water is adequate") ||
      a.includes("water is not limiting")
    )
  );

  const carbonIsRelevant = (
    a.includes("carbon dioxide") ||
    a.includes("co2")
  );

  const lightIsRelevant = (
    (a.includes("sunlight") || a.includes("light")) &&
    !(
      a.includes("enough sunlight") ||
      a.includes("sufficient sunlight") ||
      a.includes("adequate sunlight") ||
      a.includes("enough light") ||
      a.includes("sufficient light") ||
      a.includes("adequate light") ||
      a.includes("light is sufficient") ||
      a.includes("light is adequate") ||
      a.includes("light is not limiting")
    )
  );

  if (waterIsRelevant) {
    result.factor = "water";
    result.evidence.push("factor");
  } else if (carbonIsRelevant) {
    result.factor = "carbon dioxide";
    result.evidence.push("factor");
  } else if (lightIsRelevant) {
    result.factor = "light";
    result.evidence.push("factor");
  }

  // =========================
  // PROCESS / EFFECT
  // =========================

  const processSignals = [
    "reduce photosynthesis",
    "reduces photosynthesis",
    "reduced photosynthesis",
    "less photosynthesis",
    "lower photosynthesis",
    "lower the rate of photosynthesis",
    "lower rate of photosynthesis",
    "reduce the rate of photosynthesis",
    "reduces the rate of photosynthesis",
    "photosynthesis decreases",
    "photosynthesis decrease",
    "photosynthesis is reduced",
    "photosynthesis would be reduced",
    "photosynthesis would decrease",
    "photosynthesis slows",
    "slows photosynthesis",
    "photosynthesis will decrease",
    "photosynthesis will be lower"
  ];

  if (processSignals.some(signal => a.includes(signal))) {
    result.process = "reduced photosynthesis";
    result.evidence.push("process");
  }

  // =========================
  // OUTCOME
  // =========================

  const outcomeSignals = [
    "less food",
    "make less food",
    "makes less food",
    "produce less food",
    "produces less food",
    "will produce less food",
    "will not make enough food",
    "not make enough food",
    "does not make enough food",
    "not enough food",
    "food production",
    "food production decreases",
    "food production will decrease",
    "food production is reduced",
    "reduced food production",
    "less glucose",
    "produce less glucose",
    "produces less glucose",
    "less sugar",
    "produce less sugar",
    "produces less sugar"
  ];

  if (outcomeSignals.some(signal => a.includes(signal))) {
    result.outcome = "reduced food production";
    result.evidence.push("outcome");
  }

  result.completeness = result.evidence.length / 3;

  // =========================
  // EXPECTED FACTOR
  // =========================

  const limitingWaterSignals = [
    "not getting enough water",
    "not get enough water",
    "not enough water",
    "very little water",
    "little water",
    "lack of water",
    "limited water",
    "water is limited",
    "water shortage",
    "without enough water",
    "without water"
  ];

  const limitingCarbonSignals = [
    "very little carbon dioxide",
    "little carbon dioxide",
    "not enough carbon dioxide",
    "not getting enough carbon dioxide",
    "limited carbon dioxide",
    "carbon dioxide is limited",
    "low carbon dioxide",
    "low co2",
    "lack of carbon dioxide",
    "lack of co2"
  ];

  const limitingLightSignals = [
    "not enough sunlight",
    "not getting enough sunlight",
    "very little sunlight",
    "little sunlight",
    "lack of sunlight",
    "limited sunlight",
    "not enough light",
    "not getting enough light",
    "very little light",
    "little light",
    "lack of light",
    "limited light"
  ];

  if (
    limitingWaterSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "water";

  } else if (
    limitingCarbonSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "carbon dioxide";

  } else if (
    limitingLightSignals.some(signal => q.includes(signal))
  ) {
    result.factorCorrect =
      result.factor === "light";

  } else if (
    q.includes("carbon dioxide") ||
    q.includes("co2")
  ) {
    result.factorCorrect =
      result.factor === "carbon dioxide";

  } else if (
    q.includes("water")
  ) {
    result.factorCorrect =
      result.factor === "water";

  } else if (
    q.includes("sunlight") ||
    q.includes("light")
  ) {
    result.factorCorrect =
      result.factor === "light";
  }

  // =========================
  // PROCESS + OUTCOME
  // =========================

  result.processCorrect =
    result.process === "reduced photosynthesis";

  result.outcomePresent =
    result.outcome === "reduced food production";

  // =========================
  // REASONING QUALITY
  // =========================

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

  // =========================
  // SCORING
  // =========================

  if (result.reasoningQuality === "strong") {
    result.score = 100;

  } else if (result.reasoningQuality === "partial") {
    result.score = 70;

  } else if (result.reasoningQuality === "basic") {
    result.score = 45;

  } else if (result.reasoningQuality === "misconception") {
    result.score = 20;

  } else {
    result.score = 0;
  }

  // =========================
  // STRENGTHS
  // =========================

  if (result.reasoningQuality === "strong") {
    result.strengths =
      "The learner correctly identified the relevant factor and connected it to the effect on photosynthesis and food production.";

  } else if (result.reasoningQuality === "partial") {
    result.strengths =
      "The learner identified the relevant factor and demonstrated part of the expected reasoning.";

  } else if (result.reasoningQuality === "basic") {
    result.strengths =
      "The learner identified the relevant factor in the situation.";

  } else if (result.reasoningQuality === "misconception") {
    result.strengths =
      "The learner recognized that a photosynthesis factor can affect the process.";

  } else {
    result.strengths =
      "The learner attempted to apply knowledge to the situation.";
  }

  // =========================
  // GAPS
  // =========================

  if (result.reasoningQuality === "strong") {
    result.gaps =
      "No major knowledge gap detected.";

  } else if (result.reasoningQuality === "partial") {
    result.gaps =
      "The learner needs to make a clearer connection between the factor, photosynthesis, and the resulting food production.";

  } else if (result.reasoningQuality === "basic") {
    result.gaps =
      "The learner needs to explain how the factor changes photosynthesis and affects food production.";

  } else if (result.reasoningQuality === "misconception") {
    result.gaps =
      "The learner identified the wrong factor and needs to distinguish the relevant limiting factor in this situation.";

  } else {
    result.gaps =
      "The learner needs to identify the relevant factor and explain its effect on photosynthesis and food production.";
  }

  // =========================
  // MISCONCEPTIONS
  // =========================

  if (result.reasoningQuality === "misconception") {
    result.misconceptions =
      `The learner identified ${result.factor} as the relevant factor, but the question indicates that the important factor is ${result.factorCorrect === false ? "different" : "the expected factor"}.`;
  } else {
    result.misconceptions =
      "No clear misconception detected.";
  }

  // =========================
  // FEEDBACK
  // =========================

  if (result.reasoningQuality === "strong") {
    result.feedback =
      "Excellent. You correctly connected the relevant factor with its effect on photosynthesis and food production.";

  } else if (result.reasoningQuality === "partial") {
    result.feedback =
      "Good start. You identified the important factor, but your explanation needs a clearer connection between that factor, photosynthesis, and food production.";

  } else if (result.reasoningQuality === "basic") {
    result.feedback =
      "You identified an important factor. Now explain how changing that factor affects photosynthesis and the food the plant produces.";

  } else if (result.reasoningQuality === "misconception") {
    result.feedback =
      "There is an important idea to correct. You identified a factor that can affect photosynthesis, but it is not the main factor described in this question. Let's examine the situation carefully.";

  } else {
    result.feedback =
      "You have started thinking about the situation. Identify the relevant factor and explain how it affects photosynthesis and food production.";
  }

  return result;
}

module.exports = {
  analyzeConceptEvidence
};
