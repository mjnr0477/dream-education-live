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

  if (definition.length < 20) return null;

  const sourceName =
    retrieval.source?.name ||
    knowledge.source ||
    "verified knowledge source";

  let answer =
    `Based on verified learning evidence from ${sourceName}:

${definition}`;

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
