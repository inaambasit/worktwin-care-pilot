-- Milestone 4D: Document chunk storage
-- Run after 001_document_registry.sql.
-- Backend uses service role key only — no public or frontend direct access.
-- No embeddings are stored in this table; a vector column will be added in a later milestone.

create table if not exists document_chunks (
    id                      uuid        primary key default gen_random_uuid(),
    organisation_id         text        not null,
    document_id             uuid        not null references document_registry(id) on delete cascade,
    chunk_index             integer     not null,
    chunk_text              text        not null,
    chunk_character_count   integer,
    source_page_start       integer,
    source_page_end         integer,
    section_title           text,
    access_roles            text[]      default '{}',
    status                  text        not null default 'pending',
    vertical                text,
    category                text,
    approved_for_ai_answers boolean     default false,
    escalation_required     boolean     default false,
    is_sensitive            boolean     default false,
    embedding_status        text        default 'not_started',
    embedding_model         text,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    metadata                jsonb       default '{}'::jsonb,

    constraint uq_document_chunk unique (document_id, chunk_index)
);

create index if not exists idx_doc_chunks_org_id           on document_chunks (organisation_id);
create index if not exists idx_doc_chunks_document_id      on document_chunks (document_id);
create index if not exists idx_doc_chunks_status           on document_chunks (status);
create index if not exists idx_doc_chunks_category         on document_chunks (category);
create index if not exists idx_doc_chunks_vertical         on document_chunks (vertical);
create index if not exists idx_doc_chunks_embedding_status on document_chunks (embedding_status);
create index if not exists idx_doc_chunks_approved_for_ai  on document_chunks (approved_for_ai_answers);
create index if not exists idx_doc_chunks_escalation       on document_chunks (escalation_required);
create index if not exists idx_doc_chunks_created_at       on document_chunks (created_at desc);

-- RLS enabled. Backend uses service role key (bypasses RLS).
-- No public or frontend direct access to this table.
-- No embeddings stored yet — embedding_status tracks future readiness.
alter table document_chunks enable row level security;
