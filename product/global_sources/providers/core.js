"use strict";

const {json} = require("../core/http");
const {waitFor} = require("../core/limiter");
const cache = require("../core/cache");

const ENDPOINT = "https://api.core.ac.uk/v3/search/outputs/";

function normalizeRecord(item, query) {
  const title = String(item?.title || "").trim();
  if (!title) return null;

  const authors = Array.isArray(item.authors)
    ? item.authors.map(author => typeof author === "string" ? author : author?.name).filter(Boolean).slice(0, 8)
    : [];
  const abstract = String(item.abstract || item.description || "").trim();
  const doi = String(item.doi || "").trim();
  const url = String(
    item.downloadUrl ||
    item.sourceFulltextUrls?.[0] ||
    item.links?.[0]?.url ||
    (doi ? `https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, "")}` : "") ||
    item.url ||
    ""
  ).trim();

  return {
    provider: "core",
    source: "CORE",
    title,
    extract: [
      abstract,
      authors.length ? `Authors: ${authors.join(", ")}.` : "",
      item.year ? `Year: ${item.year}.` : "",
      doi ? `DOI: ${doi}.` : ""
    ].filter(Boolean).join(" ").slice(0, 5000) || `CORE research record matching: ${query}`,
    url,
    doi: doi || null,
    year: item.year || null,
    open_access: Boolean(item.isOpenAccess || item.openAccess),
    license: String(item.license || item.licenseName || "Check the individual record's license")
  };
}

async function search(query, limit = 5) {
  const q = String(query || "").trim();
  const apiKey = String(process.env.CORE_API_KEY || "").trim();
  if (!q || !apiKey) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const cacheKey = `core:${q}:${safeLimit}`;
  const cached = cache.read(cacheKey);
  if (cached) return cached;

  await waitFor("core", 1200);
  const params = new URLSearchParams({
    q,
    limit: String(safeLimit),
    offset: "0"
  });

  const data = await json(`${ENDPOINT}?${params.toString()}`, {
    timeout: 3500,
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  const records = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const results = records
    .map(item => normalizeRecord(item, q))
    .filter(Boolean)
    .slice(0, safeLimit);

  cache.write(cacheKey, results);
  return results;
}

module.exports = {search, normalizeRecord};
