"use strict";

const crypto = require("crypto");

function clean(value) {
  return String(value || "").trim();
}

function buildLearningPassport({ learner = {}, assessments = [], outcomes = [], credentials = [] } = {}) {
  const learnerId = clean(learner.learner_id);
  const assessmentRows = Array.isArray(assessments) ? assessments : [];
  const outcomeRows = Array.isArray(outcomes) ? outcomes : [];
  const credentialRows = Array.isArray(credentials) ? credentials : [];

  const competencyMap = new Map();

  for (const row of assessmentRows) {
    const competency = clean(row.topic || row.subject || "General");
    if (!competencyMap.has(competency)) competencyMap.set(competency, []);
    competencyMap.get(competency).push({
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
      date: row.created_at || null
    });
  }

  const competencies = [...competencyMap.entries()].map(([name, rows]) => {
    const scores = rows.map(r => r.score).filter(Number.isFinite);
    const latest = scores.length ? scores[0] : null;
    return {
      competency: name,
      evidence_count: rows.length,
      latest_score: latest,
      status: latest === null ? "evidence_pending" : latest >= 80 ? "strong" : latest >= 60 ? "developing" : "needs_support"
    };
  });

  const measuredOutcomes = outcomeRows.filter(o =>
    Number.isFinite(Number(o.baseline)) &&
    Number.isFinite(Number(o.current))
  );

  const evidence = {
    assessments: assessmentRows.length,
    measured_outcomes: measuredOutcomes.length,
    credentials: credentialRows.length
  };

  const payload = JSON.stringify({
    learner_id: learnerId,
    competencies,
    evidence
  });

  return {
    version: "1.0.0",
    learner_id: learnerId,
    issued_at: new Date().toISOString(),
    competencies,
    evidence,
    credentials: credentialRows,
    verification: {
      protocol: "dream-education-passport",
      fingerprint: crypto.createHash("sha256").update(payload).digest("hex")
    }
  };
}

module.exports = { buildLearningPassport };
