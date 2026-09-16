function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

function extractKnowledge(source) {
  const text = cleanText(source.extract);
  const sentences = makeSentences(text);

  const definition = sentences[0] || "";

  const keyIdeas = sentences
    .slice(1, 5)
    .filter(s => s.length > 15);

  return {
    title: source.title,
    concept: source.title,
    definition,
    key_ideas: keyIdeas,
    applications: [],
    misconceptions: [],
    prerequisites: [],
    source: source.source,
    source_content_length: text.length,
    source_verified: Boolean(source.title && text),
    extraction_method: "structured_source_extraction"
  };
}

function extractFromSearchResult(sourceResult, page = null) {
  return extractKnowledge({
    title: sourceResult.title,
    source: sourceResult.source,
    extract:
      sourceResult.extract ||
      sourceResult.snippet ||
      (page && page.extract) ||
      ""
  });
}

module.exports = {
  cleanText,
  makeSentences,
  extractKnowledge,
  extractFromSearchResult
};

if (require.main === module) {
  const extractor = module.exports;

  const sample = {
    title: "Photosynthesis",
    source: "Wikipedia",
    extract: "Photosynthesis is a biological process. Plants use light energy. Oxygen may be released during the process."
  };

  const result = extractor.extractKnowledge(sample);

  console.log("=== KNOWLEDGE EXTRACTION TEST ===");
  console.log("Concept:", result.concept);
  console.log("Definition:", result.definition);
  console.log("Key ideas:", result.key_ideas.length);
  console.log("Source verified:", result.source_verified);
  console.log("Status:", result.source_verified ? "EXTRACTOR READY" : "CHECK REQUIRED");
}
