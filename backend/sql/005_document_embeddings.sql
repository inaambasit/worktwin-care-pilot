-- Milestone 4E: pgvector extension and embedding record storage preparation
-- Run after 003_document_chunks.sql and 004_document_extractions.sql.
-- No embeddings are generated in this milestone — the embedding column is nullable.
-- Backend uses service role key only — no public or frontend direct access.
--
-- vector(1536): dimension matches text-embedding-ada-002 (OpenAI) and
-- text-embedding-3-small (OpenAI). Change to vector(3072) for
-- text-embedding-3-large, or vector(768) for smaller open-source models.
-- Dimensions are documented here so the column can be altered before generation begins.

-- Enable pgvector. Requires the Supabase pgvector add-on (enabled by default on
-- hosted Supabase projects). Safe to re-run — no-op if already installed.
create extension if not exists vector;

create table if not exists document_embeddings (
    id                      uuid        primary key default gen_random_uuid(),
    organisation_id         text        not null,
    document_id             uuid        not null references document_registry(id) on delete cascade,
    chunk_id                uuid        not null references document_chunks(id) on delete cascade,
    embedding_model         text,
    embedding_dimensions    integer,
    -- NULL until an embedding is generated. Generation is gated behind governance review.
    embedding               vector(1536),
    embedding_status        text        not null default 'not_started',
    embedding_error         text,
    approved_for_ai_answers boolean     default false,
    escalation_required     boolean     default false,
    is_sensitive            boolean     default false,
    access_roles            text[]      default '{}',
    vertical                text,
    category                text,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    metadata                jsonb       default '{}'::jsonb,

    -- One embedding record per chunk.
    constraint uq_embedding_chunk unique (chunk_id)
);

create index if not exists idx_doc_embeddings_org_id      on document_embeddings (organisation_id);
create index if not exists idx_doc_embeddings_document_id on document_embeddings (document_id);
create index if not exists idx_doc_embeddings_chunk_id    on document_embeddings (chunk_id);
create index if not exists idx_doc_embeddings_status      on document_embeddings (embedding_status);
create index if not exists idx_doc_embeddings_approved_ai on document_embeddings (approved_for_ai_answers);
create index if not exists idx_doc_embeddings_escalation  on document_embeddings (escalation_required);
create index if not exists idx_doc_embeddings_category    on document_embeddings (category);
create index if not exists idx_doc_embeddings_vertical    on document_embeddings (vertical);
create index if not exists idx_doc_embeddings_created_at  on document_embeddings (created_at desc);

-- RLS enabled. Backend service role bypasses RLS automatically.
-- No public or frontend access policies are created here.
-- All read/write operations are performed server-side via the backend service role.
alter table document_embeddings enable row level security;
