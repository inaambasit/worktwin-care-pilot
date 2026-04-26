-- Milestone 4G: Admin-only vector search / retrieval test
-- Run after 005_document_embeddings.sql.
--
-- This file:
--   A) Creates an optional HNSW vector index on document_embeddings.embedding
--   B) Creates the match_document_chunks Postgres function for cosine similarity search
--
-- Access policy:
--   The function is available to service_role only.
--   No anon or authenticated (frontend) access is granted.
--   The backend calls this function server-side via the service role key exclusively.
--   chunk_text is returned by the function but is only accessible because
--   the backend truncates it to a 350-character preview before including it in
--   API responses — the full text is never returned to the frontend.

-- ---------------------------------------------------------------------------
-- A) HNSW vector index (cosine similarity)
--    Requires pgvector >= 0.5.0 (Supabase hosted projects include this by default).
--    If HNSW is not supported on your pgvector version, remove this block —
--    the full-table scan is acceptable for small pilot datasets (< 10,000 rows).
-- ---------------------------------------------------------------------------

create index if not exists idx_doc_embeddings_embedding_hnsw
  on document_embeddings
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- ---------------------------------------------------------------------------
-- B) match_document_chunks — vector similarity search function
--
-- Joins document_embeddings → document_chunks → document_registry and returns
-- the closest matching chunks (by cosine similarity) for a query vector.
--
-- Parameters:
--   query_embedding       — the embedded query vector (1536 dimensions)
--   match_organisation_id — filter to one organisation
--   match_threshold       — minimum cosine similarity to include (default 0.0)
--   match_count           — maximum rows to return (default 5)
--
-- Only returns rows where:
--   - embedding is not null
--   - embedding_status = 'embedded'
--   - organisation_id = match_organisation_id
--   - similarity >= match_threshold
--
-- Safety: the post-fetch safety filter (escalation_required, is_sensitive,
-- approved_for_ai_answers) is applied by the backend before returning results
-- to callers. This function itself returns all matching embedded chunks so
-- the backend can log and audit what was filtered.
-- ---------------------------------------------------------------------------

create or replace function match_document_chunks(
  query_embedding       vector(1536),
  match_organisation_id text,
  match_threshold       float   default 0.0,
  match_count           int     default 5
)
returns table (
  chunk_id                uuid,
  document_id             uuid,
  chunk_index             integer,
  chunk_text              text,
  similarity              float,
  document_title          text,
  category                text,
  vertical                text,
  access_roles            text[],
  approved_for_ai_answers boolean,
  escalation_required     boolean,
  is_sensitive            boolean,
  embedding_status        text
)
language sql stable
as $$
  select
    dc.id                                    as chunk_id,
    dc.document_id                           as document_id,
    dc.chunk_index                           as chunk_index,
    dc.chunk_text                            as chunk_text,
    1 - (de.embedding <=> query_embedding)   as similarity,
    dr.title                                 as document_title,
    de.category                              as category,
    de.vertical                              as vertical,
    de.access_roles                          as access_roles,
    de.approved_for_ai_answers               as approved_for_ai_answers,
    de.escalation_required                   as escalation_required,
    de.is_sensitive                          as is_sensitive,
    de.embedding_status                      as embedding_status
  from document_embeddings de
  join document_chunks dc
    on dc.id = de.chunk_id
  join document_registry dr
    on dr.id = de.document_id
  where de.embedding is not null
    and de.embedding_status = 'embedded'
    and de.organisation_id = match_organisation_id
    and 1 - (de.embedding <=> query_embedding) >= match_threshold
  order by de.embedding <=> query_embedding
  limit match_count;
$$;

-- Restrict access: revoke from public (covers anon + authenticated frontend roles).
-- service_role bypasses these restrictions automatically in Supabase.
-- No frontend, no staff app, no anon client can call this function directly.
revoke execute on function match_document_chunks(vector(1536), text, float, int) from public;
