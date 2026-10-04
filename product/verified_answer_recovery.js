"use strict";

function buildVerifiedEvidenceAnswer(question, retrieval) {
  if (!retrieval || retrieval.success !== true) return null;

  const knowledge = retrieval.knowledge || {};
  const definition = String(knowledge.definition || "").trim();
  const keyIdeas = Array.isArray(knowledge.key_ideas)
    ? knowledge.key_ideas
        .map(item => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const evidence = Array.isArray(retrieval.evidence)
    ? retrieval.evidence
        .filter(item => String(item?.extract || "").trim().length >= 40)
        .slice(0, 3)
    : [];

  if (definition.length < 20 && !evidence.length) return null;

  const sourceName =
    retrieval.source?.name ||
    knowledge.source ||
    "verified knowledge source";

  const evidenceSummary = evidence
    .map(item => String(item.extract || item.snippet || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const factualBody = definition || evidenceSummary;

  if (!factualBody) return null;

  let answer =
    `Based on verified learning evidence from ${sourceName}:

${factualBody}`;

  if (keyIdeas.length) {
    answer +=
      `\n\nKey ideas:\n- ${keyIdeas.join("\n- ")}`;
  }

  answer +=
    `\n\nQuestion addressed: ${String(question || "").trim()}`;

  return answer;
}

module.exports = {
  buildVerifiedEvidenceAnswer
};
