"use strict";

const crypto = require("crypto");


function clean(value, max = 300) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function normalizeAnswer(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

function parseGeneratedJSON(value) {
  const text = String(value || "").trim().replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { return null; }
}

function normalizeQuestions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item, index) => {
    const question = clean(item && item.question, 700);
    const type = item && item.type === "short_answer" ? "short_answer" : "multiple_choice";
    const options = Array.isArray(item && item.options)
      ? item.options.map(option => clean(option, 250)).filter(Boolean).slice(0, 5)
      : [];
    const answer = clean(item && (item.correct_answer || item.answer), 400);
    if (!question || !answer || (type === "multiple_choice" && options.length < 2)) return null;
    if (type === "multiple_choice" && !options.some(option => normalizeAnswer(option) === normalizeAnswer(answer))) return null;
    return {
      id: "q_" + (index + 1),
      question,
      type,
      options: type === "multiple_choice" ? options : [],
      correct_answer: answer,
      explanation: clean(item && item.explanation, 900),
      marks: Math.max(1, Math.min(10, Number(item && item.marks) || 1))
    };
  }).filter(Boolean);
}

function buildFallbackEvidencePacket(input = {}, rawSources = []) {
  const { sourceAdequacy } = require("./knowledge_intelligence_engine");
  const queryEngine = require("./query_engine");
  const verifier = require("./source_verifier");
  const topic = clean(input.topic, 300);
  const subject = clean(input.subject || "General", 100);
  const queryInfo = queryEngine.analyzeQuery(topic, { subject: subject.toLowerCase() });
  const topicTerms = topic.toLowerCase().split(/[^a-z0-9]+/).filter(term =>
    term.length > 2 && !["the", "and", "for", "with", "from", "into", "about"].includes(term)
  );
  const approvedTypes = new Set([
    "educational", "official", "government", "academic", "academic_research",
    "scientific_research", "scientific_reference", "biomedical_research",
    "life_science_research", "technical", "library_reference", "reference"
  ]);
  const seen = new Set();
  const evidence = [];

  for (const row of rawSources) {
    if (!row || typeof row !== "object") continue;
    const title = clean(row.title || row.name || "Free educational source", 250);
    const excerpt = clean(row.extract || row.content || row.text || row.snippet || "", 4000);
    const url = typeof row.url === "string" && /^https?:\/\//i.test(row.url) ? row.url : "";
    const provider = clean(row.provider || row.global_source_id || "", 80).toLowerCase();
    const source = clean(row.source || row.name || provider || "Free educational source", 120);
    if (excerpt.length < 180 || !url || !title) continue;
    // OpenStax is an approved free educational source; keep it eligible
    // for lesson evidence after the relevance and adequacy checks below.
    if (["open_library", "duckduckgo", "wikidata"].includes(provider)) continue;

    const combined = (title + " " + excerpt).toLowerCase();
    const matchedTerms = topicTerms.filter(term => combined.includes(term));
    const requiredMatches = Math.max(1, Math.ceil(topicTerms.length * 0.5));
    if (topicTerms.length && matchedTerms.length < requiredMatches) continue;

    const candidate = {
      ...row,
      title,
      source,
      provider,
      source_type: row.source_type || "reference",
      extract: excerpt,
      snippet: excerpt.slice(0, 600),
      url
    };
    const adequacy = sourceAdequacy(candidate, queryInfo, topic);
    if (!adequacy.adequate) continue;
    const verification = verifier.verifySource(candidate, topic);
    if (!verification.verified && !approvedTypes.has(candidate.source_type)) continue;

    const key = (title + "|" + url).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    evidence.push({
      title,
      excerpt,
      url,
      source,
      provider,
      source_type: candidate.source_type,
      verification_score: verification.score,
      relevance_score: verification.relevance_score,
      cross_source_status: "free-source-fallback"
    });
    if (evidence.length >= 5) break;
  }

  if (!evidence.length) {
    return {
      success: false,
      error: "Free sources did not return enough topic-matched readable content.",
      evidence_status: "insufficient"
    };
  }

  const knowledge = "";
  const primary = evidence[0];
  return {
    success: true,
    query: subject + " " + topic,
    source: {
      title: primary.title,
      name: primary.source,
      url: primary.url,
      verification_score: primary.verification_score
    },
    evidence: evidence.map(item => ({ ...item })),
    knowledge,
    evidence_packet: {
      question: topic,
      query: subject + " " + topic,
      source: {
        title: primary.title,
        name: primary.source,
        verification_score: primary.verification_score
      },
      evidence: evidence.map(item => ({ ...item })),
      knowledge
    }
  };
}

