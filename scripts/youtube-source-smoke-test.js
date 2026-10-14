"use strict";

const assert = require("node:assert/strict");
const youtube = require("../product/global_sources/providers/youtube");

async function main() {
  const previousKey = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;
  const fallback = await youtube.search("photosynthesis", 5);
  assert.equal(fallback.length, 1, "Without an API key, YouTube should return a direct search link");
  assert.equal(fallback[0].retrieval_mode, "direct_search_link");
  assert.equal(fallback[0].url, "https://www.youtube.com/results?search_query=photosynthesis");
  assert.match(fallback[0].extract, /did not retrieve YouTube video metadata/);
  assert.deepEqual(fallback[0].media, [], "A search link must not pretend to contain retrieved video metadata");
  if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = previousKey;
  console.log("YOUTUBE SOURCE SAFETY SMOKE TEST: PASS");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
