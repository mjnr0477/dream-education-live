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

/*
 * Convert a natural-language resource request into the actual learning
 * concept we should send to media providers.
 *
 * Examples:
 *   "show me a photo of meiosis" -> "meiosis"
 *   "I want a video explaining photosynthesis" -> "photosynthesis"
 *   "listen to audio about mitosis" -> "mitosis"
 *
 * This keeps provider search focused on the concept instead of request
 * filler, which materially improves relevance for images, audio and video.
 */
function extractLearningTopic(query) {
  let text = normalize(query);
  if (!text) return "";

  const removable = [
    /^(please\s+)?show\s+me\s+(a\s+)?/i,
    /^(please\s+)?give\s+me\s+(a\s+)?/i,
    /^(please\s+)?find\s+(me\s+)?/i,
    /^(please\s+)?i\s+want\s+(to\s+)?/i,
    /^(please\s+)?can\s+you\s+/i,
    /^(please\s+)?could\s+you\s+/i,
    /^(please\s+)?let\s+me\s+/i,
    /^(please\s+)?help\s+me\s+/i,
    /^(please\s+)?teach\s+me\s+/i
  ];

  removable.forEach(pattern => {
    text = text.replace(pattern, "");
  });

  text = text
    .replace(/\b(explain|explaining|about|of|on|for|with|related to)\b/gi, " ")
    .replace(/\b(a|an|the)\b/gi, " ")
    .replace(/\b(photo|photos|picture|pictures|image|images|diagram|diagrams|illustration|illustrations)\b/gi, " ")
    .replace(/\b(video|videos|movie|movies|documentary|lecture|lesson)\b/gi, " ")
    .replace(/\b(audio|sound|sounds|podcast|recording)\b/gi, " ")
    .replace(/\b(experiment|experiments|simulation|simulations|interactive|demonstration|demonstrations)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || normalize(query);
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

module.exports = { inferLearningResourceIntent, extractLearningTopic };
