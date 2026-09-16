const crypto = require("crypto");

const LEARNING_METHODS = [
  "auto",
  "explanation",
  "examples",
  "step_by_step",
  "discussion",
  "problem_solving",
  "custom"
];

const ROLES = ["learner", "teacher", "parent", "school"];

function createLearnerProfile({
  learner_id = null,
  name = "Learner",
  level = "",
  grade = "",
  school = null
} = {}) {
  const id =
    learner_id ||
    `learner_${crypto.randomUUID()}`;

  return {
    learner_id: id,
    role: "learner",
    name: String(name || "Learner").trim(),
    level: String(level || "").trim(),
    grade: String(grade || "").trim(),
    school: school || null,
    preferred_learning_method: "auto",
    custom_learning_method: null,
    subjects: [],
    active_subject: null,
    active_topic: null,
    progress: {
      topics_started: 0,
      topics_mastered: 0,
      average_score: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function validateLearningMethod(method) {
  return LEARNING_METHODS.includes(method) ? method : "auto";
}

function validateRole(role) {
  return ROLES.includes(role) ? role : null;
}

module.exports = {
  LEARNING_METHODS,
  ROLES,
  createLearnerProfile,
  validateLearningMethod,
  validateRole
};
