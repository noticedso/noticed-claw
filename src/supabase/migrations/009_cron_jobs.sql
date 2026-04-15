-- 009_cron_jobs.sql
CREATE TABLE IF NOT EXISTS cron_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('at', 'every', 'cron')),
  schedule_value TEXT NOT NULL,
  schedule_timezone TEXT NOT NULL DEFAULT 'UTC',
  session_target TEXT NOT NULL DEFAULT 'main' CHECK (session_target IN ('main', 'isolated')),
  payload_text TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_tenant_id ON cron_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at)
  WHERE enabled = true AND next_run_at IS NOT NULL;
