"use strict";

const assert = require("node:assert/strict");
const {
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_MAX_CACHE_ENTRIES,
  pruneLearningCache
} = require("../product/learning_cache_policy");

const now = Date.parse("2026-10-22T20:00:00.000Z");
const cache = {
  fresh: { createdAt: new Date(now - 1_000).toISOString(), answer: "keep" },
  expired: { createdAt: new Date(now - DEFAULT_CACHE_TTL_MS).toISOString(), answer: "remove" },
  malformed: { answer: "remove missing timestamp" }
};
const result = pruneLearningCache(cache, { now });
assert.equal(result.cache, cache, "Pruning should preserve the cache object reference.");
assert.equal(result.removed, 2);
assert.deepEqual(Object.keys(cache), ["fresh"]);
assert.equal(cache.fresh.answer, "keep");

const crowded = {};
for (let index = 0; index < 5; index += 1) {
  crowded["entry-" + index] = {
    createdAt: new Date(now - (5 - index) * 100).toISOString(),
    answer: String(index)
  };
}
const bounded = pruneLearningCache(crowded, { now, ttlMs: 60_000, maxEntries: 2 });
assert.equal(bounded.removed, 3);
assert.deepEqual(Object.keys(crowded).sort(), ["entry-3", "entry-4"]);
assert.equal(Object.keys(crowded).length, 2);
assert.equal(DEFAULT_MAX_CACHE_ENTRIES, 2_000);

assert.deepEqual(pruneLearningCache(null, { now }).cache, {});
console.log("Learning response cache policy smoke test passed.");
