-- Meaningful learning sessions: durable record of evidence-grounded learning cycles.
create table if not exists public.dream_learning_sessions (
  session_id uuid primary key default gen_random_uuid(),
  learner_id text not null,
  question text not null,
  subject text,
  topic text,
  level text,
  score numeric not null default 0,
  understanding text,
  mastery_state text,
  next_action text,
  session_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  evidence_status text,
  attempt_number integer not null default 1,
  prior_average numeric,
  improvement_from_prior numeric,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_dream_learning_sessions_learner_time
  on public.dream_learning_sessions (learner_id, created_at desc);

create index if not exists idx_dream_learning_sessions_topic
  on public.dream_learning_sessions (learner_id, topic, created_at desc);

alter table public.dream_learning_sessions enable row level security;

-- The application server uses its server-side Supabase credential.
-- No direct anon/authenticated Data API access is granted by this migration.
revoke all on table public.dream_learning_sessions from anon, authenticated;
grant all on table public.dream_learning_sessions to service_role;
