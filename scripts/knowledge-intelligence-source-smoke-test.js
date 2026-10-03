"use strict";

const assert = require("assert");
const queryEngine = require("../product/query_engine.js");
const {
  buildKnowledgeQuery,
  sourceAdequacy
} = require("../product/knowledge_intelligence_engine.js");

const statement = "time is relative";
const info = queryEngine.analyzeQuery(statement);
const retrievalQuery = buildKnowledgeQuery(statement, info);

assert.strictEqual(info.subject, "physics");
assert.strictEqual(info.topic, "relativity");
assert.ok(retrievalQuery.includes("physics"));
assert.ok(retrievalQuery.includes("relativity"));

const relevant = sourceAdequacy(
  {
    title: "Relativity and Time Dilation",
    extract:
      "In special relativity, time is relative to the observer's frame of reference and moving clocks can experience time dilation."
  },
  info,
  statement
);

assert.strictEqual(relevant.adequate, true);

const unrelated = sourceAdequacy(
  {
    title: "Actual Surgery Time Relative to Scheduled Surgery Time",
    extract:
      "This study examines actual surgery time relative to scheduled surgery time in robotic-assisted thoracic surgery cases."
  },
  info,
  statement
);

assert.strictEqual(unrelated.adequate, false);
assert.strictEqual(unrelated.reason, "topic_mismatch");

const generalStatement = "photosynthesis";
const generalInfo = queryEngine.analyzeQuery(generalStatement);
const generalQuery = buildKnowledgeQuery(generalStatement, generalInfo);

assert.ok(generalQuery.includes("biology"));
assert.ok(generalQuery.includes("photosynthesis"));

console.log("=== KNOWLEDGE INTELLIGENCE SOURCE SMOKE TEST ===");
console.log("Statement routing: PASS");
console.log("Evidence adequacy gate: PASS");
console.log("Non-question information request: PASS");
console.log("KNOWLEDGE INTELLIGENCE SOURCE READY");
