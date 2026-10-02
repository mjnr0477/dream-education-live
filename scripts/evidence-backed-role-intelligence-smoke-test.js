"use strict";

const assert = require("assert");
const {
  learnerSummary,
  buildTeacherIntelligence,
  buildParentIntelligence,
  buildSchoolIntelligence
} = require("../product/role_intelligence_engine");

const learner = { learner_id: "learner-1", name: "Test Learner", level: "Year 3" };
const assessments = [
  { learner_id: "learner-1", score: 70, topic: "Algebra", created_at: "2026-10-02T10:00:00Z" },
  { learner_id: "learner-1", score: 50, topic: "Algebra", created_at: "2026-10-02T09:00:00Z" }
];
const evidenceByLearner = {
  "learner-1": [
    { evidence_type: "assessment", confidence: 0.7, observed_at: "2026-10-02T10:00:00Z" },
    { evidence_type: "retrieval", confidence: 0.9, observed_at: "2026-10-02T09:30:00Z" }
  ]
};

const summary = learnerSummary(learner, assessments, evidenceByLearner["learner-1"]);
assert.strictEqual(summary.evidence.count, 2);
assert.strictEqual(summary.evidence.confidence, 0.8);
assert.deepStrictEqual(summary.evidence.by_type, { assessment: 1, retrieval: 1 });

const teacher = buildTeacherIntelligence({
  teacher: { teacher_id: "teacher-1", name: "Teacher" },
  learners: [learner],
  assessments,
  evidenceByLearner
});
assert.strictEqual(teacher.teaching_priorities[0].evidence.count, 2);

const parent = buildParentIntelligence({
  parent: { parent_id: "parent-1", name: "Parent" },
  children: [learner],
  assessments,
  evidenceByLearner
});
assert.strictEqual(parent.children[0].evidence.confidence, 0.8);

const school = buildSchoolIntelligence({
  school: { school_id: "school-1", name: "School" },
  learners: [learner],
  assessments,
  teachers: [{ teacher_id: "teacher-1" }],
  evidenceByLearner
});
assert.strictEqual(school.priority_learners[0].evidence.count, 2);

console.log("Evidence-backed role intelligence smoke test: PASS");
