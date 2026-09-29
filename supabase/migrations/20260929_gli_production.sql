CREATE TABLE IF NOT EXISTS dream_tenant_memberships (
  tenant_id TEXT NOT NULL REFERENCES dream_school_tenants(tenant_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','teacher','parent','learner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_dream_tenant_memberships_account
  ON dream_tenant_memberships (account_id, status);

CREATE INDEX IF NOT EXISTS idx_dream_tenant_memberships_tenant
  ON dream_tenant_memberships (tenant_id, status);

ALTER TABLE dream_knowledge_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dream_knowledge_documents_tenant
  ON dream_knowledge_documents (tenant_id, created_at DESC);

ALTER TABLE dream_competency_credentials
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_dream_credentials_learner_status
  ON dream_competency_credentials (learner_id, status);

CREATE INDEX IF NOT EXISTS idx_dream_learning_events_type_time
  ON dream_learning_events (event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dream_developer_api_keys (
  key_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES dream_school_tenants(tenant_id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dream_developer_api_keys_tenant
  ON dream_developer_api_keys (tenant_id, status);
