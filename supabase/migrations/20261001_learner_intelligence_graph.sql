-- Build 01: durable learner intelligence graph snapshots.
-- Safe additive migration: no existing learner/profile/adaptive tables are modified.

CREATE TABLE IF NOT EXISTS dream_learner_graph_snapshots (
  learner_id TEXT PRIMARY KEY,
  graph JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dream_learner_graph_snapshots_updated
  ON dream_learner_graph_snapshots (updated_at DESC);
