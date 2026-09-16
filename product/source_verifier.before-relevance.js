function scoreSource(source) {
  let score = 0;

  if (source.title) score += 2;
  if (source.source) score += 2;
  if (source.extract && source.extract.length > 100) score += 4;
  if (source.url) score += 1;

  return score;
}

function rankSources(sources) {
  return [...(sources || [])]
    .map(source => ({
      ...source,
      verification_score: scoreSource(source)
    }))
    .sort((a, b) => b.verification_score - a.verification_score);
}

function verifySource(source) {
  const score = scoreSource(source);

  return {
    verified: score >= 6,
    score,
    checks: {
      has_title: Boolean(source.title),
      has_source: Boolean(source.source),
      has_content: Boolean(source.extract && source.extract.length > 100),
      has_url: Boolean(source.url)
    }
  };
}

module.exports = {
  scoreSource,
  rankSources,
  verifySource
};

if (require.main === module) {
  const sample = {
    title: "Photosynthesis",
    source: "Wikipedia",
    extract: "Photosynthesis is a biological process in which organisms convert light energy into chemical energy. Plants use this process to produce organic compounds and release oxygen.",
    url: "https://en.wikipedia.org/wiki/Photosynthesis"
  };

  const result = verifySource(sample);

  console.log("=== SOURCE VERIFICATION TEST ===");
  console.log("Source:", sample.source);
  console.log("Score:", result.score);
  console.log("Verified:", result.verified ? "YES" : "NO");
  console.log("Content check:", result.checks.has_content ? "PASS" : "FAIL");
  console.log("Status:", result.verified ? "SOURCE VERIFIER READY" : "CHECK REQUIRED");
}
