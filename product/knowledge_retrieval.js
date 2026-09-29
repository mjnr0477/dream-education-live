const searchEngine = require("./search_engine.js");
const sourceEngine = require("./source_engine.js");
const verifier = require("./source_verifier.js");
const extractor = require("./knowledge_extractor.js");

async function retrieveKnowledge(query, options = {}) {
  const limit = options.limit || 5;

  // Tenant-scoped GLI knowledge is additive to the existing verified-provider
  // retrieval path. If it is unavailable, the original path remains authoritative.
  if (options.tenantId) {
    try {
      const { searchKnowledge } = require("./gli/gli_intelligence_service");
      const tenantResults = await searchKnowledge(query, limit, options.tenantId);
      if (tenantResults.length) {
        return {
          success: true,
          query,
          source: {
            title: tenantResults[0].title,
            name: tenantResults[0].source,
            verification_score: null,
            scope: "tenant"
          },
          knowledge: {
            concept: tenantResults[0].title,
            definition: tenantResults[0].content,
            key_ideas: tenantResults.slice(1).map(item => item.content),
            examples: [],
            evidence: tenantResults
          }
        };
      }
    } catch (error) {
      console.warn("GLI tenant knowledge unavailable; continuing with existing retrieval:", error.message);
    }
  }

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
  const candidatesForVerification = rankedSources
    .filter(source =>
      source &&
      String(source.extract || "").trim().length >= 80 &&
      Number(source.relevance_score || 0) >= 6
    )
    .slice(0, 8);

  // Verify the strongest candidates concurrently. This preserves the
  // existing ranking/verification rules while removing avoidable serial
  // network waits, especially when several Wikipedia candidates are present.
  const verificationResults = await Promise.all(
    candidatesForVerification.map(async candidate => {
      try {
        let candidateWithContent = candidate;

        if (
          candidate.provider === "wikipedia" ||
          candidate.source === "Wikipedia"
        ) {
          const candidatePage =
            await sourceEngine.getWikipediaPage(candidate.title);

          if (
            !candidatePage ||
            !String(candidatePage.extract || "").trim()
          ) {
            return null;
          }

          candidateWithContent = {
            ...candidate,
            extract: candidatePage.extract,
            _knowledgePage: candidatePage
          };
        }

        const candidateExtract = String(
          candidateWithContent.extract ||
          candidateWithContent.snippet ||
          ""
        ).trim();

        if (candidateExtract.length < 80) {
          return null;
        }

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
            relevance: candidateVerification.relevance_score,
            verified: candidateVerification.verified
          })
        );

        if (!candidateVerification.verified) {
          return null;
        }

        return {
          source: candidateWithContent,
          verification: candidateVerification
        };
      } catch (error) {
        console.warn(
          "Knowledge provider failed:",
          candidate.source ||
          candidate.provider ||
          "unknown",
          error.message
        );
        return null;
      }
    })
  );

  verificationResults
    .filter(Boolean)
    .forEach(result => verifiedCandidates.push(result));
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
