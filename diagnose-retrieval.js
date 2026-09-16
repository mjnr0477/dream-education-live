const searchEngine = require("./product/search_engine.js");
const sourceEngine = require("./product/source_engine.js");
const verifier = require("./product/source_verifier.js");

(async () => {
  const query = "What is photosynthesis?";

  let t = Date.now();
  const results = await searchEngine.universalSearch(query, { limit: 5 });
  console.log("UNIVERSAL_SEARCH_MS:", Date.now() - t);
  console.log("EXTERNAL_COUNT:", results.external.length);

  t = Date.now();
  const ranked = verifier.rankSources(
    results.external.map(source => ({
      ...source,
      extract: source.snippet
    })),
    query
  );
  console.log("RANKING_MS:", Date.now() - t);

  const best = ranked[0];
  console.log("BEST_SOURCE:", best?.title);
  console.log("BEST_PROVIDER:", best?.provider || best?.source);

  t = Date.now();
  const page = await sourceEngine.getWikipediaPage(best.title);
  console.log("PAGE_RETRIEVAL_MS:", Date.now() - t);
  console.log("PAGE_CONTENT:", page?.extract ? "AVAILABLE" : "MISSING");

  console.log("=== RETRIEVAL SPEED DIAGNOSTIC COMPLETE ===");
})();
