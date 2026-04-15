-- 011_thread_inbound_queue.sql
CREATE TABLE IF NOT EXISTS thread_inbound_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_inbound_queue_thread_id
  ON thread_inbound_queue(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_inbound_queue_unprocessed
  ON thread_inbound_queue(thread_id, created_at)
  WHERE processed_at IS NULL;
