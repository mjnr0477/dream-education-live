"use strict";

function normalizeResourceEvent(input = {}) {
  const resource = input.resource || {};
  const learnerId = String(input.learner_id || "").trim();
  const title = String(resource.title || input.title || "Learning resource").trim().slice(0, 500);
  const topic = String(input.topic || resource.topic || title).trim().slice(0, 300);
  const subject = String(input.subject || resource.subject || "General").trim().slice(0, 120);
  const type = String(resource.type || input.type || "web").trim().slice(0, 40);
  const provider = String(resource.provider || input.provider || "unknown").trim().slice(0, 80);
  const url = String(resource.url || input.url || "").trim().slice(0, 2000);
  const completed = input.completed === true;
  const durationSeconds = Math.max(0, Math.min(Number(input.duration_seconds) || 0, 86400));
  if (!learnerId) throw new Error("learner_id_required");
  if (!url) throw new Error("resource_url_required");
  return { learner_id: learnerId, title, topic, subject, type, provider, url, completed, duration_seconds: durationSeconds, timestamp: new Date().toISOString() };
}

function buildResourceEvidence(event) {
  return {
    question: event.title,
    learner_answer: event.completed ? "Completed learning resource." : "Opened learning resource.",
    subject: event.subject,
    topic: event.topic,
    score: event.completed ? 1 : 0,
    understanding: event.completed ? "resource_completed" : "resource_opened",
    feedback: "Learner " + (event.completed ? "completed" : "opened") + " a " + event.type + " resource from " + event.provider + "."
  };
}

module.exports = { normalizeResourceEvent, buildResourceEvidence };