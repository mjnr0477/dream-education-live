const {
  prepareLevelTeaching
} = require("./level_teaching_engine.js");

function generateTeachingResponse(context) {
  const {
    concept,
    definition,
    key_ideas,
    learner_level,
    learning_method
  } = context;

  if (learning_method === "step_by_step") {
    return [
      `Let's learn ${concept} step by step.`,
      "",
      `Step 1: Understand the main idea.`,
      definition,
      "",
      ...key_ideas.map(
        (idea, index) => `Step ${index + 2}: ${idea}`
      ),
      "",
      `Now explain ${concept} in your own words to check your understanding.`
    ].join("\n");
  }

  if (learning_method === "examples") {
    return [
      `Let's understand ${concept} through examples.`,
      "",
      definition,
      "",
      "Here are some important ideas to connect:",
      ...key_ideas.map(
        (idea, index) => `${index + 1}. ${idea}`
      ),
      "",
      "Try to give one example of your own."
    ].join("\n");
  }

  if (learning_method === "discussion") {
    return [
      `Let's discuss ${concept}.`,
      "",
      "First, understand this:",
      definition,
      "",
      "Think about these ideas:",
      ...key_ideas.map(
        (idea, index) => `${index + 1}. ${idea}`
      ),
      "",
      `What do you think ${concept} means in your own words?`
    ].join("\n");
  }

  if (learning_method === "problem_solving") {
    return [
      `Let's learn ${concept} by solving a problem.`,
      "",
      `First, remember: ${definition}`,
      "",
      "Useful ideas:",
      ...key_ideas.map(
        (idea, index) => `${index + 1}. ${idea}`
      ),
      "",
      `Now let's use these ideas to solve a problem about ${concept}.`
    ].join("\n");
  }

  return [
    `Let's learn about ${concept}.`,
    "",
    definition,
    "",
    ...key_ideas
  ].join("\n");
}

async function teachLearner(
  question,
  level = "Junior Secondary",
  learningMethod = "auto"
) {
  const result = await prepareLevelTeaching(
    question,
    level,
    learningMethod
  );

  if (!result.success) {
    return {
      success: false,
      question,
      error: result.error
    };
  }

  const response = generateTeachingResponse(
    result.teaching_context
  );

  return {
    success: true,
    question,
    learner_level: level,
    learning_method: learningMethod,
    response,
    source: result.teaching_context.source
  };
}

module.exports = {
  generateTeachingResponse,
  teachLearner
};

if (require.main === module) {
  (async () => {
    const result = await teachLearner(
      "What is photosynthesis?",
      "Junior Secondary",
      "step_by_step"
    );

    console.log("=== DREAM TEACHER ENGINE TEST ===");
    console.log("Question:", result.question);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      console.log("Learner level:", result.learner_level);
      console.log("Learning method:", result.learning_method);
      console.log("Response generated:", result.response ? "YES" : "NO");
      console.log("Source:", result.source.name);
      console.log("\n--- DREAM TEACHER RESPONSE ---");
      console.log(result.response);
    }

    console.log(
      "\nStatus:",
      result.success
        ? "DREAM TEACHER ENGINE READY"
        : "CHECK REQUIRED"
    );
  })();
}