async function retrieveFallbackLessonEvidence(input = {}) {
  const sourceEngine = require("./source_engine");
  const notesProviders = require("./notes_source_providers");
  const subject = clean(input.subject || "General", 100);
  const topic = clean(input.topic, 300);
  const level = clean(input.level || "", 100);
  const query = [subject, topic, level].filter(Boolean).join(" ");
  const outcomes = await Promise.allSettled([
    sourceEngine.searchSources(query, 5),
    notesProviders.searchLibreTexts(query, 4),
    notesProviders.searchOpenStax(query, 3)
  ]);
  const rows = [];
  for (const outcome of outcomes) {
    if (outcome.status !== "fulfilled") continue;
    const value = outcome.value;
    if (Array.isArray(value)) rows.push(...value);
    else if (value && Array.isArray(value.sources)) rows.push(...value.sources);
  }

  // Search snippets from Wikipedia are not lesson notes. Fetch the full page
  // for a small number of candidates before the evidence gate evaluates them.
  const wikipedia = rows.filter(row =>
    row && (row.provider === "wikipedia" || row.source === "Wikipedia") &&
    String(row.extract || row.snippet || "").length < 1000 && row.title
  ).slice(0, 2);
  const pages = await Promise.allSettled(wikipedia.map(row => sourceEngine.getWikipediaPage(row.title)));
  for (let index = 0; index < wikipedia.length; index += 1) {
    const page = pages[index];
    if (page.status === "fulfilled" && page.value && String(page.value.extract || "").length > 180) {
      const row = wikipedia[index];
      row.extract = page.value.extract;
      row.snippet = String(page.value.extract).slice(0, 600);
      row.url = page.value.url || row.url;
      row.source = "Wikipedia";
      row.provider = "wikipedia";
      row.source_type = "reference";
    }
  }

  return buildFallbackEvidencePacket(input, rows);
}

