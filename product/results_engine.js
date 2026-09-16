function recordResult({
  learner_id,
  class_id = null,
  subject = "",
  topic = null,
  score = 0,
  assessment_type = "assessment"
} = {}) {
  const numericScore = Number(score);

  return {
    learner_id: learner_id || null,
    class_id: class_id || null,
    subject: String(subject || "").trim(),
    topic: topic || null,
    score: Number.isFinite(numericScore) ? numericScore : 0,
    assessment_type: String(assessment_type || "assessment"),
    recorded_at: new Date().toISOString()
  };
}

function analyzeResults(results = []) {
  const valid = results.filter(r =>
    r &&
    r.learner_id &&
    Number.isFinite(Number(r.score))
  );

  const average_score = valid.length
    ? Math.round(
        valid.reduce((sum, r) => sum + Number(r.score), 0) /
        valid.length
      )
    : 0;

  const weak_results = valid.filter(r => Number(r.score) < 50);

  return {
    total_results: valid.length,
    average_score,
    weak_results: weak_results.length,
    learners_needing_support: [
      ...new Set(weak_results.map(r => r.learner_id))
    ]
  };
}

module.exports = {
  recordResult,
  analyzeResults
};

function analyzeResultsBySubject(results = []) {
  const groups = {};

  results.forEach(result => {
    if (!result || !result.subject) return;

    const subject = result.subject;

    if (!groups[subject]) {
      groups[subject] = [];
    }

    groups[subject].push(result);
  });

  return Object.entries(groups).map(([subject, subjectResults]) => {
    const scores = subjectResults
      .map(r => Number(r.score))
      .filter(Number.isFinite);

    const average_score = scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) /
          scores.length
        )
      : 0;

    return {
      subject,
      total_results: scores.length,
      average_score,
      weak_results: scores.filter(score => score < 50).length
    };
  });
}

function analyzeResultsByTopic(results = []) {
  const groups = {};

  results.forEach(result => {
    if (!result || !result.topic) return;

    const topic = result.topic;

    if (!groups[topic]) {
      groups[topic] = [];
    }

    groups[topic].push(result);
  });

  return Object.entries(groups).map(([topic, topicResults]) => {
    const scores = topicResults
      .map(r => Number(r.score))
      .filter(Number.isFinite);

    const average_score = scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) /
          scores.length
        )
      : 0;

    return {
      topic,
      total_results: scores.length,
      average_score,
      weak_results: scores.filter(score => score < 50).length
    };
  });
}

module.exports.analyzeResultsBySubject = analyzeResultsBySubject;
module.exports.analyzeResultsByTopic = analyzeResultsByTopic;
