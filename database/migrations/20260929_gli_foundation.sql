-- Dream Education GLI foundation.
-- Additive migration only. Existing learning tables/routes are untouched.

CREATE TABLE IF NOT EXISTS dream_learning_events (
  event_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_dream_learning_events_learner_time
  ON dream_learning_events (learner_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dream_learner_graph_snapshots (
  learner_id TEXT PRIMARY KEY,
  graph JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dream_school_tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dream_school_tenants_status
  ON dream_school_tenants (status);
