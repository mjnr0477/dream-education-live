const crypto = require("crypto");

function createParentProfile({
  parent_id = null,
  name = "Parent",
  children = []
} = {}) {
  const id = parent_id || `parent_${crypto.randomUUID()}`;

  return {
    parent_id: id,
    role: "parent",
    name: String(name || "Parent").trim(),
    children: Array.isArray(children) ? children : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function buildChildProgress(learner = {}) {
  const assessments = Array.isArray(learner.assessments)
    ? learner.assessments
    : [];

  const scores = assessments
    .map(a => Number(a.score))
    .filter(Number.isFinite);

  const average_score = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    learner_id: learner.learner_id || null,
    name: learner.name || "Learner",
    level: learner.level || "",
    mastery_status: learner.mastery_status || "not_started",
    average_score,
    assessments: scores.length,
    needs_support: ["developing", "needs_correction", "needs_practice"]
      .includes(learner.mastery_status)
  };
}

module.exports = {
  createParentProfile,
  buildChildProgress
};
