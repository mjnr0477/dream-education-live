"use strict";

const globalSources = require("./index.js");
const cache = require("./core/cache.js");

const refreshing = new Set();
const CACHE_MAX_AGE = 86400000;

function cacheKey(query, queryInfo = {}, limit = 5) {
  return [
    "global-source-search-v2",
    String(query || "").trim().toLowerCase(),
    String(queryInfo.domain || queryInfo.subject || "general").toLowerCase(),
    String(queryInfo.topic || "").toLowerCase(),
    String(limit)
  ].join("|");
}

function normalizeResult(result, query) {
  if (!result) return [];

  const items =
    Array.isArray(result) ? result :
    Array.isArray(result.sources) ? result.sources :
    Array.isArray(result.results) ? result.results :
    [];

  return items.map(item => ({
    ...item,
    provider:
      item.provider ||
      item.source_provider ||
      item.source ||
      "global_source_expansion",
    source:
      item.source ||
      item.provider ||
      "Global Source Expansion",
    query
  }));
}

async function refreshGlobalSources(query, limit, queryInfo, key) {
  if (refreshing.has(key)) return;

  refreshing.add(key);

  try {
    const router = globalSources.router;

    if (!router || typeof router.search !== "function") return;

    const result = await router.search(
      query,
      queryInfo,
      limit
    );

    const sources = normalizeResult(result, query);

    if (sources.length) {
      cache.write(key, {
        sources,
        providers: result?.providers || [],
        cached_at: Date.now()
      });
    }
  } catch (error) {
    console.warn(
      "Global source background refresh failed:",
      error.message
    );
  } finally {
    refreshing.delete(key);
  }
}

async function searchGlobalSources(query, limit = 5, queryInfo = {}) {
  const key = cacheKey(query, queryInfo, limit);
  const cached = cache.read(key, CACHE_MAX_AGE);

  if (cached && Array.isArray(cached.sources)) {
    return {
      success: cached.sources.length > 0,
      sources: cached.sources,
      providers: cached.providers || [],
      cached: true,
      refreshing: false,
      query
    };
  }

  // Do not block Dream Education's fast retrieval path.
  refreshGlobalSources(
    query,
    limit,
    queryInfo,
    key
  ).catch(() => {});

  return {
    success: false,
    sources: [],
    providers: [],
    cached: false,
    refreshing: true,
    query
  };
}

module.exports = {
  searchGlobalSources
};
