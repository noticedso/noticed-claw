CREATE OR REPLACE FUNCTION match_developer_profiles(
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  min_score float DEFAULT 0.15
)
RETURNS TABLE (
  id uuid,
  login text,
  name text,
  bio text,
  skills text[],
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.login,
    dp.name,
    dp.bio,
    dp.skills,
    (1 - (dp.embedding <=> query_embedding))::float AS similarity
  FROM developer_profiles dp
  WHERE dp.embedding IS NOT NULL
    AND (1 - (dp.embedding <=> query_embedding)) >= min_score
  ORDER BY dp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
