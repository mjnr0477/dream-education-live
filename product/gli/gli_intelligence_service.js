"use strict";

const crypto = require("crypto");
const OpenAI = require("openai");
const gliPostgres = require("../../infrastructure/database/postgres");
const { buildDocumentRecord } = require("./knowledge_intelligence_engine");

function poolReady() {
  return Boolean(gliPostgres.getPool());
}

function embeddingClient() {
  if (!process.env.AI_API_KEY) return null;
  try {
    return new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL || undefined
    });
  } catch (_) {
    return null;
  }
}

async function createEmbedding(text) {
  const client = embeddingClient();
  if (!client || !process.env.EMBEDDING_MODEL) return null;
  const result = await client.embeddings.create({
    model: process.env.EMBEDDING_MODEL,
    input: String(text)
  });
  const vector = result?.data?.[0]?.embedding;
  return Array.isArray(vector) && vector.length === 1536 ? vector : null;
}

async function persistLearnerGraph(learnerId, graph) {
  if (!poolReady()) return { persisted: false, reason: "postgres_unavailable" };
  await gliPostgres.query(
    `INSERT INTO dream_learner_graph_snapshots (learner_id, graph, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (learner_id)
     DO UPDATE SET graph = EXCLUDED.graph, updated_at = NOW()`,
    [String(learnerId), JSON.stringify(graph)]
  );
  return { persisted: true };
}

async function ingestKnowledgeDocument(input) {
  if (!poolReady()) throw new Error("Postgres is required for knowledge ingestion.");
  const record = buildDocumentRecord(input);
  if (!record.content_hash || !record.chunks.length) throw new Error("Knowledge content is required.");

  const doc = await gliPostgres.query(
    `INSERT INTO dream_knowledge_documents
      (tenant_id, source, title, uri, content_hash, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (source, content_hash)
     DO UPDATE SET title = EXCLUDED.title, uri = EXCLUDED.uri,
                   metadata = EXCLUDED.metadata
     RETURNING id, tenant_id, source, title, uri, content_hash`,
    [record.tenant_id, record.source, record.title, record.uri, record.content_hash, JSON.stringify(record.metadata || {})]
  );

  const document = doc.rows[0];
  for (const chunk of record.chunks) {
    let embedding = null;
    try { embedding = await createEmbedding(chunk.content); } catch (error) {
      console.warn("GLI embedding unavailable; storing lexical chunk only:", error.message);
    }
    const vectorLiteral = embedding
      ? "[" + embedding.map(Number).join(",") + "]"
      : null;

    await gliPostgres.query(
      `INSERT INTO dream_knowledge_chunks
        (document_id, chunk_index, content, metadata, embedding)
       VALUES ($1, $2, $3, $4::jsonb, $5::extensions.vector)
       ON CONFLICT (document_id, chunk_index)
       DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata,
                     embedding = EXCLUDED.embedding`,
      [document.id, chunk.chunk_index, chunk.content, JSON.stringify({ source: record.source }), vectorLiteral]
    );
  }
  return { ...document, chunks: record.chunks.length };
}

async function searchKnowledge(query, limit = 8) {
  if (!poolReady()) throw new Error("Postgres is required for knowledge search.");
  const q = String(query || "").trim();
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  if (!q) return [];

  let embedding = null;
  try { embedding = await createEmbedding(q); } catch (error) {
    console.warn("GLI query embedding unavailable; using lexical search:", error.message);
  }

  if (embedding) {
    const vectorLiteral = "[" + embedding.map(Number).join(",") + "]";
    const result = await gliPostgres.query(
      `SELECT d.id AS document_id, d.source, d.title, d.uri,
              c.id AS chunk_id, c.chunk_index, c.content,
              1 - (c.embedding <=> $1::extensions.vector) AS similarity
       FROM dream_knowledge_chunks c
       JOIN dream_knowledge_documents d ON d.id = c.document_id
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::extensions.vector
       LIMIT $2`,
      [vectorLiteral, safeLimit]
    );
    if (result.rows.length) return result.rows;
  }

  const result = await gliPostgres.query(
    `SELECT d.id AS document_id, d.source, d.title, d.uri,
            c.id AS chunk_id, c.chunk_index, c.content,
            NULL::double precision AS similarity
     FROM dream_knowledge_chunks c
     JOIN dream_knowledge_documents d ON d.id = c.document_id
     WHERE c.content ILIKE $1
     ORDER BY d.created_at DESC, c.chunk_index ASC
     LIMIT $2`,
    ["%" + q + "%", safeLimit]
  );
  return result.rows;
}

async function issueCredential({ learnerId, competency, evidence = {} }) {
  if (!poolReady()) throw new Error("Postgres is required for credential issuance.");
  if (!String(competency || "").trim()) throw new Error("Competency is required.");

  const credentialId = "cred_" + crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const immutableReference = crypto.createHash("sha256")
    .update(JSON.stringify({ credentialId, learnerId: String(learnerId), competency: String(competency), evidence, issuedAt }))
    .digest("hex");

  await gliPostgres.query(
    `INSERT INTO dream_competency_credentials
      (credential_id, learner_id, competency, evidence, status, issued_at)
     VALUES ($1, $2, $3, $4::jsonb, 'issued', $5)`,
    [credentialId, String(learnerId), String(competency).trim(), JSON.stringify(evidence), issuedAt]
  );

  return {
    credential_id: credentialId,
    learner_id: String(learnerId),
    competency: String(competency).trim(),
    evidence,
    status: "issued",
    issued_at: issuedAt,
    verification: { protocol: "dream-education", version: "1.0.0", immutable_reference: immutableReference }
  };
}

async function listCredentials(learnerId) {
  if (!poolReady()) throw new Error("Postgres is required for credential lookup.");
  const result = await gliPostgres.query(
    `SELECT credential_id, learner_id, competency, evidence, status, issued_at, expires_at
     FROM dream_competency_credentials WHERE learner_id = $1 ORDER BY issued_at DESC`,
    [String(learnerId)]
  );
  return result.rows;
}

async function verifyCredential(credentialId) {
  if (!poolReady()) throw new Error("Postgres is required for credential verification.");
  const result = await gliPostgres.query(
    `SELECT credential_id, learner_id, competency, evidence, status, issued_at, expires_at
     FROM dream_competency_credentials WHERE credential_id = $1 LIMIT 1`,
    [String(credentialId)]
  );
  if (!result.rows.length) return { valid: false, reason: "not_found" };
  const row = result.rows[0];
  const immutableReference = crypto.createHash("sha256")
    .update(JSON.stringify({
      credentialId: row.credential_id, learnerId: row.learner_id,
      competency: row.competency, evidence: row.evidence, issuedAt: row.issued_at
    }))
    .digest("hex");
  const expired = row.expires_at && new Date(row.expires_at) <= new Date();
  return {
    valid: row.status === "issued" && !expired,
    credential: row,
    verification: { protocol: "dream-education", version: "1.0.0", immutable_reference: immutableReference }
  };
}

module.exports = {
  persistLearnerGraph,
  ingestKnowledgeDocument,
  searchKnowledge,
  issueCredential,
  listCredentials,
  verifyCredential
};