async function generateTeacherLesson(input = {}) {
  const topic = clean(input.topic);
  const subject = clean(input.subject || "General", 100);
  const level = clean(input.level || "Not specified", 100);
  const duration = Math.max(15, Math.min(240, Number(input.duration_minutes) || 40));
  const teacherInstructions = clean(input.instructions, 1200);
  const curriculum = clean(input.curriculum || "Use the curriculum specified by the teacher; do not claim official alignment unless supported by retrieved material.", 180);

  if (topic.length < 2 || subject.length < 2 || level.length < 2) {
    return { success: false, status: 400, error: "Enter a topic, subject and education level." };
  }

  const plannerInput = {
    topic,
    subject,
    level,
    duration_minutes: duration,
    curriculum,
    instructions: teacherInstructions
  };
  const { retrieveKnowledgeIntelligence } = require("./knowledge_intelligence_engine");
  const { buildTeacherLesson } = require("./deterministic_lesson_planner");
  let evidence = null;
  let retrievalError = null;
  let usedFallback = false;
  let evidenceTimeout;

  try {
    evidence = await Promise.race([
      retrieveKnowledgeIntelligence(
        subject + " " + topic + " " + level + (curriculum ? " " + curriculum : ""),
        { limit: 5, context: { subject, topic, level, curriculum, intent: "educational_notes" } }
      ),
      new Promise((_, reject) => {
        evidenceTimeout = setTimeout(() => {
          const error = new Error("Primary knowledge retrieval exceeded its lesson preparation window.");
          error.code = "LESSON_EVIDENCE_TIMEOUT";
          reject(error);
        }, 11500);
      })
    ]);
  } catch (error) {
    retrievalError = error;
  } finally {
    clearTimeout(evidenceTimeout);
  }

  let planned = evidence && evidence.success === true
    ? buildTeacherLesson(plannerInput, evidence)
    : { success: false, error: retrievalError && retrievalError.code === "LESSON_EVIDENCE_TIMEOUT"
        ? "Primary knowledge retrieval timed out."
        : evidence && evidence.error || retrievalError && retrievalError.message || "Primary knowledge retrieval did not return evidence.",
      evidence_status: "insufficient" };

  // The lesson route gets a second pass through Dream's already-connected
  // free-source mesh and the direct open-textbook providers. It does not call
  // an AI provider and it does not change the learner adaptive pipeline.
  if (!planned.success) {
    let fallbackTimeout;
    try {
      const fallback = await Promise.race([
        retrieveFallbackLessonEvidence(plannerInput),
        new Promise((_, reject) => {
          fallbackTimeout = setTimeout(() => reject(new Error("Free-source fallback timed out.")), 8500);
        })
      ]);
      if (fallback && fallback.success) {
        usedFallback = true;
        const combined = {
          ...fallback,
          evidence: [
            ...(evidence && Array.isArray(evidence.evidence) ? evidence.evidence : []),
            ...(fallback.evidence || [])
          ],
          evidence_packet: {
            ...(fallback.evidence_packet || {}),
            evidence: [
              ...(evidence && evidence.evidence_packet && Array.isArray(evidence.evidence_packet.evidence)
                ? evidence.evidence_packet.evidence : []),
              ...(fallback.evidence_packet && Array.isArray(fallback.evidence_packet.evidence)
                ? fallback.evidence_packet.evidence : [])
            ]
          }
        };
        planned = buildTeacherLesson(plannerInput, combined);
      }
    } catch (error) {
      retrievalError = retrievalError || error;
    } finally {
      clearTimeout(fallbackTimeout);
    }
  }

  if (!planned.success) {
    return {
      ...planned,
      status: planned.status || 422,
      error: "Dream could not find enough relevant readable content from its connected free sources to prepare reliable notes. Try a more specific topic or check the source connection.",
      evidence_status: "insufficient",
      retrieval_detail: retrievalError && retrievalError.message || undefined
    };
  }

  return {
    ...planned,
    source_retrieval_method: usedFallback ? "free_source_fallback" : "knowledge_intelligence"
  };
}

function createLesson(store, teacherId, lessonContent) {
  if (!store || !teacherId || !lessonContent || lessonContent.success !== true) {
    throw new Error("A teacher and generated lesson are required.");
  }
  if (!store.teacher_lessons || typeof store.teacher_lessons !== "object") store.teacher_lessons = {};
  const now = new Date().toISOString();
  const lesson = {
    lesson_id: "lesson_" + crypto.randomUUID(),
    teacher_id: String(teacherId),
    topic: lessonContent.topic,
    subject: lessonContent.subject,
    curriculum: lessonContent.curriculum || "",
    level: lessonContent.level,
    duration_minutes: lessonContent.duration_minutes,
    lesson_plan: lessonContent.lesson_plan,
    notes: lessonContent.notes,
    assessment_questions: lessonContent.assessment_questions,
    sources: lessonContent.sources || [],
    evidence_count: lessonContent.evidence_count || 0,
    evidence_status: lessonContent.evidence_status || "retrieved",
    assigned_learner_ids: [],
    submissions: {},
    created_at: now,
    updated_at: now
  };
  store.teacher_lessons[lesson.lesson_id] = lesson;
  return lesson;
}

