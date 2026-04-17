-- ============================================================
-- Medupal RAG: Patient Documents Vector Store
-- Run this in the Supabase SQL editor.
-- Requires pgvector extension (already enabled).
-- ============================================================

-- 1. Patient documents table
CREATE TABLE IF NOT EXISTS patient_documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  text        NOT NULL,
  chunk_text  text        NOT NULL,
  embedding   vector(768),
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 2. Vector index (ivfflat — good for up to ~1 M rows, cosine similarity)
CREATE INDEX IF NOT EXISTS patient_documents_embedding_idx
  ON patient_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 3. Regular index on patient_id for fast filtering
CREATE INDEX IF NOT EXISTS patient_documents_patient_id_idx
  ON patient_documents (patient_id);

-- 4. RPC function used by the FastAPI server for similarity search
CREATE OR REPLACE FUNCTION match_patient_documents(
  query_embedding    vector(768),
  patient_id_filter  text,
  match_count        int     DEFAULT 3,
  match_threshold    float   DEFAULT 0.4
)
RETURNS TABLE (
  id          uuid,
  patient_id  text,
  chunk_text  text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.patient_id,
    d.chunk_text,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM patient_documents d
  WHERE d.patient_id = patient_id_filter
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
