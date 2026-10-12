"use strict";

function clean(value, max = 1200) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function textFromKnowledge(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const preferred = ["text", "content", "extract", "summary", "description", "answer", "knowledge", "snippet"];
  const pieces = [];
  for (const key of preferred) {
    if (typeof value[key] === "string" && value[key].trim()) pieces.push(value[key]);
  }
  if (!pieces.length) {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && item.trim() && !/url|image|author|date|id/i.test(key)) pieces.push(item);
      if (pieces.length >= 8) break;
    }
  }
  return pieces.join("\n");
}

function collectEvidence(evidence) {
  const packet = evidence && evidence.evidence_packet || {};
  const rows = Array.isArray(packet.evidence) ? packet.evidence :
    (Array.isArray(evidence && evidence.evidence) ? evidence.evidence : []);
  const primary = evidence && evidence.source || packet.source || {};
  const items = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const title = clean(row.title || row.name || row.source || row.provider || "Retrieved educational source", 250);
    const excerpt = clean(row.excerpt || row.snippet || row.extract || row.content || row.text || "", 4000);
    const url = typeof row.url === "string" && /^https?:\/\//i.test(row.url) ? row.url : null;
    const key = (title + "|" + excerpt).toLowerCase();
    if (excerpt.length >= 30 && !seen.has(key)) {
      seen.add(key);
      items.push({ title, excerpt, url });
    }
  }

  const knowledge = textFromKnowledge(packet.knowledge || (evidence && evidence.knowledge));
  if (knowledge.length >= 30 && !items.some(item => item.excerpt === knowledge)) {
    items.push({
      title: clean(primary.title || primary.name || "Retrieved knowledge", 250),
      excerpt: knowledge.slice(0, 4000),
      url: typeof primary.url === "string" && /^https?:\/\//i.test(primary.url) ? primary.url : null
    });
  }

  if (!items.length && evidence && evidence.source) {
    const excerpt = clean(evidence.source.extract || evidence.source.snippet || "", 4000);
    if (excerpt.length >= 30) items.push({
      title: clean(evidence.source.title || evidence.source.name || "Retrieved educational source", 250),
      excerpt,
      url: typeof evidence.source.url === "string" && /^https?:\/\//i.test(evidence.source.url) ? evidence.source.url : null
    });
  }

  return { items: items.slice(0, 6), primary, rows };
}

function splitStatements(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|(?<=;)\s+|(?<=:)\s+/)
    .map(part => part.trim())
    .filter(part => part.length >= 28)
    .filter((part, index, all) => all.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index)
    .slice(0, 12);
}

