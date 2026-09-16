function determineLearningState({
  previousState = null,
  previousUnderstanding = null,
  previousScore = null,
  currentUnderstanding = null,
  currentScore = null,
  correctionAttempt = false
} = {}) {

  const current = String(currentUnderstanding || "").toLowerCase();
  const previous = String(previousUnderstanding || "").toLowerCase();

  const score = Number(currentScore) || 0;

  /*
    1. A current misconception always takes priority.
  */
  if (current === "misconception") {
    return "MISCONCEPTION";
  }

  /*
    2. If the learner is responding to a misconception
       but has not demonstrated full correction yet,
       remain in CORRECTING.
  */
  if (
    (
      previous === "misconception" ||
      previousState === "MISCONCEPTION" ||
      previousState === "CORRECTING"
    ) &&
    correctionAttempt === true
  ) {

    if (
      current === "strong" &&
      score >= 80
    ) {
      return "RECOVERED";
    }

    return "CORRECTING";
  }

  /*
    3. No previous learning evidence.
  */
  if (!previousUnderstanding && !previousState) {

    if (current === "misconception") {
      return "MISCONCEPTION";
    }

    if (
      current === "strong" &&
      score >= 80
    ) {
      return "STRONG";
    }

    if (
      current === "basic" ||
      current === "partial"
    ) {
      return "DEVELOPING";
    }

    return "FOUNDATION";
  }

  /*
    4. No understanding.
  */
  if (
    current === "no_understanding" ||
    current === "needs_practice"
  ) {
    return "FOUNDATION";
  }

  /*
    5. Basic or partial understanding.
  */
  if (
    current === "basic" ||
    current === "partial"
  ) {
    return "DEVELOPING";
  }

  /*
    6. Strong understanding.
  */
  if (
    current === "strong" &&
    score >= 80
  ) {
    return "STRONG";
  }

  /*
    7. Preserve an existing state when evidence
       is not strong enough to change it.
  */
  if (previousState) {
    return previousState;
  }

  /*
    8. Safe fallback.
  */
  return "FOUNDATION";
}


module.exports = {
  determineLearningState
};
