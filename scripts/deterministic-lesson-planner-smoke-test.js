"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const planner = require("../product/deterministic_lesson_planner");
const lessonEngineSource = fs.readFileSync(path.join(__dirname, "../product/teacher_lesson_engine.js"), "utf8");

assert.doesNotMatch(lessonEngineSource, /generateAI|ai_provider_router/, "Teacher lesson generation must not call an AI provider.");
assert.match(lessonEngineSource, /buildTeacherLesson/, "Teacher lesson engine must use Dream's own planner.");

const evidence = {
  success: true,
  source: { title: "Open learning reference", url: "https://example.org/learning" },
  evidence: [
    {
      title: "Open learning reference",
      excerpt: "Photosynthesis is the process by which green plants use light energy to make sugars from carbon dioxide and water. Chlorophyll absorbs light energy, mainly in the leaves. Oxygen is released during the process. The sugars provide stored chemical energy for plant growth. Light intensity, water availability, and carbon dioxide can affect the rate of photosynthesis.",
      url: "https://example.org/learning"
    }
  ],
  evidence_packet: {
    evidence: [
      {
        title: "Open learning reference",
        excerpt: "Photosynthesis is the process by which green plants use light energy to make sugars from carbon dioxide and water. Chlorophyll absorbs light energy, mainly in the leaves. Oxygen is released during the process. The sugars provide stored chemical energy for plant growth. Light intensity, water availability, and carbon dioxide can affect the rate of photosynthesis.",
        url: "https://example.org/learning"
      }
    ]
  }
};

const lesson = planner.buildTeacherLesson({
  topic: "Photosynthesis",
  subject: "Biology",
  level: "Grade 7",
  duration_minutes: 40,
  curriculum: "Kenya CBC"
}, evidence);

assert.equal(lesson.success, true);
assert.equal(lesson.generation_method, "dream_deterministic_evidence_planner");
assert.equal(lesson.ai_provider, null);
assert.equal(lesson.duration_minutes, 40);
assert.ok(lesson.notes.includes("Photosynthesis is the process"));
assert.ok(lesson.notes.includes("https://example.org/learning"));
assert.ok(lesson.lesson_plan.objectives.length >= 3);
assert.equal(lesson.lesson_plan.lesson_steps.reduce((sum, step) => sum + step.minutes, 0), 40);
assert.ok(lesson.lesson_plan.lesson_steps.length >= 4);
assert.equal(lesson.assessment_questions.length, 5);
assert.ok(lesson.assessment_questions.every(question => question.type === "short_answer"));
assert.ok(lesson.assessment_questions.every(question => question.correct_answer.length > 0));
assert.ok(lesson.sources.some(source => source.url === "https://example.org/learning"));

const weakEvidence = planner.buildTeacherLesson(
  { topic: "Photosynthesis", subject: "Biology", level: "Grade 7" },
  { success: true, evidence: [{ title: "Tiny", excerpt: "Plants grow." }] }
);
assert.equal(weakEvidence.success, false);
assert.equal(weakEvidence.evidence_status, "insufficient");

const unavailable = planner.buildTeacherLesson(
  { topic: "Photosynthesis", subject: "Biology", level: "Grade 7" },
  { success: false, error: "No relevant evidence" }
);
assert.equal(unavailable.success, false);
assert.equal(unavailable.evidence_status, "insufficient");

console.log("Deterministic evidence-based lesson planner smoke test passed.");
