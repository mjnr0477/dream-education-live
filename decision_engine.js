function decideNextAction({
  profile = {},
  nextTopic = null
} = {}) {

  const topics = profile.topics || {};
  const overall = profile.overall || {};

  const topicEntries = Object.entries(topics);

  // 1. Current misconception — correct first.
  const misconception = topicEntries.find(
    ([_, data]) =>
      data.current_state === "MISCONCEPTION" ||
      data.mastery_status === "needs_correction"
  );

  if (misconception) {
    return {
      action: "correct",
      topic: misconception[0],
      reason: "The learner currently has a misconception that should be corrected before progressing.",
      priority: "highest"
    };
  }

  // 2. Recently recovered — consolidate the correction.
  const recovered = topicEntries.find(
    ([_, data]) =>
      data.current_state === "RECOVERED"
  );

  if (recovered) {
    return {
      action: "consolidate",
      topic: recovered[0],
      reason: "The learner has recently recovered from a misconception and should consolidate the corrected understanding.",
      priority: "high"
    };
  }

  // 3. Needs foundation practice.
  const practice = topicEntries
    .filter(
      ([_, data]) =>
        data.mastery_status === "needs_practice"
    )
    .sort(
      (a, b) =>
        (a[1].latest_score ?? 0) -
        (b[1].latest_score ?? 0)
    );

  if (practice.length > 0) {
    return {
      action: "practice",
      topic: practice[0][0],
      reason: "The learner needs more foundation practice before progressing.",
      priority: "high"
    };
  }

  // 4. Mastered — challenge through transfer.
  const mastered = topicEntries.find(
    ([_, data]) =>
      data.mastered === true ||
      data.mastery_status === "mastered"
  );

  if (mastered) {
    return {
      action: "challenge",
      topic: mastered[0],
      reason: "The learner has demonstrated consistent mastery and is ready for transfer.",
      priority: "medium"
    };
  }

  // 5. Strong understanding — move to application.
  const strong = topicEntries.find(
    ([_, data]) =>
      data.current_state === "STRONG" ||
      data.latest_understanding === "strong"
  );

  if (strong) {
    return {
      action: "apply",
      topic: strong[0],
      reason: "The learner has demonstrated strong understanding and can now apply it in a new situation.",
      priority: "medium"
    };
  }

  // 6. Developing understanding — strengthen it.
  const developing = topicEntries
    .filter(
      ([_, data]) =>
        data.mastery_status === "developing"
    )
    .sort(
      (a, b) =>
        (a[1].average_score ?? 0) -
        (b[1].average_score ?? 0)
    );

  if (developing.length > 0) {
    return {
      action: "develop",
      topic: developing[0][0],
      reason: "The learner has incomplete understanding that should be strengthened.",
      priority: "medium"
    };
  }

  // 7. Use topic selection when no stronger state exists.
  if (nextTopic && nextTopic.topic) {
    return {
      action: nextTopic.action || "continue",
      topic: nextTopic.topic,
      reason: nextTopic.reason || "Continue learning.",
      priority: "normal"
    };
  }

  // 8. No assessment evidence.
  if ((overall.total_assessments || 0) === 0) {
    return {
      action: "assess",
      topic: null,
      reason: "There is not enough assessment evidence yet. The learner needs initial assessment.",
      priority: "highest"
    };
  }

  return {
    action: "continue",
    topic: null,
    reason: "Continue building evidence about the learner's understanding.",
    priority: "normal"
  };
}

module.exports = {
  decideNextAction
};
