-- Milestone 4D: Full extracted text storage
-- Run after 001_document_registry.sql.
-- Full extracted text is stored here — backend and admin only.
-- Never expose full extracted text in the staff UI.
-- Backend uses service role key only — no public or frontend direct access.

create table if not exists document_extractions (
    id                          uuid        primary key default gen_random_uuid(),
    organisation_id             text        not null,
    document_id                 uuid        not null references document_registry(id) on delete cascade,
    extraction_status           text        not null,
    extracted_text              text,
    extracted_character_count   integer,
    extracted_page_count        integer,
    extraction_warnings         text[]      default '{}',
    personal_data_risk          text,
    personal_data_warnings      text[]      default '{}',
    created_at                  timestamptz default now(),
    updated_at                  timestamptz default now(),
    metadata                    jsonb       default '{}'::jsonb
);

create index if not exists idx_doc_extractions_org_id     on document_extractions (organisation_id);
create index if not exists idx_doc_extractions_doc_id     on document_extractions (document_id);
create index if not exists idx_doc_extractions_status     on document_extractions (extraction_status);
create index if not exists idx_doc_extractions_created_at on document_extractions (created_at desc);

-- RLS enabled. Backend uses service role key (bypasses RLS).
-- No public or frontend direct access.
-- Full extracted text must never be served in the staff UI.
alter table document_extractions enable row level security;
