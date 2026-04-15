-- 012_developer_profiles.sql
CREATE TABLE IF NOT EXISTS developer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  login TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  repos JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections UUID[] NOT NULL DEFAULT '{}',
  activity JSONB NOT NULL DEFAULT '{"commit_count": 0, "languages": [], "recent_repos": []}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_profiles_login ON developer_profiles(login);
