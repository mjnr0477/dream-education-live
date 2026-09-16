const crypto = require("crypto");

function createSchoolProfile({
  school_id = null,
  name = "School",
  location = null
} = {}) {
  const id = school_id || `school_${crypto.randomUUID()}`;

  return {
    school_id: id,
    role: "school",
    name: String(name || "School").trim(),
    location: location || null,
    teachers: [],
    learners: [],
    classes: [],
    results: [],
    analytics: {
      total_teachers: 0,
      total_learners: 0,
      total_assessments: 0,
      average_score: 0,
      learners_needing_support: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function calculateSchoolAnalytics({
  teachers = [],
  learners = []
} = {}) {
  const assessments = learners.flatMap(l =>
    Array.isArray(l.assessments) ? l.assessments : []
  );

  const scores = assessments
    .map(a => Number(a.score))
    .filter(Number.isFinite);

  const average_score = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    total_teachers: teachers.length,
    total_learners: learners.length,
    total_assessments: scores.length,
    average_score,
    learners_needing_support: learners.filter(l =>
      ["developing", "needs_correction", "needs_practice"]
        .includes(l.mastery_status)
    ).length
  };
}

module.exports = {
  createSchoolProfile,
  calculateSchoolAnalytics
};
