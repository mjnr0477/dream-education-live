-- GLI Foundation 02: auditable learning evidence and decision provenance.
-- Safe additive migration: no existing adaptive, learner, or payment tables are changed.

CREATE TABLE IF NOT EXISTS public.dream_learning_evidence_ledger (
  evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id TEXT NOT NULL,
  session_id UUID,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN ('assessment','retrieval','teaching','decision','outcome','credential','interaction')
  ),
  concept_key TEXT,
  source TEXT,
  source_uri TEXT,
  content_hash TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_dream_evidence_learner_time
  ON public.dream_learning_evidence_ledger (learner_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_dream_evidence_learner_concept
  ON public.dream_learning_evidence_ledger (learner_id, concept_key, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_dream_evidence_type_time
  ON public.dream_learning_evidence_ledger (evidence_type, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.dream_learning_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_hash TEXT,
  model_provider TEXT,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dream_decisions_learner_time
  ON public.dream_learning_decisions (learner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dream_decisions_type_time
  ON public.dream_learning_decisions (decision_type, created_at DESC);

ALTER TABLE public.dream_learning_evidence_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_learning_decisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.dream_learning_evidence_ledger,
  public.dream_learning_decisions
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.dream_learning_evidence_ledger,
  public.dream_learning_decisions
TO service_role;
