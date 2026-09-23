CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  learner_id TEXT,
  teacher_id TEXT,
  parent_id TEXT,
  school_id TEXT,
  plan_type TEXT,
  subscription_status TEXT,
  free_forever BOOLEAN NOT NULL DEFAULT FALSE,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learners (
  learner_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Learner',
  role TEXT NOT NULL DEFAULT 'learner',
  level TEXT,
  grade TEXT,
  school TEXT,
  preferred_learning_method TEXT,
  custom_learning_method TEXT,
  active_subject TEXT,
  active_topic TEXT,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'teacher',
  name TEXT NOT NULL,
  school TEXT,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  analytics JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parents (
  parent_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'parent',
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schools (
  school_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'school',
  name TEXT NOT NULL,
  location TEXT,
  analytics JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  class_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT,
  teacher_id TEXT,
  school_id TEXT,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_learners (
  class_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, learner_id)
);

CREATE TABLE IF NOT EXISTS results (
  result_id BIGSERIAL PRIMARY KEY,
  learner_id TEXT,
  class_id TEXT,
  subject TEXT,
  topic TEXT,
  score NUMERIC,
  assessment_type TEXT,
  recorded_at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS connections (
  connection_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  from_role TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_role TEXT NOT NULL,
  to_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id TEXT PRIMARY KEY,
  connection_id TEXT,
  created_by_role TEXT,
  created_by_id TEXT,
  title TEXT,
  type TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_accounts_email
  ON accounts (email);

CREATE INDEX IF NOT EXISTS idx_accounts_learner
  ON accounts (learner_id);

CREATE INDEX IF NOT EXISTS idx_results_learner
  ON results (learner_id);

CREATE INDEX IF NOT EXISTS idx_results_class
  ON results (class_id);

CREATE INDEX IF NOT EXISTS idx_connections_from
  ON connections (from_id);

CREATE INDEX IF NOT EXISTS idx_connections_to
  ON connections (to_id);

CREATE INDEX IF NOT EXISTS idx_connections_status
  ON connections (status);

CREATE INDEX IF NOT EXISTS idx_meetings_connection
  ON meetings (connection_id);
