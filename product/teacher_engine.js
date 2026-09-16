const crypto = require("crypto");

function createTeacherProfile({
  teacher_id = null,
  name = "Teacher",
  school = null,
  subjects = []
} = {}) {
  const id = teacher_id || `teacher_${crypto.randomUUID()}`;

  return {
    teacher_id: id,
    role: "teacher",
    name: String(name || "Teacher").trim(),
    school: school || null,
    subjects: Array.isArray(subjects) ? subjects : [],
    classes: [],
    learners: [],
    analytics: {
      total_learners: 0,
      assessments: 0,
      average_score: 0,
      learners_needing_support: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function calculateClassAnalytics(learners = []) {
  const scores = learners
    .flatMap(l => Array.isArray(l.assessments) ? l.assessments : [])
    .map(a => Number(a.score))
    .filter(Number.isFinite);

  const average_score = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    total_learners: learners.length,
    assessments: scores.length,
    average_score,
    learners_needing_support: learners.filter(l =>
      ["needs_correction", "developing", "needs_practice"].includes(
        l.mastery_status
      )
    ).length
  };
}

module.exports = {
  createTeacherProfile,
  calculateClassAnalytics
};
