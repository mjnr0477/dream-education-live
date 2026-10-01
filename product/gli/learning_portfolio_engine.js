"use strict";

function buildLearningPortfolio({ learner = {}, profile = {}, assessments = [], credentials = [] } = {}) {
  const rows = Array.isArray(assessments) ? assessments : [];
  const completed = rows.filter(row => Number.isFinite(Number(row.score)));
  const average = completed.length
    ? Math.round(completed.reduce((sum,row) => sum + Number(row.score), 0) / completed.length)
    : null;

  const evidence = rows.slice(0, 20).map(row => ({
    type: "assessment",
    topic: row.topic || row.subject || null,
    score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
    date: row.created_at || null,
    understanding: row.understanding || null
  }));

  return {
    version: "1.0.0",
    learner_id: String(learner.learner_id || ""),
    summary: {
      assessments: completed.length,
      average_score: average,
      strengths: profile.overall?.strengths || [],
      gaps: profile.overall?.gaps || []
    },
    evidence,
    credentials: Array.isArray(credentials) ? credentials : []
  };
}

module.exports = { buildLearningPortfolio };
