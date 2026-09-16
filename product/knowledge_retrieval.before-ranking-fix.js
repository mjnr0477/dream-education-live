const searchEngine = require("./search_engine.js");
const sourceEngine = require("./source_engine.js");
const verifier = require("./source_verifier.js");
const extractor = require("./knowledge_extractor.js");

async function retrieveKnowledge(query, options = {}) {
  const limit = options.limit || 5;

  const results = await searchEngine.universalSearch(query, { limit });

  if (!results.external.length) {
    return {
      success: false,
      query,
      error: "No knowledge source found."
    };
  }

  const rankedSources = verifier.rankSources(
    results.external.map(source => ({
      ...source,
      extract: source.snippet
    }))
  );

  const bestSource = rankedSources[0];

  const page = await sourceEngine.getWikipediaPage(bestSource.title);

  if (!page || !page.extract) {
    return {
      success: false,
      query,
      error: "Source content could not be retrieved."
    };
  }

  const verifiedSource = {
    ...bestSource,
    extract: page.extract
  };

  const verification = verifier.verifySource(verifiedSource);

  if (!verification.verified) {
    return {
      success: false,
      query,
      error: "Retrieved source failed verification."
    };
  }

  const knowledge = extractor.extractFromSearchResult(
    verifiedSource,
    page
  );

  return {
    success: true,
    query,
    source: {
      title: verifiedSource.title,
      name: verifiedSource.source,
      verification_score: verification.score
    },
    knowledge
  };
}

module.exports = {
  retrieveKnowledge
};

if (require.main === module) {
  (async () => {
    const result = await retrieveKnowledge("photosynthesis");

    console.log("=== KNOWLEDGE RETRIEVAL TEST ===");
    console.log("Query:", result.query);
    console.log("Success:", result.success ? "YES" : "NO");

    if (result.success) {
      console.log("Source:", result.source.name);
      console.log("Concept:", result.knowledge.concept);
      console.log("Definition available:", result.knowledge.definition ? "YES" : "NO");
      console.log("Key ideas:", result.knowledge.key_ideas.length);
      console.log("Verification score:", result.source.verification_score);
    }

    console.log(
      "Status:",
      result.success
        ? "KNOWLEDGE RETRIEVAL READY"
        : "CHECK REQUIRED"
    );
  })();
}
