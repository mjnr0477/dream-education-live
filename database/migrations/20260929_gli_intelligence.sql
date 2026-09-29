-- GLI extended platform layer. Additive and RLS-protected.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS dream_knowledge_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  uri TEXT,
  content_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, content_hash)
);

CREATE TABLE IF NOT EXISTS dream_knowledge_chunks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES dream_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding extensions.vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_dream_knowledge_documents_tenant
  ON dream_knowledge_documents(tenant_id);

CREATE INDEX IF NOT EXISTS idx_dream_knowledge_chunks_document
  ON dream_knowledge_chunks(document_id);

CREATE TABLE IF NOT EXISTS dream_competency_credentials (
  credential_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  competency TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dream_credentials_learner
  ON dream_competency_credentials(learner_id);

ALTER TABLE dream_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_competency_credentials ENABLE ROW LEVEL SECURITY;

-- These tables are accessed by the authenticated Dream Education server,
-- while direct client exposure remains closed by default.
REVOKE ALL ON dream_knowledge_documents FROM anon, authenticated;
REVOKE ALL ON dream_knowledge_chunks FROM anon, authenticated;
REVOKE ALL ON dream_competency_credentials FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_dream_knowledge_embedding_hnsw
  ON dream_knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
