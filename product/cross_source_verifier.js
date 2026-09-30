"use strict";

/*
 * Deterministic cross-source evidence verification.
 *
 * This module does not declare absolute truth. It measures whether
 * independently retrieved sources support, repeat, or conflict with
 * the same factual content. Source authority remains a separate signal.
 */

const STOP_WORDS = new Set([
  "a","an","and","are","as","at","be","by","for","from","has","have","in",
  "is","it","of","on","or","that","the","their","this","to","was","were",
  "what","when","where","which","who","with","about","into","than","then",
  "these","those","how","why","does","do","did","can","could","may","might",
  "should","would","will","you","your","me","we","they","them","its","also"
]);

const NEGATION_RE = /\b(no|not|never|neither|without|cannot|can't|isn't|aren't|doesn't|don't|didn't|wasn't|weren't|false|incorrect|untrue)\b/i;
const NUMBER_RE = /\b\d+(?:\.\d+)?(?:\s*(?:%|°c|°f|kg|g|mg|km|m|cm|mm|s|ms|hz|khz|mhz|ghz|pa|kpa|mpa|mol|j|kj|w|kw|v|a|ohm|nm|µm|um))?\b/gi;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9%°µ.]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function tokenSet(value) {
  return new Set(tokenize(value));
}

function jaccard(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

function numbers(value) {
  return (clean(value).match(NUMBER_RE) || [])
    .map(x => x.toLowerCase().replace(/\s+/g, ""))
    .sort();
}

function numberAgreement(a, b) {
  const left = numbers(a);
  const right = numbers(b);
  if (!left.length || !right.length) return null;
  const shared = left.filter(value => right.includes(value)).length;
  return shared / Math.max(left.length, right.length);
}

function splitClaims(value) {
  return clean(value)
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter(sentence => tokenize(sentence).length >= 5)
    .slice(0, 12);
}

function sourceKey(source) {
  return String(
    source?.provider ||
    source?.global_source_id ||
    source?.source ||
    source?.url ||
    "unknown"
  ).trim().toLowerCase();
}

function sourceText(source) {
  return clean(
    source?.extract ||
    source?.snippet ||
    source?.content ||
    source?.title ||
    ""
  );
}

function sourceAuthority(source) {
  const authority = {
    official: 100,
    government: 100,
    academic_research: 90,
    scientific_research: 90,
    biomedical_research: 90,
    life_science_research: 90,
    academic: 85,
    scientific_reference: 82,
    technical: 80,
    educational: 78,
    library_reference: 72,
    research_metadata: 68,
    digital_library: 66,
    structured_knowledge: 62,
    reference: 60,
    web_reference: 35,
    general: 20
  };
  return authority[source?.source_type] || 20;
}

function pairRelationship(left, right) {
  const leftText = sourceText(left);
  const rightText = sourceText(right);
  const similarity = jaccard(leftText, rightText);
  const numeric = numberAgreement(leftText, rightText);

  const exactMatch = leftText.toLowerCase() === rightText.toLowerCase();
  const sameTopic = exactMatch || similarity >= 0.18;
  const strongTopic = similarity >= 0.32;
  const sameNumbers = numeric !== null && numeric >= 0.5;
  const numberConflict =
    numeric !== null &&
    numbers(leftText).length &&
    numbers(rightText).length &&
    numeric === 0 &&
    sameTopic;

  const negationConflict =
    sameTopic &&
    NEGATION_RE.test(leftText) !== NEGATION_RE.test(rightText);

  let relationship = "independent";
  if (numberConflict || negationConflict) {
    relationship = "conflicting";
  } else if (exactMatch || (strongTopic && (sameNumbers || numeric === null))) {
    relationship = "supporting";
  } else if (sameTopic) {
    relationship = "related";
  }

  return {
    relationship,
    similarity: Number(similarity.toFixed(3)),
    numeric_agreement: numeric === null ? null : Number(numeric.toFixed(3))
  };
}

function verifyCrossSourceEvidence(sources = [], options = {}) {
  const usable = (Array.isArray(sources) ? sources : [])
    .map(source => ({
      ...source,
      _source_key: sourceKey(source),
      _text: sourceText(source)
    }))
    .filter(source => source._text.length >= (options.minChars || 80));

  const groups = new Map();
  for (const source of usable) {
    if (!groups.has(source._source_key)) groups.set(source._source_key, []);
    groups.get(source._source_key).push(source);
  }

  const independentSources = [...groups.values()].map(group => group[0]);

  const relationships = [];
  for (let i = 0; i < independentSources.length; i++) {
    for (let j = i + 1; j < independentSources.length; j++) {
      relationships.push({
        left: sourceKey(independentSources[i]),
        right: sourceKey(independentSources[j]),
        ...pairRelationship(independentSources[i], independentSources[j])
      });
    }
  }

  const stats = new Map(
    independentSources.map(source => [
      sourceKey(source),
      { supporting: 0, conflicting: 0, related: 0, independent: 0 }
    ])
  );

  for (const relation of relationships) {
    const left = stats.get(relation.left);
    const right = stats.get(relation.right);
    left[relation.relationship] = (left[relation.relationship] || 0) + 1;
    right[relation.relationship] = (right[relation.relationship] || 0) + 1;
  }

  const scored = independentSources.map(source => {
    const key = sourceKey(source);
    const item = stats.get(key);
    const authority = sourceAuthority(source);
    const supportBonus = Math.min(item.supporting * 8, 24);
    const conflictPenalty = Math.min(item.conflicting * 18, 54);

    let verificationStatus = "single_source";
    if (item.conflicting > 0) {
      verificationStatus = "conflicting";
    } else if (item.supporting > 0) {
      verificationStatus = "corroborated";
    }

    return {
      source,
      source_key: key,
      authority_score: authority,
      supporting_sources: item.supporting,
      conflicting_sources: item.conflicting,
      related_sources: item.related,
      verification_status: verificationStatus,
      cross_source_score: Math.max(
        0,
        authority + supportBonus - conflictPenalty
      )
    };
  }).sort((a, b) => b.cross_source_score - a.cross_source_score);

  const corroboratedCount = scored.filter(
    item => item.verification_status === "corroborated"
  ).length;
  const conflictCount = scored.filter(
    item => item.verification_status === "conflicting"
  ).length;

  let overallStatus = "single_source";
  if (conflictCount > 0) overallStatus = "conflict_detected";
  else if (corroboratedCount >= 2) overallStatus = "cross_source_corroborated";
  else if (scored.length >= 2) overallStatus = "multi_source_consistent";

  return {
    status: overallStatus,
    independent_source_count: independentSources.length,
    supporting_relationships: relationships.filter(x => x.relationship === "supporting").length,
    conflicting_relationships: relationships.filter(x => x.relationship === "conflicting").length,
    related_relationships: relationships.filter(x => x.relationship === "related").length,
    relationships,
    ranked_sources: scored.map(item => ({
      provider: item.source.provider || null,
      source: item.source.source || item.source.title || null,
      title: item.source.title || null,
      url: item.source.url || null,
      authority_score: item.authority_score,
      supporting_sources: item.supporting_sources,
      conflicting_sources: item.conflicting_sources,
      verification_status: item.verification_status,
      cross_source_score: item.cross_source_score
    }))
  };
}

function buildEvidenceSummary(result) {
  if (!result) return null;
  return {
    status: result.status,
    independent_source_count: result.independent_source_count,
    supporting_relationships: result.supporting_relationships,
    conflicting_relationships: result.conflicting_relationships
  };
}

module.exports = {
  verifyCrossSourceEvidence,
  buildEvidenceSummary,
  tokenize,
  jaccard,
  numberAgreement,
  splitClaims
};
