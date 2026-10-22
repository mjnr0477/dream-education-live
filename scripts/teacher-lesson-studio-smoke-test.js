"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const teacherUI = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const lessonStudioStart = teacherUI.indexOf("async function openTeacherLessonStudio");
const lessonStudioEnd = teacherUI.indexOf("\nasync function ", lessonStudioStart + 10);
const lessonStudioSource = teacherUI.slice(lessonStudioStart, lessonStudioEnd);
assert.notEqual(lessonStudioStart, -1, "Teacher Lesson Studio entry point must exist.");
assert.match(lessonStudioSource, /const escape = value => String\(value == null \? "" : value\)\.replace/, "Lesson Studio must define its own HTML escape helper, independent of dashboard-local functions.");
assert.doesNotMatch(lessonStudioSource, /teacherEscapeHTML/, "Lesson Studio must not reference a helper scoped inside teacherDashboardMarkup.");
const learnerUI = fs.readFileSync(path.join(root, "public/frontend-workspace.js"), "utf8");
const engineSource = fs.readFileSync(path.join(root, "product/teacher_lesson_engine.js"), "utf8");
const plannerSource = fs.readFileSync(path.join(root, "product/deterministic_lesson_planner.js"), "utf8");
const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const teacherStyles = fs.readFileSync(path.join(root, "public/teacher-workspace.css"), "utf8");
const schoolWorkspaceSource = fs.readFileSync(path.join(root, "public/school-workspace.js"), "utf8");
new vm.Script(schoolWorkspaceSource, { filename: "public/school-workspace.js" });

new vm.Script(server, { filename: "server.js" });
new vm.Script(teacherUI, { filename: "public/app.js" });
new vm.Script(learnerUI, { filename: "public/frontend-workspace.js" });
new vm.Script(engineSource, { filename: "product/teacher_lesson_engine.js" });

assert(index.includes("teacher-workspace.css?v="), "Teacher workspace stylesheet must be loaded.");
assert(teacherStyles.includes(".teacher-dashboard-header"), "Teacher dashboard must use the visual refresh.");
assert(teacherStyles.includes(".teacher-lesson-preparation-grid"), "Lesson preparation cards must be styled.");
assert(teacherStyles.includes("@media (max-width: 760px)"), "Teacher surfaces must have responsive mobile styles.");

