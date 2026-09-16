const { retrieveKnowledge } = require("./knowledge_retrieval.js");

async function answerKnowledgeQuestion(question, options = {}) {
  const result = await retrieveKnowledge(question, options);

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
    concept: result.knowledge.concept,
    definition: result.knowledge.definition,
    key_ideas: result.knowledge.key_ideas,
    source: result.source,
    ready_for_teaching: true
  };
}

module.exports = {
  answerKnowledgeQuestion
};

if (require.main === module) {
  (async () => {
    const result = await answerKnowledgeQuestion(
      "What is photosynthesis?"
    );

    console.log("=== KNOWLEDGE ANSWER TEST ===");
    console.log("Question:", result.question);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      console.log("Concept:", result.concept);
      console.log("Definition available:", result.definition ? "YES" : "NO");
      console.log("Key ideas:", result.key_ideas.length);
      console.log("Ready for teaching:", result.ready_for_teaching ? "YES" : "NO");
      console.log("Source:", result.source.name);
    }

    console.log(
      "Status:",
      result.success
        ? "KNOWLEDGE ANSWER READY"
        : "CHECK REQUIRED"
    );
  })();
}
