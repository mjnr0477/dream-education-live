const { teachQuestion } = require("./method_teaching_engine.js");

const LEVELS = {
  "Pre-Primary": {
    depth: "very_simple",
    language: "very simple",
    use_examples: true
  },
  "Primary": {
    depth: "simple",
    language: "simple",
    use_examples: true
  },
  "Junior Secondary": {
    depth: "moderate",
    language: "clear",
    use_examples: true
  },
  "Senior Secondary": {
    depth: "advanced_school",
    language: "clear and precise",
    use_examples: true
  },
  "Tertiary": {
    depth: "academic",
    language: "academic but clear",
    use_examples: true
  },
  "Postgraduate": {
    depth: "advanced",
    language: "technical and precise",
    use_examples: true
  }
};

function getLevelProfile(level) {
  return LEVELS[level] || LEVELS["Junior Secondary"];
}

function buildLevelTeachingContext(result, level) {
  const profile = getLevelProfile(level);

  return {
    concept: result.concept,
    definition: result.definition,
    key_ideas: result.key_ideas,
    learning_method: result.method,
    learner_level: level,
    teaching_depth: profile.depth,
    language_level: profile.language,
    use_examples: profile.use_examples,
    instructions: [
      `Teach at ${level} level.`,
      `Use ${profile.language} language.`,
      `Keep the explanation at ${profile.depth} depth.`,
      "Do not copy source wording unnecessarily.",
      "Focus on learner understanding."
    ],
    source: result.source,
    ready_for_teacher: true
  };
}

async function prepareLevelTeaching(
  question,
  level = "Junior Secondary",
  learningMethod = "auto"
) {
  const result = await teachQuestion(
    question,
    learningMethod
  );

  if (!result.success) {
    return {
      success: false,
      question,
      error: result.error
    };
  }

  return {
    success: true,
    question,
    teaching_context: buildLevelTeachingContext(
      result,
      level
    )
  };
}

module.exports = {
  getLevelProfile,
  buildLevelTeachingContext,
  prepareLevelTeaching
};

if (require.main === module) {
  (async () => {
    const result = await prepareLevelTeaching(
      "What is photosynthesis?",
      "Junior Secondary",
      "step_by_step"
    );

    console.log("=== LEVEL TEACHING ENGINE TEST ===");
    console.log("Question:", result.question);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      const c = result.teaching_context;

      console.log("Concept:", c.concept);
      console.log("Learner level:", c.learner_level);
      console.log("Teaching depth:", c.teaching_depth);
      console.log("Language level:", c.language_level);
      console.log("Learning method:", c.learning_method);
      console.log("Teacher ready:", c.ready_for_teacher ? "YES" : "NO");
    }

    console.log(
      "Status:",
      result.success
        ? "LEVEL TEACHING ENGINE READY"
        : "CHECK REQUIRED"
    );
  })();
}
