"use strict";

/*
 * Knowledge Intelligence Engine
 *
 * Evidence-first knowledge orchestration. It is intentionally NOT a
 * second AI teacher and does not replace the adaptive engine.
 *
 * Pipeline:
 *   learner text -> query understanding -> domain/topic routing
 *   -> evidence retrieval -> source adequacy gate -> verified packet
 *
 * AI may later explain this packet, but AI text is never the source of truth.
 */

const queryEngine = require("./query_engine.js");
const { retrieveKnowledge } = require("./knowledge_retrieval.js");

const DOMAIN_ANCHORS = {
  physics: [
    "physics", "relativity", "relative", "time dilation", "spacetime",
    "inertial", "gravity", "gravitation", "motion", "velocity", "acceleration",
    "force", "energy", "momentum", "wave", "light", "electricity"
  ],
  mathematics: [
    "mathematics", "math", "algebra", "equation", "fraction", "ratio",
    "percentage", "probability", "statistics", "geometry", "calculus",
    "trigonometry", "number", "derivative", "integral"
  ],
  chemistry: [
    "chemistry", "atom", "molecule", "element", "compound", "reaction",
    "acid", "base", "salt", "chemical", "organic"
  ],
  biology: [
    "biology", "cell", "photosynthesis", "respiration", "genetics",
    "mitosis", "meiosis", "organism", "ecosystem", "plant", "animal"
  ],
  computer_science: [
    "programming", "code", "coding", "javascript", "python", "java",
    "algorithm", "database", "software", "computer", "html", "css"
  ],
  humanities_social_sciences: [
    "history", "geography", "government", "citizenship", "society",
    "economics", "business", "accounting"
  ]
};

