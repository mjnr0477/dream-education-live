function generateAdaptiveQuestion({
  subject = "",
  topic = "",
  level = "",
  teachingMove = null,
  teachingTarget = null,
  teachingQuestion = null,
  decisionAction = null,
  decisionTopic = null,
  difficulty = null
} = {}) {

  const currentTopic =
    topic ||
    decisionTopic ||
    "this concept";

  const base = {
    subject: subject || "General",
    topic: topic || decisionTopic || null,
    level: level || null,
    teaching_move: teachingMove,
    decision_action: decisionAction,
    source: "adaptive_question_engine"
  };

  /*
    Evidence Teaching decides WHAT the learner needs.

    Difficulty Engine decides HOW difficult the
    next task should be.

    Adaptive Question Engine decides HOW that need
    is represented as a learner-facing question.

    Difficulty never overrides the teaching question.
  */

  // 1. Evidence Teaching already supplied the question.
  if (teachingQuestion) {
    return {
      ...base,
      question: teachingQuestion,
      target: teachingTarget || null,
      question_type: getQuestionType(teachingMove, teachingTarget),
      difficulty: difficulty || getDifficulty(teachingMove, decisionAction),
      source: "evidence_teaching"
    };
  }

  // 2. Misconception correction
  if (
    teachingMove === "correct_misconception" ||
    teachingTarget === "misconception" ||
    decisionAction === "correct"
  ) {
    return {
      ...base,
      question:
        `Let's correct the important idea about ${currentTopic}. ` +
        `What do you think the correct explanation is?`,
      target: "misconception",
      question_type: "correction",
      difficulty: difficulty || "foundation"
    };
  }

  // 3. Recovery consolidation
  if (
    teachingMove === "consolidate_recovery" ||
    teachingTarget === "recovered_concept" ||
    decisionAction === "consolidate"
  ) {
    return {
      ...base,
      question:
        `Now apply your corrected understanding of ${currentTopic} ` +
        `to a slightly different situation. Explain your reasoning.`,
      target: "recovered_concept",
      question_type: "consolidation",
      difficulty: difficulty || "developing"
    };
  }

  // 4. Missing factor
  if (
    teachingMove === "teach_factor" ||
    teachingTarget === "factor"
  ) {
    return {
      ...base,
      question:
        `What is the main factor affecting ${currentTopic} ` +
        `in this situation?`,
      target: "factor",
      question_type: "identification",
      difficulty: difficulty || "foundation"
    };
  }

  // 5. Missing process
  if (
    teachingMove === "teach_process" ||
    teachingTarget === "process"
  ) {
    return {
      ...base,
      question:
        `How does the factor you identified affect ${currentTopic}? ` +
        `Explain the process.`,
      target: "process",
      question_type: "explanation",
      difficulty: difficulty || "developing"
    };
  }

  // 6. Missing outcome
  if (
    teachingMove === "teach_outcome" ||
    teachingTarget === "outcome"
  ) {
    return {
      ...base,
      question:
        `What is the final result or consequence of the change in ${currentTopic}?`,
      target: "outcome",
      question_type: "consequence",
      difficulty: difficulty || "developing"
    };
  }

  // 7. Reasoning development
  if (
    teachingMove === "develop_reasoning" ||
    teachingMove === "build_reasoning" ||
    teachingTarget === "reasoning"
  ) {
    return {
      ...base,
      question:
        `Explain how the important parts of ${currentTopic} ` +
        `connect to each other.`,
      target: "reasoning",
      question_type: "reasoning",
      difficulty: difficulty || "developing"
    };
  }

  // 8. Mastery / transfer challenge
  if (
    teachingMove === "challenge" ||
    teachingTarget === "transfer" ||
    decisionAction === "challenge"
  ) {
    return {
      ...base,
      question:
        `Apply what you know about ${currentTopic} ` +
        `to a new real-life situation and explain your reasoning.`,
      target: "transfer",
      question_type: "transfer",
      difficulty: difficulty || "challenge"
    };
  }

  // 9. Strong learner / application
  if (
    teachingMove === "progress" ||
    teachingTarget === "application" ||
    decisionAction === "apply"
  ) {
    return {
      ...base,
      question:
        `Now apply what you understand about ${currentTopic} ` +
        `to a new situation. What would happen if the conditions changed?`,
      target: "application",
      question_type: "application",
      difficulty: difficulty || "strong"
    };
  }

  // 10. Foundation
  return {
    ...base,
    question:
      `What is the main idea you understand about ${currentTopic}?`,
    target: "foundation",
    question_type: "recall",
    difficulty: difficulty || "foundation"
  };
}


function getQuestionType(teachingMove, teachingTarget) {

  if (
    teachingMove === "correct_misconception" ||
    teachingTarget === "misconception"
  ) {
    return "correction";
  }

  if (
    teachingMove === "consolidate_recovery" ||
    teachingTarget === "recovered_concept"
  ) {
    return "consolidation";
  }

  if (
    teachingMove === "teach_factor" ||
    teachingTarget === "factor"
  ) {
    return "identification";
  }

  if (
    teachingMove === "teach_process" ||
    teachingTarget === "process"
  ) {
    return "explanation";
  }

  if (
    teachingMove === "teach_outcome" ||
    teachingTarget === "outcome"
  ) {
    return "consequence";
  }

  if (
    teachingMove === "develop_reasoning" ||
    teachingMove === "build_reasoning" ||
    teachingTarget === "reasoning"
  ) {
    return "reasoning";
  }

  if (
    teachingMove === "challenge" ||
    teachingTarget === "transfer"
  ) {
    return "transfer";
  }

  if (
    teachingMove === "progress" ||
    teachingTarget === "application"
  ) {
    return "application";
  }

  return "adaptive";
}


function getDifficulty(teachingMove, decisionAction) {

  if (
    teachingMove === "correct_misconception" ||
    teachingMove === "teach_factor" ||
    decisionAction === "correct"
  ) {
    return "foundation";
  }

  if (
    teachingMove === "consolidate_recovery" ||
    decisionAction === "consolidate"
  ) {
    return "developing";
  }

  if (
    teachingMove === "challenge" ||
    decisionAction === "challenge"
  ) {
    return "challenge";
  }

  if (
    teachingMove === "progress" ||
    decisionAction === "apply"
  ) {
    return "strong";
  }

  if (
    teachingMove === "teach_process" ||
    teachingMove === "teach_outcome" ||
    teachingMove === "develop_reasoning" ||
    teachingMove === "build_reasoning"
  ) {
    return "developing";
  }

  return "foundation";
}


module.exports = {
  generateAdaptiveQuestion
};
