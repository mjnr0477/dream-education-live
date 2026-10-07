"use strict";

const assert = require("assert");
const { findUniversalRelevantContent } = require("../content/content_engine");

const result = findUniversalRelevantContent({
  subject: "General",
  level: "General",
  question: "I want a video explaining photosynthesis"
});

assert(result, "Universal curriculum recovery should find an existing curriculum match.");
assert(result.concepts && Object.keys(result.concepts).length > 0, "Curriculum match should contain a concept.");

const concepts = Object.keys(result.concepts).map(value => value.toLowerCase());
assert(
  concepts.some(value => value.includes("photosynthesis")),
  "Generic-context recovery should resolve the photosynthesis concept."
);

console.log("Runtime answer recovery smoke test: PASS");
