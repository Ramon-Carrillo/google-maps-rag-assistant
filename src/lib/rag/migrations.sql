-- Google Maps RAG Assistant — Database Setup (Neon Postgres + pgvector)
-- Run this in the Neon SQL Editor, or it will be applied via the MCP
-- during initial provisioning.

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  embedding   VECTOR(1024) NOT NULL,
  source_url  TEXT,
  source_title TEXT,
  chunk_index INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create IVFFlat index for approximate nearest-neighbor search.
-- Note: IVFFlat requires some data to build properly.
-- If you have < 1000 rows, you can reduce lists to 10-50.
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Secondary index to speed up re-ingestion (DELETE by source_url)
CREATE INDEX IF NOT EXISTS documents_source_url_idx
  ON documents (source_url);

-- 5. Create the similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  content      TEXT,
  source_url   TEXT,
  source_title TEXT,
  similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    source_url,
    source_title,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
