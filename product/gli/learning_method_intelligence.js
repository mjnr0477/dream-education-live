"use strict";

const METHODS = ["explanation","step_by_step","examples","problem_solving","discussion","auto"];

function scoreMethod(method, signals = {}) {
  const misconception = Boolean(signals.misconception);
  const lowScore = Number(signals.latest_score) < 60;
  const strong = Number(signals.latest_score) >= 80;
  const transfer = Boolean(signals.transfer_ready);
  const preference = String(signals.preferred_method || "").trim();

  let score = 0;
  if (method === "explanation") score += misconception ? 5 : 2;
  if (method === "step_by_step") score += lowScore ? 5 : 2;
  if (method === "examples") score += misconception ? 3 : 2;
  if (method === "problem_solving") score += strong || transfer ? 5 : 1;
  if (method === "discussion") score += transfer ? 4 : 2;
  if (method === "auto") score += 1;
  if (preference === method) score += 3;
  return score;
}

function selectLearningMethod(signals = {}) {
  const ranked = METHODS.map(method => ({
    method,
    score: scoreMethod(method, signals)
  })).sort((a,b) => b.score - a.score);
  return {
    selected_method: ranked[0].method,
    alternatives: ranked.slice(1,4),
    evidence: {
      misconception: Boolean(signals.misconception),
      latest_score: Number.isFinite(Number(signals.latest_score)) ? Number(signals.latest_score) : null,
      transfer_ready: Boolean(signals.transfer_ready),
      preference_respected: Boolean(signals.preferred_method)
    }
  };
}

module.exports = { selectLearningMethod, scoreMethod };
