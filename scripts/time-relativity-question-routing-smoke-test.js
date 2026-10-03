const { analyzeQuery } = require("../product/query_engine.js");

const result = analyzeQuery("Why is time relative");

if (result.subject !== "physics") {
  throw new Error(`Expected physics subject, got ${result.subject}`);
}

if (result.topic !== "relativity") {
  throw new Error(`Expected relativity topic, got ${result.topic}`);
}

if (result.intent !== "explanation") {
  throw new Error(`Expected explanation intent, got ${result.intent}`);
}

if (!String(result.search_query || "").toLowerCase().includes("time relative")) {
  throw new Error("Expected the learner's relativity concept to remain in the search query");
}

console.log("TIME RELATIVITY QUESTION ROUTING: PASS");
console.log("Relativity questions are routed to physics/relativity evidence.");
