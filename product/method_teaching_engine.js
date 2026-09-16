const { prepareForTeaching } = require("./knowledge_teaching_bridge.js");

function teachWithMethod(context) {
  const {
    concept,
    definition,
    key_ideas,
    learning_method
  } = context;

  switch (learning_method) {
    case "explanation":
      return {
        method: "explanation",
        teaching: `${concept} means ${definition}`
      };

    case "examples":
      return {
        method: "examples",
        teaching: `${concept}: ${definition}\n\nLet's understand it through examples:\n${key_ideas.join("\n")}`
      };

    case "step_by_step":
      return {
        method: "step_by_step",
        teaching: [
          `Step 1: Understand the idea — ${definition}`,
          ...key_ideas.map(
            (idea, index) => `Step ${index + 2}: ${idea}`
          )
        ].join("\n")
      };

    case "discussion":
      return {
        method: "discussion",
        teaching: `Let's discuss ${concept}.\n\nStart with this idea: ${definition}\n\nThink about how the key ideas connect:\n${key_ideas.join("\n")}`
      };

    case "problem_solving":
      return {
        method: "problem_solving",
        teaching: `Let's solve a problem involving ${concept}.\n\nFirst understand: ${definition}\n\nUseful ideas:\n${key_ideas.join("\n")}`
      };

    case "auto":
    default:
      return {
        method: "explanation",
        teaching: `${concept} means ${definition}`
      };
  }
}

async function teachQuestion(question, learningMethod = "auto") {
  const result = await prepareForTeaching(
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

  const teaching = teachWithMethod(
    result.teaching_context
  );

  return {
    success: true,
    question,
    concept: result.teaching_context.concept,
    definition: result.teaching_context.definition,
    key_ideas: result.teaching_context.key_ideas,
    method: teaching.method,
    teaching: teaching.teaching,
    source: result.source
  };
}

module.exports = {
  teachWithMethod,
  teachQuestion
};

if (require.main === module) {
  (async () => {
    const result = await teachQuestion(
      "What is photosynthesis?",
      "step_by_step"
    );

    console.log("=== METHOD TEACHING ENGINE TEST ===");
    console.log("Question:", result.question);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      console.log("Concept:", result.concept);
      console.log("Method:", result.method);
      console.log("Teaching generated:", result.teaching ? "YES" : "NO");
      console.log("Source:", result.source.name);
      console.log("\n--- TEACHING ---");
      console.log(result.teaching);
    }

    console.log(
      "\nStatus:",
      result.success
        ? "METHOD TEACHING ENGINE READY"
        : "CHECK REQUIRED"
    );
  })();
}
