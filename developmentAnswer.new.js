function developmentAnswer(
  question,
  subject,
  level,
  adaptiveContext = {}
) {
  const {
    teaching_move = null,
    teaching_target = null,
    teaching_explanation = null,
    difficulty = null,
    topic = null,
    decision_topic = null
  } = adaptiveContext;

  const lessonTopic = topic || decision_topic || subject || "this topic";
  const target = teaching_target || lessonTopic;
  const move = teaching_move || "foundation";
  const difficultyLevel = difficulty || "foundation";

  let response = "";

  if (move === "correct_misconception") {
    response =
      `Let's correct one important idea about ${lessonTopic}.\n\n` +
      `${teaching_explanation || `There is an idea about ${target} that we need to examine carefully.`}\n\n` +
      `The key point is to separate what actually happens from the incorrect idea. ` +
      `Focus on ${target} and explain why it affects the situation.\n\n` +
      `Question: "${question}"\n\n` +
      `Take your time. Explain the correct idea in your own words.`;

  } else if (move === "teach_factor") {
    response =
      `Let's start with what matters most.\n\n` +
      `In ${lessonTopic}, an important part of understanding the situation is identifying the factor that changes. ` +
      `Here, focus on ${target}.\n\n` +
      `For example, when one condition changes while the others stay suitable, that changing condition can affect what happens next.\n\n` +
      `Question: "${question}"\n\n` +
      `What is the important factor here, and why does it matter?`;

  } else if (move === "teach_process") {
    response =
      `Now let's connect the pieces and understand how ${lessonTopic} works.\n\n` +
      `Knowing the factor is only the beginning. We also need to understand the process that connects that factor to the result.\n\n` +
      `Think step by step: what changes first, what happens because of that change, and how does that lead to the result?\n\n` +
      `Question: "${question}"\n\n` +
      `Explain the process in your own words.`;

  } else if (move === "teach_outcome") {
    response =
      `You've reached the part where we connect the process to its result.\n\n` +
      `When the important condition changes, the process can also change. The next step is to explain what that change means for the final outcome.\n\n` +
      `Question: "${question}"\n\n` +
      `What would you expect to happen, and what is your reason?`;

  } else if (
    move === "develop_reasoning" ||
    move === "build_reasoning"
  ) {
    response =
      `Let's strengthen your reasoning about ${lessonTopic}.\n\n` +
      `A strong explanation should connect the important factor to what happens during the process and then to the result.\n\n` +
      `Think of it as a chain: factor → process → outcome.\n\n` +
      `Question: "${question}"\n\n` +
      `Try to explain the whole chain rather than giving only the final answer.`;

  } else if (move === "consolidate_recovery") {
    response =
      `Good. Let's make sure the corrected idea is becoming solid.\n\n` +
      `The goal now is not simply to remember the answer, but to use the idea correctly in a slightly different situation.\n\n` +
      `Question: "${question}"\n\n` +
      `Explain your reasoning and show how the idea you have learned applies here.`;

  } else if (move === "progress") {
    response =
      `You've built a good understanding of ${lessonTopic}. Now let's use that understanding in a new situation.\n\n` +
      `Instead of only recalling the idea, think about how you would apply it here.\n\n` +
      `Question: "${question}"\n\n` +
      `Explain how you reached your answer.`;

  } else if (move === "challenge") {
    response =
      `Ready for a challenge?\n\n` +
      `This time, the situation may be less familiar. The important thing is to transfer what you already understand rather than rely on memorising a particular example.\n\n` +
      `Question: "${question}"\n\n` +
      `Give your answer and explain the reasoning that led you there.`;

  } else {
    response =
      `Let's build the foundation for ${lessonTopic}.\n\n` +
      `Start with the basic idea and connect it to what you already know.\n\n` +
      `Question: "${question}"\n\n` +
      `Explain what you think is happening and why.`;
  }

  if (difficultyLevel === "foundation") {
    response +=
      `\n\nLet's keep this step simple: focus on the main idea before adding more detail.`;
  } else if (difficultyLevel === "developing") {
    response +=
      `\n\nTry to connect at least two ideas in your explanation.`;
  } else if (difficultyLevel === "strong") {
    response +=
      `\n\nGo beyond the answer: justify your reasoning and connect it to the underlying idea.`;
  } else if (difficultyLevel === "challenge") {
    response +=
      `\n\nLook for a connection to what you already know, even if the situation looks unfamiliar.`;
  }

  return response;
}
