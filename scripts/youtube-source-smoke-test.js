"use strict";

const assert = require("node:assert/strict");
const youtube = require("../product/global_sources/providers/youtube");

async function main() {
  const previousKey = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;
  assert.deepEqual(await youtube.search("photosynthesis", 5), [],
    "YouTube provider must fail closed without an API key and must not scrape public HTML");
  if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = previousKey;
  console.log("YOUTUBE SOURCE SAFETY SMOKE TEST: PASS");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
