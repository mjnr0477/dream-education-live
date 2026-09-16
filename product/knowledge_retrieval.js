const searchEngine = require("./search_engine.js");
const sourceEngine = require("./source_engine.js");
const verifier = require("./source_verifier.js");
const extractor = require("./knowledge_extractor.js");

async function retrieveKnowledge(query, options = {}) {
  const limit = options.limit || 5;

  const results = await sourceEngine.searchSources(query, limit);

  if (!results.sources.length) {
    return {
      success: false,
      query,
      error: "No knowledge source found."
    };
  }

  const rankedSources = verifier.rankSources(
    results.sources,
    query
  );

  const usableSources = rankedSources.filter(
    source =>
      source &&
      String(source.extract || "").trim().length >= 80 &&
      Number(source.relevance_score || 0) >= 6
  );

  if (!usableSources.length) {
    return {
      success: false,
      query,
      error: "No usable knowledge content was found."
    };
  }

  const verifiedCandidates = [];

  for (const candidate of rankedSources) {
    try {
      if (
        candidate.provider === "wikipedia" ||
        candidate.source === "Wikipedia"
      ) {
        const candidatePage =
          await sourceEngine.getWikipediaPage(candidate.title);

        if (
          candidatePage &&
          String(candidatePage.extract || "").trim()
        ) {
          const enrichedCandidate = {
            ...candidate,
            extract: candidatePage.extract,
            _knowledgePage: candidatePage
          };

          const candidateVerification =
            verifier.verifySource(
              enrichedCandidate,
              query
            );

          console.log(
            "Knowledge candidate verification:",
            JSON.stringify({
              provider:
                enrichedCandidate.provider ||
                enrichedCandidate.source,
              title: enrichedCandidate.title,
              relevance:
                candidateVerification.relevance_score,
              verified:
                candidateVerification.verified
            })
          );

          if (candidateVerification.verified) {
            verifiedCandidates.push({
              source: enrichedCandidate,
              verification: candidateVerification
            });
          } else {
            console.log(
              "Knowledge candidate rejected:",
              enrichedCandidate.title
            );
          }
        }
      } else {
        const candidateExtract = String(
          candidate.extract ||
          candidate.snippet ||
          ""
        ).trim();

        if (candidateExtract.length >= 80) {
          const candidateWithContent = {
            ...candidate,
            extract: candidateExtract
          };

          const candidateVerification =
            verifier.verifySource(
              candidateWithContent,
              query
            );

          console.log(
            "Knowledge candidate verification:",
            JSON.stringify({
              provider:
                candidateWithContent.provider ||
                candidateWithContent.source,
              title: candidateWithContent.title,
              relevance:
                candidateVerification.relevance_score,
              verified:
                candidateVerification.verified
            })
          );

          if (candidateVerification.verified) {
            verifiedCandidates.push({
              source: candidateWithContent,
              verification: candidateVerification
            });
          } else {
            console.log(
              "Knowledge candidate rejected:",
              candidateWithContent.title
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        "Knowledge provider failed:",
        candidate.source ||
        candidate.provider ||
        "unknown",
        error.message
      );
    }
  }

  if (!verifiedCandidates.length) {
    return {
      success: false,
      query,
      error: "No verified knowledge source was found."
    };
  }

  /*
   * Every verified candidate now competes in the final ranking.
   * Only after this ranking do we select the strongest source.
   */
  const finalRankedCandidates =
    verifier.rankSources(
      verifiedCandidates.map(item => item.source),
      query
    );

  const verifiedSource = finalRankedCandidates[0];

  const verification =
    verifier.verifySource(
      verifiedSource,
      query
    );

  const page =
    verifiedSource._knowledgePage || null;

  const relevanceScore =
    Number(
      finalRankedCandidates[0]?.relevance_score || 0
    );

  if (!verification.verified) {
    return {
      success: false,
      query,
      error: "Top ranked source failed verification."
    };
  }

  if (relevanceScore < 6) {
    return {
      success: false,
      query,
      error:
        "No verified source is sufficiently relevant to the question."
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
    const testQuery = process.argv.slice(2).join(" ") || "photosynthesis";
    const result = await retrieveKnowledge(testQuery);

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
