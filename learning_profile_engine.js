const { determineLearningState } =
  require("./learning_state_engine");

const { calculateMastery } =
  require("./mastery_engine");


function buildLearningProfile({
  learner = null,
  history = [],
  assessments = []
} = {}) {

  const learningHistory =
    Array.isArray(history) ? history : [];

  const assessmentResults =
    Array.isArray(assessments) ? assessments : [];


  /*
    ==========================================
    OVERALL PERFORMANCE
    ==========================================
  */

  const allScores = assessmentResults.map(
    item => Number(item.score) || 0
  );

  const averageScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((a, b) => a + b, 0) /
          allScores.length
        )
      : 0;

  let difficulty = "beginner";

  if (averageScore >= 80) {
    difficulty = "advanced";
  } else if (averageScore >= 50) {
    difficulty = "intermediate";
  }


  /*
    ==========================================
    SUBJECT PERFORMANCE
    ==========================================
  */

  const subjectStats = {};

  learningHistory.forEach(item => {

    const subject =
      item.subject || "General";

    if (!subjectStats[subject]) {
      subjectStats[subject] = {
        questions: 0,
        scores: []
      };
    }

    subjectStats[subject].questions += 1;
  });

  assessmentResults.forEach(item => {

    const subject =
      item.subject || "General";

    if (!subjectStats[subject]) {
      subjectStats[subject] = {
        questions: 0,
        scores: []
      };
    }

    subjectStats[subject].scores.push(
      Number(item.score) || 0
    );
  });

  const subjectPerformance = {};

  Object.entries(subjectStats).forEach(
    ([subject, stats]) => {

      const scores = stats.scores;

      const average =
        scores.length > 0
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) /
              scores.length
            )
          : null;

      subjectPerformance[subject] = {
        questions: stats.questions,
        assessments: scores.length,
        average_score: average
      };
    }
  );


  /*
    ==========================================
    STRONGEST / WEAKEST SUBJECT
    ==========================================
  */

  let strongestSubject = null;
  let weakestSubject = null;

  const subjectsWithScores =
    Object.entries(subjectPerformance)
      .filter(
        ([_, stats]) =>
          stats.average_score !== null
      );

  if (subjectsWithScores.length > 0) {

    subjectsWithScores.sort(
      (a, b) =>
        b[1].average_score -
        a[1].average_score
    );

    strongestSubject =
      subjectsWithScores[0][0];

    weakestSubject =
      subjectsWithScores[
        subjectsWithScores.length - 1
      ][0];
  }


  /*
    ==========================================
    TOPIC GROUPING
    ==========================================
  */

  const topicStats = {};

  assessmentResults.forEach(item => {

    const topic =
      item.topic || "General";

    if (!topicStats[topic]) {
      topicStats[topic] = {
        assessments: 0,
        scores: [],
        results: []
      };
    }

    topicStats[topic].assessments += 1;

    topicStats[topic].scores.push(
      Number(item.score) || 0
    );

    topicStats[topic].results.push(item);
  });


  /*
    ==========================================
    TOPIC PROFILE
    ==========================================
  */

  const topicPerformance = {};

  Object.entries(topicStats).forEach(
    ([topic, stats]) => {

      const scores = stats.scores;

      const average =
        scores.length > 0
          ? Math.round(
              scores.reduce((a, b) => a + b, 0) /
              scores.length
            )
          : null;

      const latest =
        stats.results[0] || null;

      const latestScore =
        latest
          ? Number(latest.score) || 0
          : null;

      const latestUnderstanding =
        latest
          ? latest.understanding || null
          : null;


      /*
        --------------------------------------
        MASTERY
        --------------------------------------
      */

      const mastery =
        calculateMastery({
          assessments: stats.results,
          currentUnderstanding:
            latestUnderstanding
        });


      /*
        --------------------------------------
        STATE HISTORY
        --------------------------------------
      */

      /*
        Database results normally arrive newest
        first.

        State reconstruction must happen from
        oldest to newest.
      */

      const chronological =
        [...stats.results].reverse();

      const stateHistory = [];

      let previousState = null;
      let previousUnderstanding = null;
      let previousScore = null;

      chronological.forEach(item => {

        const currentUnderstanding =
          item.understanding || null;

        const currentScore =
          Number(item.score) || 0;

        const correctionAttempt =
          previousUnderstanding ===
          "misconception";

        const state =
          determineLearningState({
            previousState,
            previousUnderstanding,
            previousScore,
            currentUnderstanding,
            currentScore,
            correctionAttempt
          });

        stateHistory.push({
          state,
          understanding: currentUnderstanding,
          score: currentScore,
          created_at:
            item.created_at || null
        });

        previousState = state;
        previousUnderstanding =
          currentUnderstanding;
        previousScore = currentScore;
      });


      /*
        Latest state is the current state.
      */

      const currentState =
        stateHistory.length > 0
          ? stateHistory[
              stateHistory.length - 1
            ].state
          : null;


      /*
        Detect whether the learner has recovered
        from a misconception at any point.
      */

      const hasRecovered =
        stateHistory.some(
          item =>
            item.state === "RECOVERED"
        );


      topicPerformance[topic] = {

        assessments:
          stats.assessments,

        average_score:
          average,

        latest_score:
          latestScore,

        latest_understanding:
          latestUnderstanding,

        current_state:
          currentState,

        mastery_status:
          mastery.masteryStatus,

        status:
          mastery.masteryStatus,

        strong_attempts:
          mastery.strongAttempts,

        latest_three_strong:
          mastery.latestThreeStrong,

        mastered:
          mastery.mastered,

        has_recovered:
          hasRecovered,

        state_history:
          stateHistory
      };
    }
  );


  /*
    ==========================================
    OVERALL PATTERNS
    ==========================================
  */

  const misconceptionCount =
    assessmentResults.filter(
      item =>
        item.understanding ===
        "misconception"
    ).length;

  const strongCount =
    assessmentResults.filter(
      item =>
        item.understanding ===
        "strong"
    ).length;

  const recoveredTopics =
    Object.entries(topicPerformance)
      .filter(
        ([_, data]) =>
          data.has_recovered === true
      )
      .map(
        ([topic]) => topic
      );

  const currentMisconceptionTopics =
    Object.entries(topicPerformance)
      .filter(
        ([_, data]) =>
          data.current_state ===
          "MISCONCEPTION"
      )
      .map(
        ([topic]) => topic
      );


  /*
    ==========================================
    PROFILE
    ==========================================
  */

  return {

    learner: learner
      ? {
          learner_id:
            learner.learner_id || null,

          name:
            learner.name || null,

          level:
            learner.level || null
        }
      : null,

    overall: {
      total_questions:
        learningHistory.length,

      total_assessments:
        assessmentResults.length,

      average_score:
        averageScore,

      difficulty:
        difficulty,

      strongest_subject:
        strongestSubject,

      weakest_subject:
        weakestSubject
    },

    subjects:
      subjectPerformance,

    topics:
      topicPerformance,

    patterns: {

      misconception_count:
        misconceptionCount,

      strong_count:
        strongCount,

      recovered_topics:
        recoveredTopics,

      current_misconception_topics:
        currentMisconceptionTopics,

      has_misconceptions:
        misconceptionCount > 0,

      has_recovered_topics:
        recoveredTopics.length > 0
    },

    recent_learning:
      learningHistory.slice(0, 5)
  };
}


module.exports = {
  buildLearningProfile
};
