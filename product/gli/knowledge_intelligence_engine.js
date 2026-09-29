"use strict";

const crypto = require("crypto");

function hashContent(content) {
  return crypto.createHash("sha256").update(String(content || "")).digest("hex");
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
  return {
    source: String(source || "unknown"),
    title: String(title || "Untitled"),
    uri: uri || null,
    content_hash: hashContent(content),
    tenant_id: tenantId,
    metadata,
    chunks: chunkText(content).map((chunk, index) => ({
      chunk_index: index,
      content: chunk
    }))
  };
}

module.exports = { hashContent, chunkText, buildDocumentRecord };
