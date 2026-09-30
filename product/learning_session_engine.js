"use strict";

/*
 * Meaningful learning-session planner.
 *
 * This is an additive layer around the protected adaptive engines.
 * It turns one learner question into a structured cycle:
 * orient -> teach from evidence -> retrieve -> apply -> reflect -> next action.
 */

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function evidenceList(evidence = []) {
  return (Array.isArray(evidence) ? evidence : [])
    .filter(item => item && (item.title || item.name || item.provider))
    .slice(0, 5)
    .map(item => ({
      title: clean(item.title || item.name || "Verified source"),
      provider: clean(item.provider || item.name || "source"),
      url: item.url || null,
      verification_score: Number(item.verification_score || 0),
      relevance_score: Number(item.relevance_score || 0),
      cross_source_status: item.cross_source_status || "single_source",
      supporting_sources: Number(item.supporting_sources || 0),
      conflicting_sources: Number(item.conflicting_sources || 0)
    }));
}

function classify(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "not_assessed";
  if (value >= 85) return "strong";
  if (value >= 70) return "developing";
  if (value >= 50) return "needs_reinforcement";
  return "needs_correction";
}

function buildTeachingFocus({ question, topic, subject, evidence, score }) {
  const source = evidence[0];
  const focus = clean(topic || subject || "the concept");
  const evidenceNote = source
    ? "Teaching is grounded in " + source.title + "."
    : "Teaching should remain grounded in verified curriculum or evidence.";

  if (Number(score) >= 85) {
    return {
      mode: "extend",
      objective: "Apply " + focus + " beyond the original question.",
      instruction: "Explain the idea in your own words, then connect it to a new example.",
      evidence_note: evidenceNote
    };
  }

  if (Number(score) >= 70) {
    return {
      mode: "clarify",
      objective: "Strengthen the key idea behind " + focus + ".",
      instruction: "Review the key evidence, identify the missing part of the explanation, and restate the concept.",
      evidence_note: evidenceNote
    };
  }

  return {
    mode: "repair",
    objective: "Repair the learner's understanding of " + focus + ".",
    instruction: "Teach the core idea in small steps, check the learner's reasoning, then ask them to retrieve the idea without looking.",
    evidence_note: evidenceNote
  };
}

function buildNextQuestion({ subject, topic, score, question }) {
  const focus = clean(topic || subject || "this concept");
  const value = Number(score);

  if (value >= 85) {
    return {
      type: "application",
      subject: subject || "General",
      topic: topic || null,
      question: "Apply " + focus + " to a new real-world example and explain why your answer works."
    };
  }

  if (value >= 70) {
    return {
      type: "retrieval",
      subject: subject || "General",
      topic: topic || null,
      question: "Without looking back, explain the main idea of " + focus + " and give one example."
    };
  }

  return {
    type: "recovery",
    subject: subject || "General",
    topic: topic || null,
    question: "Let's rebuild " + focus + ". What is the first important idea you would use to answer the original question?"
  };
}

function buildLearningSession({
  question,
  learnerAnswer,
  subject = null,
  topic = null,
  level = null,
  score = 0,
  understanding = "needs_practice",
  feedback = "",
  evidence = [],
  crossSourceVerification = null,
  priorAverage = null,
  attemptNumber = 1
} = {}) {
  const sources = evidenceList(evidence);
  const masteryState = classify(score);
  const focus = clean(topic || subject || "the current concept");
  const teaching = buildTeachingFocus({
    question,
    topic,
    subject,
    evidence: sources,
    score
  });

  const nextQuestion = buildNextQuestion({
    subject,
    topic,
    score,
    question
  });

  const status = crossSourceVerification?.status || "single_source";

  return {
    version: "1.0.0",
    session_goal: "turn an answer into measurable learning progress",
    learning_objective: "Understand and demonstrate " + focus,
    phase_sequence: [
      "orient",
      "evidence_teaching",
      "retrieval",
      "application",
      "reflection"
    ],
    current_phase: "reflection",
    mastery_state: masteryState,
    understanding,
    score: Number(score) || 0,
    prior_average:
      Number.isFinite(Number(priorAverage)) ? Number(priorAverage) : null,
    improvement_from_prior:
      Number.isFinite(Number(priorAverage))
        ? Number(score || 0) - Number(priorAverage)
        : null,
    attempt_number: Number(attemptNumber) || 1,
    learner_answer: clean(learnerAnswer),
    feedback: clean(feedback),
    evidence: sources,
    evidence_status: status,
    teaching,
    retrieval_prompt:
      "Close the source material and explain the key idea from memory.",
    application_prompt: nextQuestion.question,
    reflection_prompt:
      "What part of this concept is clear now, and what part still needs practice?",
    next_action:
      masteryState === "strong"
        ? "apply_and_extend"
        : masteryState === "developing"
          ? "retrieve_and_reassess"
          : "teach_repair_and_reassess",
    next_question: nextQuestion,
    completed: true,
    completed_at: new Date().toISOString()
  };
}

module.exports = {
  buildLearningSession,
  classify
};
