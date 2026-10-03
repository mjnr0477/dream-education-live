"use strict";

const { findUniversalRelevantContent } = require("../content/content_engine");

const result = findUniversalRelevantContent({
  subject: "General",
  level: "Tertiary / Year3",
  topic: null,
  question: "What is photosynthesis?"
});

if (!result) {
  throw new Error(
    "Universal curriculum recovery failed when learner profile context does not match a curriculum key."
  );
}

const concepts = result.concepts || {};
const concept = Object.values(concepts)[0] || {};

if (String(concept.definition || "").trim().length < 20) {
  throw new Error(
    "Universal curriculum recovery returned content without a substantive definition."
  );
}

console.log("UNIVERSAL CURRICULUM CONTEXT RECOVERY: PASS");
console.log("A valid curriculum answer remains discoverable despite non-matching profile context.");