const TOPIC_ANCHORS = {
  relativity: [
    "relativity", "relative time", "time is relative", "time relative",
    "time dilation", "gravitational time dilation", "special relativity",
    "general relativity", "spacetime"
  ],
  photosynthesis: ["photosynthesis", "chlorophyll", "glucose", "carbon dioxide"],
  gravity: ["gravity", "gravitation", "gravitational"],
  mechanics: ["force", "motion", "velocity", "acceleration", "mechanics"],
  energy: ["energy", "power", "work"],
  electricity: ["electricity", "current", "voltage", "resistance"],
  programming: ["programming", "coding", "code"],
  algorithms: ["algorithm", "algorithms"]
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9%°µ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasePresent(text, phrase) {
  return normalize(text).includes(normalize(phrase));
}

function overlapScore(text, anchors) {
  const normalized = normalize(text);
  const matched = (anchors || []).filter(anchor =>
    normalized.includes(normalize(anchor))
  );
  return {
    count: matched.length,
    matches: [...new Set(matched)],
    score: Math.min(matched.length / Math.max(1, Math.min(anchors.length, 4)), 1)
  };
}

function buildKnowledgeQuery(question, queryInfo) {
  const parts = [
    queryInfo?.subject && queryInfo.subject !== "general"
      ? queryInfo.subject
      : "",
    queryInfo?.topic || "",
    queryInfo?.concept || "",
    question
  ].filter(Boolean);

  return [...new Set(parts.map(normalize).filter(Boolean))].join(" ").trim();
}

function sourceAdequacy(source, queryInfo, question) {
  const text = [
    source?.title,
    source?.extract,
    source?.snippet
  ].filter(Boolean).join(" ");

  const subject = normalize(queryInfo?.subject);
  const topic = normalize(queryInfo?.topic);

  const topicAnchors = TOPIC_ANCHORS[queryInfo?.topic] || [];
  const subjectAnchors = DOMAIN_ANCHORS[queryInfo?.subject] || [];

  const topicMatch = overlapScore(text, topicAnchors);
  const subjectMatch = overlapScore(text, subjectAnchors);
  const queryTokens = normalize(question).split(" ").filter(x => x.length > 2);
  const queryMatch = overlapScore(text, queryTokens);

  /*
   * Specific topics are the strongest semantic guard. This prevents a
   * high-authority source about an unrelated use of the same word
   * (e.g. surgery "time") from being accepted for relativity.
   */
  if (topicAnchors.length && topicMatch.count === 0) {
    return {
      adequate: false,
      reason: "topic_mismatch",
      topic_matches: [],
      subject_matches: subjectMatch.matches
    };
  }

  if (
    queryInfo?.subject &&
    queryInfo.subject !== "general" &&
    subjectAnchors.length &&
    subjectMatch.count === 0 &&
    topicMatch.count === 0
  ) {
    return {
      adequate: false,
      reason: "domain_mismatch",
      topic_matches: topicMatch.matches,
      subject_matches: subjectMatch.matches
    };
  }

  const minimumQueryScore =
    queryInfo?.topic ? 0.08 : 0.12;

  if (
    queryMatch.score < minimumQueryScore &&
    topicMatch.count === 0 &&
    subjectMatch.count < 2
  ) {
    return {
      adequate: false,
      reason: "weak_semantic_fit",
      topic_matches: topicMatch.matches,
      subject_matches: subjectMatch.matches
    };
  }

  return {
    adequate: true,
    reason: "adequate",
    topic_matches: topicMatch.matches,
    subject_matches: subjectMatch.matches,
    query_matches: queryMatch.matches
  };
}

function buildEvidencePacket(result, queryInfo, question) {
  const source = result?.source || {};
  const evidence = Array.isArray(result?.evidence)
    ? result.evidence.slice(0, 5)
    : [];

  return {
    question,
    query: result?.query || question,
    understanding: {
      subject: queryInfo?.subject || "general",
      topic: queryInfo?.topic || null,
      intent: queryInfo?.intent || "general",
      question_type: queryInfo?.question_type || "general_question",
      concept: queryInfo?.concept || null,
      confidence: queryInfo?.confidence ?? 0
    },
    source: {
      title: source.title || null,
      name: source.name || null,
      verification_score: source.verification_score ?? null
    },
    evidence,
    cross_source_verification: result?.cross_source_verification || null,
    knowledge: result?.knowledge || null
  };
}

async function retrieveKnowledgeIntelligence(question, options = {}) {
  const originalQuestion = String(question || "").trim();

  if (!originalQuestion) {
    return {
      success: false,
      error: "A learner question or information request is required."
    };
  }

  const queryInfo = queryEngine.analyzeQuery(
    originalQuestion,
    options.context || {}
  );

  /*
   * A learner does not have to phrase input as a question. Statements
   * such as "time is relative" are treated as requests for information.
   */
  const retrievalQuery = buildKnowledgeQuery(
    originalQuestion,
    queryInfo
  );

  const result = await retrieveKnowledge(
    retrievalQuery || originalQuestion,
    {
      limit: options.limit || 5
    }
  );

  if (!result?.success) {
    return {
      success: false,
      query: originalQuestion,
      retrieval_query: retrievalQuery,
      understanding: queryInfo,
      error: result?.error || "No verified knowledge source was found."
    };
  }

  const adequacy = sourceAdequacy(
    result.source,
    queryInfo,
    originalQuestion
  );

  if (!adequacy.adequate) {
    return {
      success: false,
      query: originalQuestion,
      retrieval_query: retrievalQuery,
      understanding: queryInfo,
      source_rejected: result.source || null,
      adequacy,
      error: "Retrieved evidence did not match the learner's subject or topic."
    };
  }

  return {
    ...result,
    success: true,
    query: originalQuestion,
    retrieval_query: retrievalQuery,
    understanding: queryInfo,
    source_adequacy: adequacy,
    evidence_packet: buildEvidencePacket(result, queryInfo, originalQuestion)
  };
}

module.exports = {
  retrieveKnowledgeIntelligence,
  buildKnowledgeQuery,
  sourceAdequacy,
  buildEvidencePacket,
  normalize
};
