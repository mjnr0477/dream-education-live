"use strict";

const crypto = require("crypto");

function hashContent(content) {
  return crypto.createHash("sha256").update(String(content || "")).digest("hex");
}

function normalizeUri(uri) {
  if (!uri) return null;
  try {
    const value = new URL(String(uri));
    value.hash = "";
    return value.toString();
  } catch (_) {
    return String(uri).trim() || null;
  }
}

function buildProvenance({
  source = "unknown",
  title = "Untitled",
  uri = null,
  contentHash = null,
  retrievedAt = null,
  metadata = {}
} = {}) {
  return {
    source: String(source || "unknown"),
    title: String(title || "Untitled"),
    uri: normalizeUri(uri),
    content_hash: contentHash || null,
    retrieved_at: retrievedAt || new Date().toISOString(),
    metadata: metadata && typeof metadata === "object" ? metadata : {}
  };
}

function chunkText(content, maxChars = 1800) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

function buildDocumentRecord({ source, title, uri, content, tenantId = null, metadata = {} }) {
  const contentHash = hashContent(content);
  const provenance = buildProvenance({
    source, title, uri, contentHash, metadata
  });
  return {
    source: provenance.source,
    title: provenance.title,
    uri: provenance.uri,
    content_hash: contentHash,
    tenant_id: tenantId,
    metadata: { ...metadata, provenance },
    chunks: chunkText(content).map((chunk, index) => ({
      chunk_index: index,
      content: chunk,
      provenance: {
        ...provenance,
        chunk_index: index,
        chunk_hash: hashContent(chunk)
      }
    }))
  };
}

function enrichKnowledgeResult(result = {}, retrievedAt = null) {
  const contentHash = result.content_hash || hashContent(result.content);
  const provenance = buildProvenance({
    source: result.source,
    title: result.title,
    uri: result.uri,
    contentHash,
    retrievedAt,
    metadata: result.metadata || {}
  });
  return {
    ...result,
    content_hash: contentHash,
    provenance,
    source_uri: provenance.uri
  };
}

module.exports = {
  hashContent,
  chunkText,
  buildProvenance,
  buildDocumentRecord,
  enrichKnowledgeResult
};
