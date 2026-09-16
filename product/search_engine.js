const fs = require("fs");
const path = require("path");

const INDEX_FILE = path.join(__dirname, "..", "content", "global", "knowledge_index.json");
const queryEngine = require("./query_engine.js");

function loadKnowledge() {
  if (!fs.existsSync(INDEX_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
  return Array.isArray(data.records) ? data.records : [];
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return [...new Set(normalize(text).split(" ").filter(w => w.length > 1))];
}

function scoreRecord(record, query) {
  const queryInfo = queryEngine.analyzeQuery(query);
  const q = words(queryInfo.search_terms.join(" "));
  if (!q.length) return 0;

  const searchable = normalize([
    record.title,
    record.field,
    record.domain,
    record.topic,
    record.subtopic,
    record.concept,
    record.definition,
    ...(record.key_ideas || []),
    ...(record.principles || []),
    ...(record.applications || []),
    ...(record.skills || [])
  ].join(" "));

  const title = normalize(record.title);
  const concept = normalize(record.concept);

  let score = 0;

  for (const word of q) {
    if (title.split(" ").includes(word)) score += 10;
    if (concept.split(" ").includes(word)) score += 8;
    if (searchable.includes(word)) score += 2;
  }

  if (normalize(record.title) === normalize(query)) score += 30;
  if (normalize(record.concept) === normalize(query)) score += 25;

  return score;
}

function search(query, options = {}) {
  const queryInfo = queryEngine.analyzeQuery(query);
  const records = loadKnowledge();
  const limit = options.limit || 10;

  return records
    .map(record => ({
      ...record,
      search_score: scoreRecord(record, query)
    }))
    .filter(record => record.search_score > 0)
    .sort((a, b) => b.search_score - a.search_score)
    .slice(0, limit);
}

function getKnowledge(id) {
  return loadKnowledge().find(record => record.id === id) || null;
}

function explainSearch(query, options = {}) {
  const results = search(query, options);

  return {
    success: true,
    query,
    count: results.length,
    results: results.map(r => ({
      id: r.id,
      title: r.title,
      field: r.field,
      domain: r.domain,
      topic: r.topic,
      concept: r.concept,
      definition: r.definition,
      key_ideas: r.key_ideas || [],
      prerequisites: r.prerequisites || [],
      applications: r.applications || [],
      skills: r.skills || [],
      sources: r.sources || [],
      score: r.search_score
    }))
  };
}

module.exports = {
  loadKnowledge,
  search,
  getKnowledge,
  explainSearch
};

if (require.main === module) {
  const query = process.argv.slice(2).join(" ");

  if (!query) {
    console.log("Usage: node product/search_engine.js <question>");
    process.exit(1);
  }

  const result = explainSearch(query);

  console.log("=== DREAM EDUCATION SEARCH ===");
  console.log("Query:", result.query);
  console.log("Results:", result.count);

  for (const item of result.results) {
    console.log("\n---");
    console.log("Title:", item.title);
    console.log("Field:", item.field);
    console.log("Topic:", item.topic);
    console.log("Score:", item.score);
    console.log("Definition:", item.definition);
  }

  console.log("\nStatus: SEARCH ENGINE READY");
}

const sourceEngine = require("./source_engine.js");

async function universalSearch(query, options = {}) {
  const localResults = search(query, options);
  const queryInfo = queryEngine.analyzeQuery(query);
  const externalQuery = queryInfo.search_terms.join(" ") || query;
  const externalResults = await sourceEngine.searchSources(externalQuery, options.limit || 5);

  return {
    success: true,
    query,
    local: localResults,
    external: externalResults.sources
  };
}

module.exports.universalSearch = universalSearch;
