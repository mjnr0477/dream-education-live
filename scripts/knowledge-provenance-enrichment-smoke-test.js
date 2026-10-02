"use strict";

const assert = require("assert");
const {
  hashContent,
  buildProvenance,
  buildDocumentRecord,
  enrichKnowledgeResult
} = require("../product/gli/knowledge_intelligence_engine");

const content = "Photosynthesis converts light energy into chemical energy.";
const hash = hashContent(content);
const provenance = buildProvenance({
  source: "test-source",
  title: "Test Knowledge",
  uri: "https://example.org/article#section",
  contentHash: hash,
  retrievedAt: "2026-10-02T10:00:00Z"
});

assert.strictEqual(provenance.uri, "https://example.org/article");
assert.strictEqual(provenance.content_hash, hash);
assert.strictEqual(provenance.retrieved_at, "2026-10-02T10:00:00Z");

const record = buildDocumentRecord({
  source: "test-source",
  title: "Test Knowledge",
  uri: "https://example.org/article#section",
  content
});
assert.strictEqual(record.metadata.provenance.content_hash, hash);
assert.strictEqual(record.chunks[0].provenance.chunk_index, 0);
assert.strictEqual(record.chunks[0].provenance.chunk_hash, hashContent(record.chunks[0].content));

const enriched = enrichKnowledgeResult({
  source: "test-source",
  title: "Test Knowledge",
  uri: "https://example.org/article#section",
  content
}, "2026-10-02T10:00:00Z");
assert.strictEqual(enriched.source_uri, "https://example.org/article");
assert.strictEqual(enriched.provenance.content_hash, hash);
assert.strictEqual(enriched.provenance.retrieved_at, "2026-10-02T10:00:00Z");

console.log("Knowledge provenance enrichment smoke test: PASS");
