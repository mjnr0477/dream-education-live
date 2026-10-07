"use strict";

/*
 * Dream Education Learning Resource Intent
 *
 * Converts natural learner requests into resource preferences without
 * requiring the learner to understand Dream's resource taxonomy.
 */

const TYPE_PATTERNS = [
  ["video", /\b(video|watch|youtube|visual lesson|documentary|lecture)\b/i],
  ["image", /\b(image|picture|photo|diagram|illustration|visualize|visual)\b/i],
  ["audio", /\b(audio|listen|podcast|sound|spoken)\b/i],
  ["experiment", /\b(experiment|hands[- ]?on|lab|practical|simulation|simulate|interactive)\b/i],
  ["research", /\b(research|paper|academic|study|journal|evidence|citation)\b/i],
  ["book", /\b(book|textbook|chapter|reading)\b/i],
  ["document", /\b(document|pdf|notes|handout|worksheet)\b/i],
  ["article", /\b(article|explain|read|lesson|guide)\b/i]
];

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function inferLearningResourceIntent(query, requestedType) {
  const text = normalize(query);
  const explicit = Array.isArray(requestedType)
    ? requestedType.filter(Boolean)
    : requestedType ? [requestedType] : [];

  if (explicit.length && !explicit.includes("any")) {
    return {
      types: explicit,
      mode: "explicit",
      confidence: 1,
      reason: "The learner selected a resource format."
    };
  }

  const detected = [];
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(text)) detected.push(type);
  }

  if (detected.length) {
    return {
      types: detected,
      mode: "natural_language",
      confidence: Math.min(0.98, 0.72 + detected.length * 0.06),
      reason: "Resource format inferred from the learner's wording."
    };
  }

  return {
    types: ["any"],
    mode: "broad_discovery",
    confidence: 0.55,
    reason: "No preferred format was stated, so Dream can compare multiple useful formats."
  };
}

module.exports = { inferLearningResourceIntent };
