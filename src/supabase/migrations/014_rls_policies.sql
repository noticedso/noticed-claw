-- 014_rls_policies.sql

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE compaction_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy: tenants table
DO $$ BEGIN
  CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: sessions
DO $$ BEGIN
  CREATE POLICY tenant_isolation_sessions ON sessions
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: messages (via session -> tenant)
DO $$ BEGIN
  CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL USING (session_id IN (
      SELECT s.id FROM sessions s
      JOIN tenants t ON t.id = s.tenant_id
      WHERE t.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: memories
DO $$ BEGIN
  CREATE POLICY tenant_isolation_memories ON memories
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: compaction_summaries (via session -> tenant)
DO $$ BEGIN
  CREATE POLICY tenant_isolation_compaction_summaries ON compaction_summaries
    FOR ALL USING (session_id IN (
      SELECT s.id FROM sessions s
      JOIN tenants t ON t.id = s.tenant_id
      WHERE t.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: missions
DO $$ BEGIN
  CREATE POLICY tenant_isolation_missions ON missions
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: workspace_files
DO $$ BEGIN
  CREATE POLICY tenant_isolation_workspace_files ON workspace_files
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: cron_jobs
DO $$ BEGIN
  CREATE POLICY tenant_isolation_cron_jobs ON cron_jobs
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenant isolation policy: session_summaries
DO $$ BEGIN
  CREATE POLICY tenant_isolation_session_summaries ON session_summaries
    FOR ALL USING (tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No RLS on thread_inbound_queue (system-level, not tenant-scoped)
-- No RLS on developer_profiles (public seeded data)
-- No RLS on eval_runs / eval_results (admin-only)
