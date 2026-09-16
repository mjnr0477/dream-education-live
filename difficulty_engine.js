function determineDifficulty({
  learningState = null,
  understanding = null,
  score = 0,
  previousScore = null,
  trajectory = "first_attempt",
  masteryStatus = null,
  averageScore = 0,
  strongAttempts = 0
} = {}) {

  const state = String(learningState || "").toUpperCase();
  const currentUnderstanding =
    String(understanding || "").toLowerCase();

  const currentScore = Number(score) || 0;

  /*
    Difficulty determines HOW difficult the next task should be.

    It does not decide WHAT to teach.
    Evidence Teaching remains responsible for that.

    Priority:
    misconception → recovery → mastery → strong → developing → foundation
  */

  // 1. Misconception must be corrected first.
  if (
    state === "MISCONCEPTION" ||
    currentUnderstanding === "misconception"
  ) {
    return {
      difficulty: "foundation",
      direction: "decrease",
      reason:
        "The learner currently has a misconception, so the next task should reinforce the correct foundation before increasing difficulty."
    };
  }

  // 2. Correction/recovery needs consolidation.
  if (
    state === "CORRECTING" ||
    state === "RECOVERED"
  ) {
    return {
      difficulty: "developing",
      direction: "maintain",
      reason:
        "The learner is correcting or has recently recovered from an earlier misconception, so the next task should consolidate the corrected understanding."
    };
  }

  // 3. Mastery is authoritative.
  if (masteryStatus === "mastered") {
    return {
      difficulty: "challenge",
      direction: "increase",
      reason:
        "The learner has demonstrated consistent mastery, so the next task can test transfer through a challenge."
    };
  }

  // 4. Strong current understanding.
  if (
    state === "STRONG" ||
    currentUnderstanding === "strong"
  ) {

    if (
      trajectory === "declining" &&
      currentScore < 80
    ) {
      return {
        difficulty: "developing",
        direction: "decrease",
        reason:
          "The learner has shown strong understanding but recent performance has declined, so reduce difficulty slightly and verify the understanding."
      };
    }

    if (
      trajectory === "improving" ||
      currentScore >= 80
    ) {
      return {
        difficulty: "strong",
        direction: "increase",
        reason:
          "The learner is demonstrating strong understanding, so the next task can require stronger application."
      };
    }

    return {
      difficulty: "strong",
      direction: "maintain",
      reason:
        "The learner is demonstrating stable strong understanding, so maintain the current level while preparing for application."
    };
  }

  // 5. Developing learner.
  if (
    state === "DEVELOPING" ||
    currentUnderstanding === "basic" ||
    currentUnderstanding === "partial" ||
    masteryStatus === "developing"
  ) {

    if (
      trajectory === "improving" &&
      currentScore >= 70
    ) {
      return {
        difficulty: "strong",
        direction: "increase",
        reason:
          "The learner is developing understanding, but recent performance is improving strongly enough to increase the difficulty gradually."
      };
    }

    if (
      trajectory === "declining" ||
      currentScore < 50
    ) {
      return {
        difficulty: "foundation",
        direction: "decrease",
        reason:
          "The learner's recent performance is weakening, so the next task should reinforce the foundation."
      };
    }

    return {
      difficulty: "developing",
      direction: "maintain",
      reason:
        "The learner is still developing understanding, so maintain an appropriate practice difficulty."
    };
  }

  // 6. No evidence yet.
  if (
    state === "FOUNDATION" ||
    !learningState
  ) {
    return {
      difficulty: "foundation",
      direction: "maintain",
      reason:
        "There is not yet enough evidence of stable understanding, so begin with a foundational task."
    };
  }

  // 7. Safe fallback.
  return {
    difficulty: "foundation",
    direction: "maintain",
    reason:
      "The available evidence does not justify increasing difficulty yet."
  };
}


module.exports = {
  determineDifficulty
};
