function selectNextTopic(topicPerformance = {}) {
  const allTopics = Object.entries(topicPerformance);

  /*
    GENERAL is a fallback bucket created by older learning records
    that do not have a real topic.

    When real topics exist, they should always take priority over
    this artificial bucket.
  */

  const realTopics = allTopics.filter(
    ([topic]) =>
      topic &&
      topic.toLowerCase() !== "general"
  );

  const topics =
    realTopics.length > 0
      ? realTopics
      : allTopics;

  if (topics.length === 0) {
    return {
      topic: null,
      action: "start",
      reason: "No topic evidence exists yet."
    };
  }

  /*
    Priority:
    1. Correct misconceptions
    2. Practice weak topics
    3. Develop incomplete understanding
    4. Continue strong topics
    5. Challenge mastered topics
  */

  const needsCorrection = topics.find(
    ([_, data]) => data.status === "needs_correction"
  );

  if (needsCorrection) {
    return {
      topic: needsCorrection[0],
      action: "correct",
      reason: "The learner has a current misconception."
    };
  }

  const needsPractice = topics
    .filter(([_, data]) => data.status === "needs_practice")
    .sort(
      (a, b) =>
        (a[1].latest_score ?? 0) -
        (b[1].latest_score ?? 0)
    );

  if (needsPractice.length > 0) {
    return {
      topic: needsPractice[0][0],
      action: "practice",
      reason: "The learner needs more foundation practice."
    };
  }

  const developing = topics
    .filter(([_, data]) => data.status === "developing")
    .sort(
      (a, b) =>
        (a[1].average_score ?? 0) -
        (b[1].average_score ?? 0)
    );

  if (developing.length > 0) {
    return {
      topic: developing[0][0],
      action: "develop",
      reason: "The learner has incomplete understanding that should be strengthened."
    };
  }

  const strong = topics
    .filter(([_, data]) => data.status === "strong")
    .sort(
      (a, b) =>
        (a[1].latest_score ?? 0) -
        (b[1].latest_score ?? 0)
    );

  if (strong.length > 0) {
    return {
      topic: strong[0][0],
      action: "apply",
      reason: "The learner understands the topic and can now apply it."
    };
  }

  const mastered = topics.find(
    ([_, data]) => data.status === "mastered"
  );

  if (mastered) {
    return {
      topic: mastered[0],
      action: "challenge",
      reason: "The learner has demonstrated consistent mastery."
    };
  }

  return {
    topic: topics[0][0],
    action: "continue",
    reason: "Continue building understanding."
  };
}

module.exports = {
  selectNextTopic
};
