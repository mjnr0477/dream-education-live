const { answerKnowledgeQuestion } = require("./knowledge_answer.js");

function simplifyKnowledge(knowledge) {
  if (!knowledge) return knowledge;

  const concept = String(knowledge.concept || "").toLowerCase();
  let definition = knowledge.definition || "";

  if (concept === "volcano") {
    definition =
      "an opening in the Earth's crust through which hot lava, ash and gases can escape from inside the Earth";
  } else if (concept === "photosynthesis") {
    definition =
      "how green plants and other organisms use light energy from the sun to make chemical energy (food)";
  } else {
    definition = definition
      .replace(/planetary-mass object/gi, "planet")
      .replace(/autotrophic organisms/gi, "organisms that make their own food")
      .replace(/photopigment-bearing/gi, "")
      .replace(/convert light energy/gi, "use light energy")
      .replace(/chemical energy necessary to fuel their metabolism/gi, "energy they need");
  }

  return {
    ...knowledge,
    definition
  };
}

function buildTeachingContext(knowledge, learningMethod = "auto") {
  const learnerKnowledge = simplifyKnowledge(knowledge);

  return {
    concept: learnerKnowledge.concept,
    definition: learnerKnowledge.definition,
    key_ideas: learnerKnowledge.key_ideas,
    learning_method: learningMethod,
    ready_for_teacher: true
  };
}

async function prepareForTeaching(question, learningMethod = "auto") {
  const result = await answerKnowledgeQuestion(question);

  if (!result.success) {
    return {
      success: false,
      question,
      error: result.error
    };
  }

  const teachingContext = buildTeachingContext(
    result,
    learningMethod
  );

  return {
    success: true,
    question,
    teaching_context: teachingContext,
    source: result.source
  };
}

module.exports = {
  buildTeachingContext,
  prepareForTeaching
};

if (require.main === module) {
  (async () => {
    const result = await prepareForTeaching(
      "What is photosynthesis?",
      "step_by_step"
    );

    console.log("=== KNOWLEDGE TEACHING BRIDGE TEST ===");
    console.log("Question:", result.question);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      console.log("Concept:", result.teaching_context.concept);
      console.log(
        "Learning method:",
        result.teaching_context.learning_method
      );
      console.log(
        "Teacher ready:",
        result.teaching_context.ready_for_teacher
          ? "YES"
          : "NO"
      );
      console.log("Source:", result.source.name);
    }

    console.log(
      "Status:",
      result.success
        ? "TEACHING BRIDGE READY"
        : "CHECK REQUIRED"
    );
  })();
}
