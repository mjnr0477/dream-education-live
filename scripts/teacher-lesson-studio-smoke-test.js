"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const teacherUI = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const learnerUI = fs.readFileSync(path.join(root, "public/frontend-workspace.js"), "utf8");
const engineSource = fs.readFileSync(path.join(root, "product/teacher_lesson_engine.js"), "utf8");

new vm.Script(server, { filename: "server.js" });
new vm.Script(teacherUI, { filename: "public/app.js" });
new vm.Script(learnerUI, { filename: "public/frontend-workspace.js" });
new vm.Script(engineSource, { filename: "product/teacher_lesson_engine.js" });

assert.match(server, /app\.get\("\/api\/product\/teacher\/lessons"/);
assert.match(server, /app\.post\("\/api\/product\/teacher\/lessons"/);
assert.match(server, /app\.post\("\/api\/product\/teacher\/lessons\/:lesson_id\/assign"/);
assert.match(server, /app\.get\("\/api\/v1\/learning\/assigned-lessons"/);
assert.match(server, /app\.post\("\/api\/v1\/learning\/assigned-lessons\/:lesson_id\/submit"/);
assert.match(server, /connection\.status === "active"|status: "active"/);
assert.match(teacherUI, /teacher-lesson-studio/);
assert.match(teacherUI, /Lesson Plans & Assessments/);
assert.match(teacherUI, /Prepare lesson with Dream/);
assert.match(learnerUI, /Lessons from My Teacher/);
assert.match(learnerUI, /assigned-lessons/);
assert.match(engineSource, /generateStudyNotes/);
assert.match(engineSource, /generateAI/);
assert.match(engineSource, /correct_answer/);
assert.match(engineSource, /function learnerLessonView/);
assert.match(engineSource, /function submitLesson/);

const engine = require("../product/teacher_lesson_engine");
const store = { learners: { learner_1: { learner_id: "learner_1", name: "Learner One" } }, teacher_lessons: {} };
const lesson = engine.createLesson(store, "teacher_1", {
  success: true,
  topic: "Fractions",
  subject: "Mathematics",
  level: "Grade 6",
  duration_minutes: 40,
  lesson_plan: { objectives: ["Understand fractions"], lesson_steps: [{ stage: "Introduction", minutes: 5, teacher_actions: "Explain", learner_actions: "Listen" }] },
  notes: "A fraction represents part of a whole.",
  assessment_questions: [
    { id: "q_1", question: "Which is one half?", type: "multiple_choice", options: ["1/2", "1/3"], correct_answer: "1/2", explanation: "One of two equal parts.", marks: 1 },
    { id: "q_2", question: "Define numerator.", type: "short_answer", options: [], correct_answer: "The top number", explanation: "It counts the selected parts.", marks: 2 }
  ],
  sources: [{ title: "Open textbook" }],
  evidence_count: 1,
  evidence_status: "retrieved"
});
assert.equal(engine.assignLesson(store, lesson.lesson_id, "teacher_1", "learner_1").success, true);
const learnerView = engine.listAssignedLessons(store, "learner_1")[0];
assert.equal(learnerView.assessment_questions.length, 2);
assert.equal(Object.hasOwn(learnerView.assessment_questions[0], "correct_answer"), false);
const submitted = engine.submitLesson(store, lesson.lesson_id, "learner_1", { q_1: "1/2", q_2: "The top number" });
assert.equal(submitted.success, true);
assert.equal(submitted.submission.score, 1);
assert.equal(submitted.submission.max_score, 1);
assert.equal(submitted.submission.manual_review_required, true);
assert.equal(engine.listLessonSubmissions(store, lesson.lesson_id, "teacher_1").length, 1);
assert.equal(engine.listLessonSubmissions(store, lesson.lesson_id, "other_teacher"), null);

console.log("Teacher Lesson Studio smoke test passed.");
