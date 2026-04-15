-- 002_tenants.sql
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- no FK to auth.users for workshop flexibility
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{
    "model": "gpt-4o",
    "persona": "donna",
    "heartbeatEnabled": false,
    "heartbeatIntervalMs": 3600000,
    "activeHoursStart": 9,
    "activeHoursEnd": 22,
    "timezone": "UTC",
    "toolPolicy": {},
    "preferredChannel": null
  }'::jsonb,
  next_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_next_heartbeat ON tenants(next_heartbeat_at)
  WHERE next_heartbeat_at IS NOT NULL;
