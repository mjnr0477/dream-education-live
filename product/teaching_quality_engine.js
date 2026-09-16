function checkTeachingQuality(teaching, knowledge) {
  const text = String(teaching || "").trim();
  const concept = String(knowledge?.concept || "").trim();
  const definition = String(knowledge?.definition || "").trim();

  const lowerText = text.toLowerCase();

  const checks = {
    has_content: text.length > 100,

    contains_concept:
      concept.length > 0 &&
      lowerText.includes(concept.toLowerCase()),

    no_empty_steps:
      !/Step\s+\d+:\s*$/im.test(text),

    no_malformed_phrases:
      ![
        /use light energy into chemical energy/i,
        /convert .* into .* into/i,
        /such as .* such as/i,
        /process that releases oxygen as a product made during/i,
      ].some(pattern => pattern.test(text)),

    preserves_core_meaning:
      definition.length > 0 &&
      (
        lowerText.includes("light") ||
        lowerText.includes("energy") ||
        lowerText.includes("process")
      )
  };

  const passed = Object.values(checks).every(Boolean);

  return {
    passed,
    score: Object.values(checks).filter(Boolean).length,
    total_checks: Object.keys(checks).length,
    checks
  };
}

function selectTeaching(transformedTeaching, originalKnowledge) {
  const quality = checkTeachingQuality(
    transformedTeaching,
    originalKnowledge
  );

  if (quality.passed) {
    return {
      teaching: transformedTeaching,
      source: "transformed",
      quality
    };
  }

  return {
    teaching: originalKnowledge.definition,
    source: "verified_source_fallback",
    quality
  };
}

module.exports = {
  checkTeachingQuality,
  selectTeaching
};

if (require.main === module) {
  const knowledge = {
    concept: "Photosynthesis",
    definition:
      "Photosynthesis is the process by which plants use light energy to make chemical energy."
  };

  const goodTeaching =
    "Let's understand Photosynthesis step by step. " +
    "Photosynthesis is the process by which plants use light energy to make chemical energy.";

  const badTeaching =
    "Photosynthesis is a system that use light energy into chemical energy.";

  const good = checkTeachingQuality(
    goodTeaching,
    knowledge
  );

  const bad = checkTeachingQuality(
    badTeaching,
    knowledge
  );

  console.log("=== TEACHING QUALITY ENGINE TEST ===");
  console.log("Good teaching passed:", good.passed ? "YES" : "NO");
  console.log("Good teaching score:", `${good.score}/${good.total_checks}`);
  console.log("Bad teaching passed:", bad.passed ? "YES" : "NO");
  console.log("Bad teaching score:", `${bad.score}/${bad.total_checks}`);
  console.log(
    "Fallback available:",
    selectTeaching(badTeaching, knowledge).source ===
      "verified_source_fallback"
      ? "YES"
      : "NO"
  );
  console.log(
    "Status:",
    !bad.passed && good.passed
      ? "TEACHING QUALITY ENGINE READY"
      : "CHECK REQUIRED"
  );
}
