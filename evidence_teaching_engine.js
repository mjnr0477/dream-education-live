function generateEvidenceTeaching(evidenceAnalysis, context = {}) {
  const {
    subject = "",
    topic = "",
    level = "",
    masteryStatus = null,
    averageScore = 0,
    strongAttempts = 0,
    trajectory = "first_attempt",
    previousScore = null,
    learningState = null,
    previousLearningState = null,
    correctionAttempt = false,
    decisionAction = null,
    decisionTopic = null,
    learningMethod = "auto",
    customLearningMethod = null
  } = context;

  const evidence = evidenceAnalysis || {};
  const topicText = String(topic).toLowerCase();
  const isPhotosynthesis = topicText.includes("photosynthesis");

  const result = {
    teachingMove: "continue",
    explanation: "",
    target: null,
    nextQuestion: null
  };

  function applyLearningMethod(result) {
    const method = learningMethod || "auto";
    const custom = customLearningMethod || "a clear learner-friendly approach";

    if (method === "explanation") {
      result.explanation =
        `Explain this clearly and directly.\n\n${result.explanation}`;
    } else if (method === "examples") {
      result.explanation =
        `Let's understand this through examples.\n\n${result.explanation}`;
    } else if (method === "step_by_step") {
      result.explanation =
        `Let's work through this step by step.\n\n${result.explanation}`;
    } else if (method === "discussion") {
      result.explanation =
        `Let's explore this together through discussion.\n\n${result.explanation}`;
    } else if (method === "problem_solving") {
      result.explanation =
        `Let's approach this as a problem to solve.\n\n${result.explanation}`;
    } else if (method === "custom") {
      result.explanation =
        `I'll use your requested approach: "${custom}".\n\n${result.explanation}`;
    }

    return result;
  }

  /*
    STATE-AWARE EVIDENCE-DRIVEN TEACHING

    Priority order:

    1. Correct misconceptions
    2. Repair missing evidence
    3. Build incomplete reasoning
    4. Progress developing learners
    5. Challenge mastered learners

    Historical performance influences progression,
    but it must never override a current misconception
    or current learning gap.
  */

  /*
    MISCONCEPTION
  */

  if (evidence.reasoningQuality === "misconception") {
    result.teachingMove = "correct_misconception";
    result.target = "misconception";

    result.explanation =
      evidence.feedback ||
      "There is an important idea to correct. Let's rebuild that part carefully.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "During photosynthesis, does the plant mainly take in carbon dioxide or oxygen from the air? Explain why.";
    } else {
      result.nextQuestion =
        "Let's correct this idea first. What do you think the correct explanation is?";
    }

    return applyLearningMethod(result);
  }

  /*
    FACTOR MISSING
  */

  /*
    RECOVERED MISCONCEPTION

    The learner has successfully corrected a previous
    misconception. Do not immediately treat this as
    ordinary strong understanding.

    First consolidate the corrected idea.
  */
  if (decisionAction === "consolidate" || learningState === "RECOVERED") {
    result.teachingMove = "consolidate_recovery";
    result.target = "recovered_concept";

    result.explanation =
      "Good correction. You have successfully replaced the earlier incorrect idea. " +
      "Now let's strengthen the corrected understanding so you can use it confidently.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "A plant has enough sunlight and water but very little carbon dioxide. " +
        "Explain what happens to photosynthesis and food production, and make sure you identify which gas the plant takes in.";
    } else {
      result.nextQuestion =
        `Now explain the corrected idea about ${topic || "this concept"} in your own words and apply it to a slightly different situation.`;
    }

    return applyLearningMethod(result);
  }

  if (evidence.factorCorrect !== true) {
    result.teachingMove = "teach_factor";
    result.target = "factor";

    result.explanation =
      "Before explaining what happens, let's identify the important factor in the situation.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "Which factor in this situation is affecting the plant's photosynthesis?";
    } else {
      result.nextQuestion =
        "What is the main factor affecting the situation described in the question?";
    }

    return applyLearningMethod(result);
  }

  /*
    PROCESS MISSING
  */

  if (
    evidence.factorCorrect === true &&
    evidence.processCorrect !== true
  ) {
    result.teachingMove = "teach_process";
    result.target = "process";

    result.explanation =
      "You identified the important factor. Now let's connect it to the process by explaining what happens in between.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "How does the amount of this factor affect the rate of photosynthesis?";
    } else {
      result.nextQuestion =
        "How does this factor cause the change you described?";
    }

    return applyLearningMethod(result);
  }

  /*
    OUTCOME MISSING
  */

  if (
    evidence.factorCorrect === true &&
    evidence.processCorrect === true &&
    evidence.outcomePresent !== true
  ) {
    result.teachingMove = "teach_outcome";
    result.target = "outcome";

    result.explanation =
      "You explained what happens to the process. Now let's identify the final effect of that change.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "If the rate of photosynthesis decreases, what effect would this have on the amount of food the plant produces?";
    } else {
      result.nextQuestion =
        "What is the final result or consequence of this change?";
    }

    return applyLearningMethod(result);
  }

  /*
    MASTERY

    A mastered learner should not simply receive another
    generic question. The next task should deliberately
    increase transfer and application.
  */

  if (
    
    masteryStatus === "mastered" ||
    (
      evidence.reasoningQuality === "strong" &&
      strongAttempts >= 3 &&
      Number(averageScore) >= 80
    )
  ) {
    result.teachingMove = "challenge";
    result.target = "transfer";

    result.explanation =
      `You have demonstrated consistent understanding of ${topic || "this concept"}. ` +
      "Now let's test whether you can transfer that understanding to a new situation.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "A farmer notices that two plants receive the same amount of sunlight and water, but one plant grows more slowly because it receives less carbon dioxide. Explain why this difference could affect food production.";
    } else {
      result.nextQuestion =
        `Apply what you learned about ${topic || "this concept"} to a new real-life situation and explain your reasoning.`;
    }

    return applyLearningMethod(result);
  }

  /*
    STRONG CURRENT UNDERSTANDING

    The learner is doing well but has not yet demonstrated
    enough consistent evidence for mastery.
  */

  if (evidence.reasoningQuality === "strong") {
    result.teachingMove = "progress";
    result.target = "application";

    if (trajectory === "declining") {
      result.explanation =
        "You understand the main idea, but your recent performance has changed. Let's check whether you can still apply the idea confidently.";
    } else if (trajectory === "improving") {
      result.explanation =
        "Excellent. Your understanding is improving, so let's extend it with a new application.";
    } else {
      result.explanation =
        "Excellent. You connected the factor, the process, and the outcome. Now let's apply the same idea in a new situation.";
    }

    if (isPhotosynthesis) {
      result.nextQuestion =
        "A plant has enough water and sunlight, but there is very little carbon dioxide in the air. Explain how this could affect photosynthesis and food production.";
    } else {
      result.nextQuestion =
        `Now apply the same idea about ${topic || "this concept"} to a new situation. What would happen if the conditions changed?`;
    }

    return applyLearningMethod(result);
  }

  /*
    PARTIAL UNDERSTANDING

    The learner has some evidence but needs targeted
    development before moving to harder application.
  */

  if (evidence.reasoningQuality === "partial") {
    result.teachingMove = "develop_reasoning";
    result.target = "reasoning";

    result.explanation =
      "You have part of the idea. Let's strengthen the missing connection before moving to a harder problem.";

    if (isPhotosynthesis) {
      if (
        evidence.factorCorrect === true &&
        evidence.processCorrect !== true
      ) {
        result.nextQuestion =
          "How does having less of this factor affect the rate of photosynthesis?";
      } else if (
        evidence.factorCorrect === true &&
        evidence.processCorrect === true &&
        evidence.outcomePresent !== true
      ) {
        result.nextQuestion =
          "If photosynthesis decreases, how could this affect the food produced by the plant?";
      } else {
        result.nextQuestion =
          "Explain how the factor you identified affects photosynthesis and food production.";
      }
    } else {
      result.nextQuestion =
        `What important connection is still missing from your explanation of ${topic || "this concept"}?`;
    }

    return applyLearningMethod(result);
  }

  /*
    BASIC UNDERSTANDING
  */

  if (evidence.reasoningQuality === "basic") {
    result.teachingMove = "build_reasoning";
    result.target = "reasoning";

    result.explanation =
      "You identified an important part of the idea. Now let's build the connection between the factor, the process, and the result.";

    if (isPhotosynthesis) {
      result.nextQuestion =
        "How does the factor you identified affect photosynthesis, and what happens to the food produced?";
    } else {
      result.nextQuestion =
        `How does the part you identified affect ${topic || "the process"}?`;
    }

    return applyLearningMethod(result);
  }

  /*
    INSUFFICIENT EVIDENCE
  */

  result.teachingMove = "build_foundation";
  result.target = "foundation";

  result.explanation =
    "Let's start with the basic idea and build your understanding step by step.";

  if (isPhotosynthesis) {
    result.nextQuestion =
      "What does a plant need from its environment to carry out photosynthesis?";
  } else {
    result.nextQuestion =
      "What is the main idea you understand about this topic?";
  }

  return result;
}

module.exports = {
  generateEvidenceTeaching
};
