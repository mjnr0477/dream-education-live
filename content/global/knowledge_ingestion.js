const fs = require("fs");
const path = require("path");

const GLOBAL_DIR = path.join(__dirname, "..");
const SCHEMA_FILE = path.join(GLOBAL_DIR, "knowledge_schema.json");
const INDEX_FILE = path.join(GLOBAL_DIR, "knowledge_index.json");
const SEED_FILE = path.join(GLOBAL_DIR, "knowledge_seed.json");
const SOURCES_FILE = path.join(GLOBAL_DIR, "ingestion", "sources.json");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function validateRecord(record) {
  const required = [
    "id",
    "title",
    "field",
    "domain",
    "topic",
    "definition",
    "key_ideas",
    "sources",
    "status"
  ];

  const missing = required.filter(
    key => record[key] === undefined || record[key] === null
  );

  return {
    valid: missing.length === 0,
    missing
  };
}

function addRecords(records) {
  const index = readJSON(INDEX_FILE);

  let added = 0;
  let skipped = 0;
  const errors = [];

  for (const record of records) {
    const validation = validateRecord(record);

    if (!validation.valid) {
      errors.push({
        id: record.id || null,
        missing: validation.missing
      });
      continue;
    }

    const exists = index.records.some(
      existing => existing.id === record.id
    );

    if (exists) {
      skipped++;
      continue;
    }

    index.records.push(record);
    added++;

    index.fields[record.field] =
      (index.fields[record.field] || 0) + 1;

    index.domains[record.domain] =
      (index.domains[record.domain] || 0) + 1;

    index.topics[record.topic] =
      (index.topics[record.topic] || 0) + 1;

    if (record.concept) {
      index.concepts[record.concept] =
        (index.concepts[record.concept] || 0) + 1;
    }
  }

  writeJSON(INDEX_FILE, index);

  return {
    added,
    skipped,
    errors
  };
}

function ingestSeed() {
  const seed = readJSON(SEED_FILE);
  return addRecords(seed.records || []);
}

function getStats() {
  const index = readJSON(INDEX_FILE);

  return {
    records: index.records.length,
    fields: Object.keys(index.fields).length,
    domains: Object.keys(index.domains).length,
    topics: Object.keys(index.topics).length,
    concepts: Object.keys(index.concepts).length
  };
}

function registerSource(source) {
  const data = fs.existsSync(SOURCES_FILE)
    ? readJSON(SOURCES_FILE)
    : {
        schema_version: "1.0",
        sources: []
      };

  const exists = data.sources.some(
    existing => existing.id === source.id
  );

  if (!exists) {
    data.sources.push(source);
    writeJSON(SOURCES_FILE, data);
    return true;
  }

  return false;
}

module.exports = {
  validateRecord,
  addRecords,
  ingestSeed,
  getStats,
  registerSource
};

if (require.main === module) {
  console.log("=== DREAM EDUCATION KNOWLEDGE INGESTION ===");

  readJSON(SCHEMA_FILE);

  const result = ingestSeed();

  registerSource({
    id: "openstax",
    name: "OpenStax",
    type: "open_educational_resource",
    license: "CC BY-NC-SA 4.0",
    commercial_use: false,
    action: "reference_only_until_commercial_rights_are_obtained"
  });

  registerSource({
    id: "mit-ocw",
    name: "MIT OpenCourseWare",
    type: "open_educational_resource",
    license: "CC BY-NC-SA 4.0",
    commercial_use: false,
    action: "reference_only_until_commercial_rights_are_obtained"
  });

  console.log("Added:", result.added);
  console.log("Skipped:", result.skipped);
  console.log("Errors:", result.errors.length);
  console.log("Stats:", getStats());
  console.log("Status: INGESTION ENGINE READY");
}
