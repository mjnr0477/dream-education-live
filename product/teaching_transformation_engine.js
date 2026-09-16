function simplifySentence(sentence) {
  return String(sentence || "").trim();
}

function transformKeyIdeas(keyIdeas) {
  return (keyIdeas || [])
    .map(simplifySentence)
    .filter(Boolean);
}

function buildTeachingExplanation(knowledge, level, method) {
  const concept = String(knowledge?.concept || "").trim();
  const definition = simplifySentence(knowledge?.definition);
  const ideas = transformKeyIdeas(knowledge?.key_ideas);

  if (!concept || !definition) {
    return "";
  }

  if (method === "step_by_step") {
    return [
      `Let's understand ${concept} step by step.`,
      "",
      "Step 1: Start with the main idea.",
      definition,
      "",
      ...ideas.map(
        (idea, index) => `Step ${index + 2}: ${idea}`
      ),
      "",
      `Key point: ${concept} is important to understand.`,
      "",
      "Your turn: explain the idea in your own words."
    ].join("\n");
  }

  if (method === "examples") {
    return [
      `Let's understand ${concept} using examples.`,
      "",
      "First, the main idea:",
      definition,
      "",
      "Important ideas:",
      ...ideas.map(
        (idea, index) => `${index + 1}. ${idea}`
      ),
      "",
      "Now think of an example from everyday life."
    ].join("\n");
  }

  if (method === "discussion") {
    return [
      `Let's explore ${concept} together.`,
      "",
      "Main idea:",
      definition,
      "",
      "Think about these points:",
      ...ideas.map(
        (idea, index) => `${index + 1}. ${idea}`
      ),
      "",
      `Question: What do you think would happen if ${concept} stopped?`
    ].join("\n");
  }

  return [
    `Let's learn about ${concept}.`,
    "",
    definition,
    "",
    ...ideas
  ].join("\n");
}

module.exports = {
  simplifySentence,
  transformKeyIdeas,
  buildTeachingExplanation
};

if (require.main === module) {
  const knowledge = {
    concept: "Photosynthesis",
    definition:
      "Photosynthesis is a system of biological processes by which photopigment-bearing autotrophic organisms convert light energy into chemical energy necessary to fuel their metabolism.",
    key_ideas: [
      "Photosynthesis releases oxygen as a byproduct of water splitting.",
      "Photosynthetic organisms store converted chemical energy within organic compounds."
    ]
  };

  const response = buildTeachingExplanation(
    knowledge,
    "Junior Secondary",
    "step_by_step"
  );

  console.log("=== TEACHING TRANSFORMATION TEST ===");
  console.log("Concept:", knowledge.concept);
  console.log("Level:", "Junior Secondary");
  console.log("Method:", "step_by_step");
  console.log(
    "Transformation generated:",
    response ? "YES" : "NO"
  );
  console.log("\n--- TRANSFORMED TEACHING ---");
  console.log(response);
  console.log(
    "\nStatus:",
    response
      ? "TEACHING TRANSFORMATION READY"
      : "CHECK REQUIRED"
  );
}