function buildTeacherLesson(input = {}, evidence) {
  const topic = clean(input.topic, 300);
  const subject = clean(input.subject || "General", 100);
  const level = clean(input.level || "Not specified", 100);
  const duration = Math.max(15, Math.min(240, Number(input.duration_minutes) || 40));
  const curriculum = clean(input.curriculum || "Not specified", 180);
  const instructions = clean(input.instructions, 1200);
  const { items, primary, rows } = collectEvidence(evidence || {});
  const evidenceText = items.map(item => item.excerpt).join("\n\n");
  const statements = splitStatements(evidenceText);

  if (evidence && evidence.success !== true) {
    return { success: false, status: 422, error: "Dream could not verify enough relevant source evidence to prepare this lesson.", evidence_status: "insufficient" };
  }
  if (evidenceText.length < 80 || statements.length < 2) {
    return {
      success: false,
      status: 422,
      error: "Dream found too little readable topic evidence to prepare reliable notes and an assessment. Try a more specific topic or another source.",
      evidence_status: "insufficient",
      evidence_count: items.length
    };
  }

  const objectives = [
    "Identify the main ideas about " + topic + " in the supplied source material.",
    "Explain at least two source-supported details about " + topic + " in the learner's own words.",
    "Use evidence from the supplied material to answer questions about " + topic + ".",
    "Distinguish statements supported by the sources from questions that require further research."
  ];
  const sourceParagraphs = items.map((item, index) =>
    "### " + (index + 1) + ". " + item.title + "\n" + item.excerpt +
    (item.url ? "\n\nSource: " + item.url : "")
  );
  const notes = [
    "# " + topic,
    "**Subject:** " + subject + "  ",
    "**Level:** " + level + "  ",
    "**Curriculum/framework requested:** " + curriculum,
    "",
    "## Learning notes from retrieved evidence",
    ...sourceParagraphs,
    "",
    "## Key ideas to teach",
    ...statements.slice(0, 6).map(statement => "- " + statement),
    "",
    "## Teacher evidence check",
    "- These notes organize the retrieved material; they do not claim official curriculum approval.",
    "- Check that the source details suit the learners' level and the curriculum you teach.",
    "- If the sources disagree or omit a required explanation, verify it before teaching rather than filling the gap with an unsupported claim.",
    instructions ? "- Teacher's additional instructions: " + instructions : ""
  ].filter(Boolean).join("\n");

  const baseStages = [
    { stage: "Connect to prior learning", share: 0.1, teacher_actions: "Ask learners what they already know about " + topic + ". Record their ideas as prior knowledge, not as verified facts.", learner_actions: "Share examples, questions, or initial ideas.", checks_for_understanding: "Invite two learners to explain their starting ideas." },
    { stage: "Explore the source evidence", share: 0.25, teacher_actions: "Present the retrieved source excerpts and identify where each excerpt came from.", learner_actions: "Read or listen to the excerpts and underline key statements.", checks_for_understanding: "Ask learners to point to the sentence supporting a claim." },
    { stage: "Explain and model", share: 0.25, teacher_actions: "Model how to restate one source-supported idea in clear language without changing its meaning.", learner_actions: "Summarize the idea in their own words and compare it with the source.", checks_for_understanding: "Check that the summary preserves the source's meaning." },
    { stage: "Guided and independent practice", share: 0.25, teacher_actions: "Use the evidence questions below. Ask learners to support answers with a source detail.", learner_actions: "Answer individually or in pairs and cite the source detail used.", checks_for_understanding: "Review whether answers are supported by the provided evidence." },
    { stage: "Review and exit check", share: 0.15, teacher_actions: "Revisit the objectives and ask learners to state one supported idea and one remaining question.", learner_actions: "Write a brief summary and identify anything needing further research.", checks_for_understanding: "Use the exit response to plan the next lesson." }
  ];
  let allocated = 0;
  const lessonSteps = baseStages.map((stage, index) => {
    const minutes = index === baseStages.length - 1
      ? duration - allocated
      : Math.max(1, Math.round(duration * stage.share));
    allocated += minutes;
    return {
      stage: stage.stage,
      minutes,
      teacher_actions: stage.teacher_actions,
      learner_actions: stage.learner_actions,
      checks_for_understanding: stage.checks_for_understanding
    };
  });

  const questionPrompts = [
    "State the main idea about " + topic + " supported by the retrieved material.",
    "What is one specific detail the source gives about " + topic + "?",
    "Choose a source statement that helps explain " + topic + " and restate it in your own words.",
    "Which detail from the source would you use as evidence when explaining " + topic + "?",
    "What can you conclude from the supplied material about " + topic + ", and which statement supports your conclusion?"
  ];
  const answerStatements = statements.slice(0, 5);
  while (answerStatements.length < 5) answerStatements.push(statements[answerStatements.length % statements.length]);
  const assessmentQuestions = questionPrompts.map((question, index) => ({
    id: "q_" + (index + 1),
    question,
    type: "short_answer",
    options: [],
    correct_answer: answerStatements[index],
    explanation: "Teacher marking guidance: accept an accurate paraphrase that is supported by the cited source; do not require claims beyond the supplied evidence.",
    marks: index === 4 ? 2 : 1
  }));

  const sources = items.map(item => ({ title: item.title, url: item.url }))
    .filter((item, index, all) => all.findIndex(other => other.title === item.title && other.url === item.url) === index)
    .slice(0, 6);
  if (!sources.length && primary && primary.title) {
    sources.push({
      title: clean(primary.title || primary.name || "Retrieved educational source", 250),
      url: typeof primary.url === "string" && /^https?:\/\//i.test(primary.url) ? primary.url : null
    });
  }

  return {
    success: true,
    topic,
    subject,
    curriculum,
    level,
    duration_minutes: duration,
    lesson_plan: {
      prior_knowledge: ["Learners share existing ideas about " + topic; record them separately from verified source facts."],
      key_vocabulary: [],
      objectives,
      key_inquiry_questions: [
        "Which ideas about " + topic + " are directly supported by the source?",
        "What evidence would help answer the questions the source leaves open?"
      ],
      competencies_and_values: ["Evidence-based reasoning", "Communication", "Respectful discussion"],
      teacher_preparation: [
        "Read the cited excerpts and check their relevance to the class level.",
        "Prepare the source text in an accessible format.",
        "Review the assessment answers against the cited evidence before using them."
      ],
      differentiation: {
        support: ["Provide the source excerpts in short sections and help learners locate the sentence that supports an answer."],
        core: ["Ask learners to summarize source-supported ideas and cite evidence."],
        extension: ["Ask learners to compare two source excerpts and identify agreement, differences, or unanswered questions."]
      },
      safety_and_inclusion: ["Offer reading support or oral responses where appropriate.", "Use accessible examples and allow learners time to process the source material."],
      board_plan: ["Topic: " + topic, "Learning objectives", "Key statements supported by the source", "Evidence and questions still to investigate"],
      marking_guidance: [
        "Award marks for accurate understanding supported by the supplied sources.",
        "Accept valid paraphrases; do not reward unsupported claims as source-backed facts.",
        "The answer suggestions are evidence anchors, not the only acceptable wording."
      ],
      remediation: ["Revisit the relevant source excerpt with the learner and model how to identify a supporting statement."],
      teacher_reflection_questions: ["Which source-supported idea did learners explain accurately?", "Which concept needs stronger or more relevant evidence before the next lesson?"],
      materials: ["Retrieved source excerpts", "Board or display", "Learner notebooks", "Assessment questions"],
      lesson_steps: lessonSteps,
      activities: ["Annotate source excerpts", "Summarize a supported idea", "Pair-check an answer against the source", "Write an exit reflection"],
      homework: ["Write a short summary of " + topic + " using at least two source details and list one question that needs further evidence."]
    },
    notes,
    assessment_questions: assessmentQuestions,
    sources,
    evidence_count: Math.max(items.length, rows.length ? 1 : 0),
    evidence_status: "retrieved",
    generation_method: "dream_deterministic_evidence_planner",
    ai_provider: null
  };
}

module.exports = { buildTeacherLesson, collectEvidence, splitStatements };
