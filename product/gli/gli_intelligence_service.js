"use strict";

const crypto = require("crypto");
const gliPostgres = require("../../infrastructure/database/postgres");
const { buildDocumentRecord } = require("./knowledge_intelligence_engine");
const { buildLearnerGraph } = require("./learner_graph_engine");

function poolReady() {
  return Boolean(gliPostgres.getPool());
}

async function persistLearnerGraph(learnerId, graph) {
  if (!poolReady()) return { persisted: false, reason: "postgres_unavailable" };
  await gliPostgres.query(
    `INSERT INTO dream_learner_graph_snapshots (learner_id, graph, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (learner_id)
     DO UPDATE SET graph = EXCLUDED.graph, updated_at = NOW()`,
    [learnerId, JSON.stringify(graph)]
  );
  return { persisted: true };
}

async function ingestKnowledgeDocument(input) {
  if (!poolReady()) throw new Error("Postgres is required for knowledge ingestion.");

  const record = buildDocumentRecord(input);
  if (!record.content_hash || !record.chunks.length) {
    throw new Error("Knowledge content is required.");
  }

  const doc = await gliPostgres.query(
    `INSERT INTO dream_knowledge_documents
      (tenant_id, source, title, uri, content_hash, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (source, content_hash)
     DO UPDATE SET title = EXCLUDED.title, uri = EXCLUDED.uri,
                   metadata = EXCLUDED.metadata
     RETURNING id, tenant_id, source, title, uri, content_hash`,
    [
      record.tenant_id,
      record.source,
      record.title,
      record.uri,
      record.content_hash,
      JSON.stringify(record.metadata || {})
    ]
  );

  const document = doc.rows[0];
  for (const chunk of record.chunks) {
    await gliPostgres.query(
      `INSERT INTO dream_knowledge_chunks
        (document_id, chunk_index, content, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (document_id, chunk_index)
       DO UPDATE SET content = EXCLUDED.content,
                     metadata = EXCLUDED.metadata`,
      [document.id, chunk.chunk_index, chunk.content, JSON.stringify({ source: record.source })]
    );
  }

  return { ...document, chunks: record.chunks.length };
}

async function searchKnowledge(query, limit = 8) {
  if (!poolReady()) throw new Error("Postgres is required for knowledge search.");
  const q = String(query || "").trim();
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  if (!q) return [];

  const result = await gliPostgres.query(
    `SELECT d.id AS document_id, d.source, d.title, d.uri,
            c.id AS chunk_id, c.chunk_index, c.content
     FROM dream_knowledge_chunks c
     JOIN dream_knowledge_documents d ON d.id = c.document_id
     WHERE c.content ILIKE $1
     ORDER BY d.created_at DESC, c.chunk_index ASC
     LIMIT $2`,
    ["%" + q.replace(/[%_]/g, "\\$&") + "%", safeLimit]
  );
  return result.rows;
}

async function issueCredential({ learnerId, competency, evidence = {} }) {
  if (!poolReady()) throw new Error("Postgres is required for credential issuance.");
  const credentialId = "cred_" + crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const immutableReference = crypto
    .createHash("sha256")
    .update(JSON.stringify({ credentialId, learnerId, competency, evidence, issuedAt }))
    .digest("hex");

  await gliPostgres.query(
    `INSERT INTO dream_competency_credentials
      (credential_id, learner_id, competency, evidence, status, issued_at)
     VALUES ($1, $2, $3, $4::jsonb, 'issued', $5)`,
    [credentialId, String(learnerId), String(competency), JSON.stringify(evidence), issuedAt]
  );

  return {
    credential_id: credentialId,
    learner_id: String(learnerId),
    competency: String(competency),
    evidence,
    status: "issued",
    issued_at: issuedAt,
    verification: {
      protocol: "dream-education",
      version: "1.0.0",
      immutable_reference: immutableReference
    }
  };
}

async function listCredentials(learnerId) {
  if (!poolReady()) throw new Error("Postgres is required for credential lookup.");
  const result = await gliPostgres.query(
    `SELECT credential_id, learner_id, competency, evidence, status, issued_at, expires_at
     FROM dream_competency_credentials
     WHERE learner_id = $1
     ORDER BY issued_at DESC`,
    [String(learnerId)]
  );
  return result.rows;
}

module.exports = {
  persistLearnerGraph,
  ingestKnowledgeDocument,
  searchKnowledge,
  issueCredential,
  listCredentials,
  buildLearnerGraph
};
