"use strict";

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_ENTRIES = 2_000;

function pruneLearningCache(cache, options = {}) {
  if (!cache || typeof cache !== "object" || Array.isArray(cache)) {
    return { cache: {}, removed: 0 };
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const ttlMs = Number.isSafeInteger(options.ttlMs) && options.ttlMs > 0
    ? options.ttlMs
    : DEFAULT_CACHE_TTL_MS;
  const maxEntries = Number.isSafeInteger(options.maxEntries) && options.maxEntries > 0
    ? options.maxEntries
    : DEFAULT_MAX_CACHE_ENTRIES;
  let removed = 0;

  for (const [key, entry] of Object.entries(cache)) {
    const createdAt = Date.parse(entry && entry.createdAt);
    if (!Number.isFinite(createdAt) || now - createdAt >= ttlMs) {
      delete cache[key];
      removed += 1;
    }
  }

  if (Object.keys(cache).length > maxEntries) {
    const oldestFirst = Object.entries(cache).sort((a, b) => {
      return Date.parse(a[1].createdAt) - Date.parse(b[1].createdAt);
    });
    const excess = oldestFirst.length - maxEntries;
    for (let index = 0; index < excess; index += 1) {
      delete cache[oldestFirst[index][0]];
      removed += 1;
    }
  }

  return { cache, removed };
}

module.exports = {
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_MAX_CACHE_ENTRIES,
  pruneLearningCache
};
