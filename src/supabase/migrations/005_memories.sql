-- 005_memories.sql
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('daily', 'curated')),
  embedding vector(1536),
  category TEXT NOT NULL CHECK (category IN ('preference', 'decision', 'fact', 'commitment', 'milestone')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  superseded_by UUID REFERENCES memories(id),
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_tenant_id ON memories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_status ON memories(tenant_id, status);

-- Semantic similarity search function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_count int,
  tenant uuid,
  min_score float DEFAULT 0.5
)
RETURNS TABLE (id uuid, content text, category text, memory_type text, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.category, m.memory_type,
         1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.tenant_id = tenant
    AND m.status = 'active'
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= min_score
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
