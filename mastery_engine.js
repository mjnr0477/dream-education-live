function calculateMastery({
  assessments = [],
  currentUnderstanding = null
} = {}) {

  const results = Array.isArray(assessments)
    ? assessments
    : [];

  const scores = results.map(
    item => Number(item.score) || 0
  );

  const averageScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) /
        scores.length
      : 0;

  const strongAttempts = results.filter(
    item => item.understanding === "strong"
  ).length;

  /*
    MASTERED RULE

    A learner is mastered when the latest
    three assessments for the topic are all strong.
  */
  const latestThreeStrong =
    results.length >= 3 &&
    results
      .slice(0, 3)
      .every(
        item => item.understanding === "strong"
      );

  let masteryStatus;

  if (results.length === 0) {

    masteryStatus = "not_started";

  } else if (currentUnderstanding === "misconception") {

    masteryStatus = "needs_correction";

  } else if (currentUnderstanding === "no_understanding") {

    masteryStatus = "needs_practice";

  } else if (
    currentUnderstanding === "basic" ||
    currentUnderstanding === "partial"
  ) {

    masteryStatus = "developing";

  } else if (
    currentUnderstanding === "strong" &&
    latestThreeStrong
  ) {

    masteryStatus = "mastered";

  } else {

    masteryStatus = "developing";
  }

  const mastered =
    masteryStatus === "mastered";

  return {
    averageScore,
    strongAttempts,
    latestThreeStrong,
    masteryStatus,
    mastered
  };
}

module.exports = {
  calculateMastery
};
