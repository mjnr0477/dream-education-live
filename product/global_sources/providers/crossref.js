"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const cacheKey = `crossref:${q}:${safeLimit}`;
  const cached = cache.read(cacheKey);
  if (cached) return cached;

  await waitFor("crossref", 1100);
  const params = new URLSearchParams({
    query: q,
    rows: String(safeLimit)
  });
  const email = String(process.env.CROSSREF_MAILTO || "").trim();
  if (email) params.set("mailto", email);

  const data = await json(`https://api.crossref.org/works?${params.toString()}`, {
    timeout: 3500,
    userAgent: "Dream-Education/1.0 (scholarly metadata search)"
  });
  const items = data?.message?.items || [];
  const results = items.map(item => {
    const title = String(item.title?.[0] || "").trim();
    if (!title) return null;
    const authors = (item.author || []).map(author =>
      [author.given, author.family].filter(Boolean).join(" ")
    ).filter(Boolean).slice(0, 6);
    const abstract = String(item.abstract || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const doi = String(item.DOI || "").trim();
    const published = item.published?.["date-parts"]?.[0] || item.created?.["date-parts"]?.[0] || [];
    const year = published[0] || null;
    const url = String(item.URL || (doi ? `https://doi.org/${doi}` : "")).trim();
    return {
      provider: "crossref",
      source: "Crossref",
      title,
      extract: [
        abstract,
        authors.length ? `Authors: ${authors.join(", ")}.` : "",
        year ? `Publication year: ${year}.` : "",
        doi ? `DOI: ${doi}.` : ""
      ].filter(Boolean).join(" ").slice(0, 5000) || `Crossref scholarly metadata record for: ${q}`,
      url,
      doi: doi || null,
      year,
      license: "Metadata is broadly open; verify rights for abstracts and full text"
    };
  }).filter(Boolean);

  cache.write(cacheKey, results);
  return results;
}

module.exports = {search};
