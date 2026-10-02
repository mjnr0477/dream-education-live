const fs = require("fs");

const INDEX_FILE = "content/global/knowledge_index.json";
const RELATIONSHIPS_FILE = "content/global/knowledge_relationships.json";

function loadIndex() {
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
}

function loadRelationships() {
  return JSON.parse(fs.readFileSync(RELATIONSHIPS_FILE, "utf8"));
}

function getKnowledge(id) {
  const index = loadIndex();
  return index.records.find(record => record.id === id) || null;
}

function getRelationshipsFrom(id) {
  const graph = loadRelationships();
  return graph.relationships.filter(r => r.from === id);
}

function getRelationshipsTo(id) {
  const graph = loadRelationships();
  return graph.relationships.filter(r => r.to === id);
}

function getPrerequisites(id) {
  const graph = loadRelationships();

  return graph.relationships
    .filter(r =>
      r.from === id &&
      r.relationship === "prerequisite"
    )
    .map(r => getKnowledge(r.to))
    .filter(Boolean);
}

function getDependents(id) {
  const graph = loadRelationships();

  return graph.relationships
    .filter(r =>
      r.from === id &&
      r.relationship === "prerequisite"
    )
    .map(r => getKnowledge(r.to))
    .filter(Boolean);
}

function getRelatedKnowledge(id) {
  const graph = loadRelationships();

  return graph.relationships
    .filter(r =>
      (r.from === id || r.to === id) &&
      r.relationship === "related_to"
    )
    .map(r => {
      const otherId = r.from === id ? r.to : r.from;
      return getKnowledge(otherId);
    })
    .filter(Boolean);
}


function getPrerequisiteChain(id, visited = new Set()) {
  if (visited.has(id)) return [];

  visited.add(id);

  const prerequisites = getPrerequisites(id);
  const chain = [];

  for (const prerequisite of prerequisites) {
    chain.push(prerequisite);

    const deeper = getPrerequisiteChain(prerequisite.id, visited);
    chain.push(...deeper);
  }

  return chain;
}

function validateGraph() {
  const index = loadIndex();
  const graph = loadRelationships();

  const ids = new Set(index.records.map(r => r.id));

  const invalidReferences = graph.relationships.filter(
    r => !ids.has(r.from) || !ids.has(r.to)
  );

  const selfReferences = graph.relationships.filter(
    r => r.from === r.to
  );

  const duplicateIds = graph.relationships
    .map(r => r.id)
    .filter((id, i, arr) => arr.indexOf(id) !== i);

  return {
    knowledge_records: index.records.length,
    relationships: graph.relationships.length,
    invalid_references: invalidReferences.length,
    self_references: selfReferences.length,
    duplicate_relationship_ids: duplicateIds.length,
    valid:
      invalidReferences.length === 0 &&
      selfReferences.length === 0 &&
      duplicateIds.length === 0
  };
}

module.exports = {
  getKnowledge,
  getRelationshipsFrom,
  getRelationshipsTo,
  getPrerequisites,
  getPrerequisiteChain,
  getDependents,
  getRelatedKnowledge,
  validateGraph
};

if (require.main === module) {
  const result = validateGraph();

  console.log("=== DREAM EDUCATION KNOWLEDGE GRAPH ENGINE ===");
  console.log("Knowledge records:", result.knowledge_records);
  console.log("Relationships:", result.relationships);
  console.log("Invalid references:", result.invalid_references);
  console.log("Self references:", result.self_references);
  console.log(
    "Duplicate relationship IDs:",
    result.duplicate_relationship_ids
  );
  console.log("Status:", result.valid ? "READY" : "CHECK REQUIRED");
}
