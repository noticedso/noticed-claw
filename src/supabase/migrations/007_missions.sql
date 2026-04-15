-- 007_missions.sql
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('mission', 'goal')),
  mission_type TEXT CHECK (mission_type IN ('onboarding', 'audience_building', 'outreach')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  checkpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_tenant_id ON missions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_missions_tenant_status ON missions(tenant_id, status);
