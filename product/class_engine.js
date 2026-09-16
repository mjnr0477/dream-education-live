const crypto = require("crypto");

function createClass({
  class_id = null,
  name = "Class",
  level = "",
  teacher_id = null,
  school_id = null
} = {}) {
  return {
    class_id: class_id || `class_${crypto.randomUUID()}`,
    name: String(name || "Class").trim(),
    level: String(level || "").trim(),
    teacher_id: teacher_id || null,
    school_id: school_id || null,
    learners: [],
    subjects: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function addLearnerToClass(classData, learner_id) {
  if (!classData.learners.includes(learner_id)) {
    classData.learners.push(learner_id);
  }

  classData.updated_at = new Date().toISOString();
  return classData;
}

function addSubjectToClass(classData, subject) {
  if (!classData.subjects.includes(subject)) {
    classData.subjects.push(subject);
  }

  classData.updated_at = new Date().toISOString();
  return classData;
}

module.exports = {
  createClass,
  addLearnerToClass,
  addSubjectToClass
};