const authHelperStart = server.indexOf("async function getAuthenticatedAccount");
const authHelperEnd = server.indexOf("\n}\n", authHelperStart);
const authHelperSource = server.slice(authHelperStart, authHelperEnd);
assert.match(authHelperSource, /isOwnerAccount\(\{ email: verifiedEmail \}\)/, "Owner status must be resolved from the verified Supabase email, not stale stored flags.");
assert.match(authHelperSource, /owner_account: true/, "Verified owner authentication must normalize the owner flag for protected routes.");
assert.match(server, /const connectedLearners = isOwner\s*\? Object\.values\(store\.learners \|\| \{\}\)/, "Owner Lesson Studio must list learner profiles for owner assignment.");
assert.match(server, /Only a teacher or the project owner can assign a lesson/, "Owner may assign lessons through the owner workspace.");
assert.match(server, /Only a teacher or the project owner can grade lesson submissions/, "Owner may review lesson submissions.");
assert.match(server, /app\.get\("\/api\/v1\/teacher\/lessons"/);
assert.match(server, /app\.post\("\/api\/v1\/teacher\/lessons"/);
assert.match(server, /app\.post\("\/api\/v1\/teacher\/lessons\/:lesson_id\/assign"/);
assert.match(server, /app\.post\("\/api\/v1\/teacher\/lessons\/:lesson_id\/submissions\/:learner_id\/review"/);
assert.match(server, /app\.get\("\/api\/v1\/learning\/assigned-lessons"/);
assert.match(server, /app\.post\("\/api\/v1\/learning\/assigned-lessons\/:lesson_id\/submit"/);
assert.match(server, /connection\.status === "active"|status: "active"/);
assert.match(teacherUI, /teacher-lesson-studio/);
assert.match(teacherUI, /Lesson Plans & Assessments/);
assert.match(teacherUI, /Prepare lesson with Dream/);
assert.match(teacherUI, /\}, 120000\)/, "Lesson generation needs a longer client timeout than normal API requests.");
assert.match(teacherUI, /Preparing lesson…/);
assert.match(teacherUI, /controller\.abort\(\)/, "Teacher lesson requests must time out through response-body parsing.");
assert.match(schoolWorkspaceSource, /fetchSchoolLessonJSON/, "School lesson requests must use a bounded JSON request.");
assert.match(schoolWorkspaceSource, /Math\.round\(timeoutMs \/ 1000\)/, "School request timeout feedback must reflect the configured timeout.");
assert.match(schoolWorkspaceSource, /did not respond within /, "School lesson UI must explain a stalled request.");
assert.match(teacherUI, /data-teacher-lesson-card/, "Teacher results must have a target for automatic scrolling.");
assert.match(teacherUI, /createdCard\.scrollIntoView/, "Teacher UI must scroll to the newly generated lesson.");
assert.match(schoolWorkspaceSource, /renderSchoolLessonCard/, "School UI must render a lesson returned directly by the create request.");
assert.match(schoolWorkspaceSource, /loadSchoolLessons\(data\.lesson\)/, "School UI must show the create response even if saved-list retrieval misses it.");
assert.match(schoolWorkspaceSource, /resultTarget\.innerHTML = renderSchoolLessonCard\(data\.lesson, true\)/, "School UI must display the lesson response before attempting to refresh saved lessons.");
assert.match(schoolWorkspaceSource, /createdCard\.scrollIntoView/, "School UI must scroll to the newly generated lesson.");
assert.match(schoolWorkspaceSource, /expandDetails \? ' open' : ''/, "New school lesson results must open their details immediately.");
assert.match(engineSource, /buildTeacherLesson/);
assert.match(learnerUI, /Lessons from My Teacher/);
assert.match(learnerUI, /assigned-lessons/);
assert.match(engineSource, /retrieveKnowledgeIntelligence/);
assert.match(engineSource, /retrieveFallbackLessonEvidence/, "Lesson generation must retry through the connected free-source mesh.");
assert.match(engineSource, /searchLibreTexts/, "Lesson fallback must query free LibreTexts content.");
assert.match(engineSource, /searchOpenStax/, "Lesson fallback must query the free OpenStax catalog.");
assert.match(teacherUI, /data-lesson-notes-open/, "Teacher cards must expose a dedicated Lesson Notes button.");
assert.match(teacherUI, /data-lesson-notes-panel/, "Teacher Lesson Notes button must open the notes panel.");
assert.match(schoolWorkspaceSource, /data-school-lesson-notes-open/, "School lesson cards must expose a Lesson Notes button.");

const lessonEngine = require("../product/teacher_lesson_engine");
const fallbackPacket = lessonEngine.buildFallbackEvidencePacket(
  { topic: "Photosynthesis", subject: "Biology" },
  [{
    title: "Photosynthesis - LibreTexts",
    source: "LibreTexts Open Textbooks",
    provider: "libretexts",
    source_type: "educational",
    url: "https://bio.libretexts.org/photosynthesis",
    extract: "Photosynthesis is the process by which green plants use light energy to make sugars from carbon dioxide and water. Chlorophyll absorbs light energy in plant cells. Oxygen is released during the process. The sugars provide chemical energy for plant growth."
  }]
);
assert.equal(fallbackPacket.success, true, "Relevant free educational evidence should be accepted by the fallback.");
const unrelatedFallback = lessonEngine.buildFallbackEvidencePacket(
  { topic: "relativity", subject: "Physics" },
  [{
    title: "Actual surgery time relative to scheduled surgery time",
    source: "Medical journal",
    provider: "crossref",
    source_type: "academic_research",
    url: "https://example.org/surgery-time",
    extract: "This study examines actual surgery time relative to scheduled surgery time in robotic-assisted thoracic surgery cases. The researchers compared planned operating times with actual operating times and scheduling records."
  }]
);
assert.equal(unrelatedFallback.success, false, "Unrelated evidence must never be used for a lesson.");
assert.doesNotMatch(engineSource, /generateStudyNotes/, "Lesson preparation should not make a second sequential AI call for notes.");
assert.doesNotMatch(engineSource, /generateAI|ai_provider_router/, "Lesson generation must not call an AI provider.");
assert.match(engineSource, /generation_method|buildTeacherLesson/);
assert.match(plannerSource, /key_inquiry_questions/);
assert.match(plannerSource, /teacher_preparation/);
assert.match(plannerSource, /differentiation/);
assert.match(plannerSource, /teacher_reflection_questions/);
assert.match(teacherUI, /Curriculum\/framework/);
assert.match(teacherUI, /Evidence sources/);
assert.match(engineSource, /correct_answer/);
assert.match(engineSource, /function learnerLessonView/);
assert.match(engineSource, /function submitLesson/);
assert.match(engineSource, /function reviewLessonSubmission/);

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
assert.equal(submitted.submission.max_score, 3);
assert.equal(submitted.submission.auto_max_score, 1);
assert.equal(submitted.submission.manual_review_required, true);
assert.equal(engine.listLessonSubmissions(store, lesson.lesson_id, "teacher_1").length, 1);
const reviewed = engine.reviewLessonSubmission(store, lesson.lesson_id, "teacher_1", "learner_1", { q_2: 1 });
assert.equal(reviewed.success, true);
assert.equal(reviewed.submission.score, 2);
assert.equal(reviewed.submission.manual_review_required, false);
assert.equal(reviewed.submission.status, "reviewed");
assert.equal(engine.listLessonSubmissions(store, lesson.lesson_id, "other_teacher"), null);

console.log("Teacher Lesson Studio smoke test passed.");