function listTeacherLessons(store, teacherId) {
  return Object.values(store && store.teacher_lessons || {})
    .filter(lesson => lesson && lesson.teacher_id === String(teacherId))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function assignLesson(store, lessonId, teacherId, learnerId) {
  const lesson = store && store.teacher_lessons && store.teacher_lessons[lessonId];
  if (!lesson || lesson.teacher_id !== String(teacherId)) return { success: false, status: 404, error: "Lesson not found for this teacher." };
  if (!store.learners || !store.learners[learnerId]) return { success: false, status: 404, error: "Learner not found." };
  if (!Array.isArray(lesson.assigned_learner_ids)) lesson.assigned_learner_ids = [];
  if (!lesson.assigned_learner_ids.includes(String(learnerId))) lesson.assigned_learner_ids.push(String(learnerId));
  lesson.updated_at = new Date().toISOString();
  return { success: true, lesson };
}

function learnerLessonView(lesson) {
  return {
    lesson_id: lesson.lesson_id,
    topic: lesson.topic,
    subject: lesson.subject,
    level: lesson.level,
    duration_minutes: lesson.duration_minutes,
    lesson_plan: lesson.lesson_plan,
    notes: lesson.notes,
    assessment_questions: (lesson.assessment_questions || []).map(question => ({
      id: question.id,
      question: question.question,
      type: question.type,
      options: question.options || [],
      marks: question.marks
    })),
    sources: lesson.sources || [],
    evidence_count: lesson.evidence_count || 0,
    assigned_at: lesson.updated_at,
    submission: null
  };
}

function listAssignedLessons(store, learnerId) {
  return Object.values(store && store.teacher_lessons || {})
    .filter(lesson => lesson && Array.isArray(lesson.assigned_learner_ids) && lesson.assigned_learner_ids.includes(String(learnerId)))
    .map(lesson => {
      const view = learnerLessonView(lesson);
      view.submission = lesson.submissions && lesson.submissions[String(learnerId)]
        ? {
            submitted_at: lesson.submissions[String(learnerId)].submitted_at,
            score: lesson.submissions[String(learnerId)].score,
            max_score: lesson.submissions[String(learnerId)].max_score,
            auto_score: lesson.submissions[String(learnerId)].auto_score ?? lesson.submissions[String(learnerId)].score,
            auto_max_score: lesson.submissions[String(learnerId)].auto_max_score ?? lesson.submissions[String(learnerId)].max_score,
            manual_score: lesson.submissions[String(learnerId)].manual_score || 0,
            status: lesson.submissions[String(learnerId)].status,
            manual_review_required: Boolean(lesson.submissions[String(learnerId)].manual_review_required)
          }
        : null;
      return view;
    })
    .sort((a, b) => String(b.assigned_at).localeCompare(String(a.assigned_at)));
}

function submitLesson(store, lessonId, learnerId, answers) {
  const lesson = store && store.teacher_lessons && store.teacher_lessons[lessonId];
  if (!lesson || !Array.isArray(lesson.assigned_learner_ids) || !lesson.assigned_learner_ids.includes(String(learnerId))) {
    return { success: false, status: 404, error: "This lesson is not assigned to your account." };
  }
  const questions = Array.isArray(lesson.assessment_questions) ? lesson.assessment_questions : [];
  const answerMap = answers && typeof answers === "object" ? answers : {};
  let autoScore = 0;
  let autoMax = 0;
  let maxScore = 0;
  const shortAnswerQuestions = questions.filter(question => question.type === "short_answer");
  const responses = questions.map(question => {
    const answer = clean(answerMap[question.id], 1000);
    const marks = Number(question.marks) || 1;
    maxScore += marks;
    if (question.type === "multiple_choice") {
      autoMax += marks;
      const correct = normalizeAnswer(answer) === normalizeAnswer(question.correct_answer);
      if (correct) autoScore += marks;
      return { question_id: question.id, answer, auto_graded: true, correct, marks };
    }
    return { question_id: question.id, answer, auto_graded: false, correct: null, marks };
  });
  if (!lesson.submissions || typeof lesson.submissions !== "object") lesson.submissions = {};
  const submission = {
    learner_id: String(learnerId),
    responses,
    score: autoScore,
    max_score: maxScore,
    auto_score: autoScore,
    auto_max_score: autoMax,
    manual_score: 0,
    manual_scores: {},
    manual_review_required: shortAnswerQuestions.length > 0,
    status: shortAnswerQuestions.length > 0 ? "submitted_pending_teacher_review" : "auto_scored",
    submitted_at: new Date().toISOString(),
    reviewed_at: null
  };
  lesson.submissions[String(learnerId)] = submission;
  lesson.updated_at = new Date().toISOString();
  return { success: true, submission: { score: autoScore, max_score: maxScore, auto_score: autoScore, auto_max_score: autoMax, manual_score: 0, manual_review_required: submission.manual_review_required, status: submission.status, submitted_at: submission.submitted_at } };
}

function reviewLessonSubmission(store, lessonId, teacherId, learnerId, manualScores) {
  const lesson = store && store.teacher_lessons && store.teacher_lessons[lessonId];
  if (!lesson || lesson.teacher_id !== String(teacherId)) {
    return { success: false, status: 404, error: "Lesson not found for this teacher." };
  }
  const submission = lesson.submissions && lesson.submissions[String(learnerId)];
  if (!submission) return { success: false, status: 404, error: "No submission found for this learner." };
  const scoreMap = manualScores && typeof manualScores === "object" ? manualScores : {};
  const shortQuestions = (lesson.assessment_questions || []).filter(question => question.type === "short_answer");
  if (!submission.manual_scores || typeof submission.manual_scores !== "object") submission.manual_scores = {};
  for (const question of shortQuestions) {
    if (!Object.prototype.hasOwnProperty.call(scoreMap, question.id)) continue;
    const score = Number(scoreMap[question.id]);
    const max = Number(question.marks) || 1;
    if (!Number.isFinite(score) || score < 0 || score > max) {
      return { success: false, status: 400, error: "Manual scores must be between zero and the question's maximum marks." };
    }
    submission.manual_scores[question.id] = score;
  }
  const allReviewed = shortQuestions.every(question =>
    Object.prototype.hasOwnProperty.call(submission.manual_scores, question.id)
  );
  submission.manual_score = shortQuestions.reduce((sum, question) =>
    sum + (Number(submission.manual_scores[question.id]) || 0), 0);
  submission.auto_score = Number(submission.auto_score ?? submission.score) || 0;
  submission.score = submission.auto_score + submission.manual_score;
  submission.manual_review_required = !allReviewed;
  submission.status = allReviewed ? "reviewed" : "submitted_pending_teacher_review";
  submission.reviewed_at = allReviewed ? new Date().toISOString() : null;
  lesson.updated_at = new Date().toISOString();
  return { success: true, submission: {
    learner_id: String(learnerId),
    score: submission.score,
    max_score: submission.max_score,
    auto_score: submission.auto_score,
    auto_max_score: submission.auto_max_score,
    manual_score: submission.manual_score,
    manual_review_required: submission.manual_review_required,
    status: submission.status,
    reviewed_at: submission.reviewed_at
  } };
}

function listLessonSubmissions(store, lessonId, teacherId) {
  const lesson = store && store.teacher_lessons && store.teacher_lessons[lessonId];
  if (!lesson || lesson.teacher_id !== String(teacherId)) return null;
  return Object.entries(lesson.submissions || {}).map(([learnerId, submission]) => ({
    learner_id: learnerId,
    learner_name: store.learners && store.learners[learnerId]
      ? String(store.learners[learnerId].name || store.learners[learnerId].full_name || learnerId)
      : learnerId,
    ...submission,
    responses: (submission.responses || []).map(response => {
      const question = (lesson.assessment_questions || []).find(item => item.id === response.question_id) || {};
      return {
        ...response,
        question: question.question || "",
        type: question.type || "short_answer",
        correct_answer: question.correct_answer || "",
        explanation: question.explanation || "",
        marks: Number(question.marks) || 1,
        manual_score: submission.manual_scores && Object.prototype.hasOwnProperty.call(submission.manual_scores, response.question_id)
          ? submission.manual_scores[response.question_id] : null
      };
    })
  }));
}

module.exports = {
  buildFallbackEvidencePacket,
  retrieveFallbackLessonEvidence,
  generateTeacherLesson,
  createLesson,
  listTeacherLessons,
  assignLesson,
  listAssignedLessons,
  submitLesson,
  reviewLessonSubmission,
  listLessonSubmissions,
  learnerLessonView,
  normalizeQuestions,
  parseGeneratedJSON
};
