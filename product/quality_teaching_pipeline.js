const { prepareLevelTeaching } = require("./level_teaching_engine.js");
const { buildTeachingExplanation } = require("./teaching_transformation_engine.js");
const { selectTeaching } = require("./teaching_quality_engine.js");

async function buildQualityTeaching(
  question,
  level = "Junior Secondary",
  method = "step_by_step"
) {
  const result = await prepareLevelTeaching(question, level, method);

  if (!result.success) return result;

  const knowledge = result.teaching_context;

  const transformed = buildTeachingExplanation(
    knowledge,
    level,
    method
  );

  const selected = selectTeaching(
    transformed,
    knowledge
  );

  return {
    success: true,
    concept: knowledge.concept,
    level,
    method,
    teaching: selected.teaching,
    teaching_source: selected.source,
    quality: selected.quality
  };
}

module.exports = { buildQualityTeaching };

if (require.main === module) {
  buildQualityTeaching(
    "What is photosynthesis?",
    "Junior Secondary",
    "step_by_step"
  ).then(result => {
    console.log("=== QUALITY TEACHING PIPELINE TEST ===");
    console.log("Success:", result.success ? "YES" : "NO");
    console.log("Concept:", result.concept);
    console.log("Level:", result.level);
    console.log("Method:", result.method);
    console.log("Teaching source:", result.teaching_source);
    console.log(
      "Quality passed:",
      result.quality.passed ? "YES" : "NO"
    );
    console.log(
      "Quality score:",
      `${result.quality.score}/${result.quality.total_checks}`
    );
    console.log(
      "Teaching available:",
      result.teaching ? "YES" : "NO"
    );
    console.log(
      "Status:",
      result.success && result.teaching
        ? "QUALITY TEACHING PIPELINE READY"
        : "CHECK REQUIRED"
    );
  }).catch(error => {
    console.error("PIPELINE ERROR:", error.message);
  });
}
