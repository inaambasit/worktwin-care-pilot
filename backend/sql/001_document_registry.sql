-- Milestone 4C: Persistent document registry
-- Run this in Supabase SQL Editor before using the persistent registry.
-- Table: document_registry
-- Backend uses service role key only — no frontend direct DB access.

create table if not exists document_registry (
    id                          uuid          primary key default gen_random_uuid(),
    organisation_id             text          not null,
    title                       text          not null,
    description                 text,
    file_name                   text          not null,
    file_type                   text          not null default 'pdf',
    file_size_bytes             integer       not null,
    storage_key                 text          not null,
    vertical                    text          not null,
    category                    text          not null,
    tags                        text[]        default '{}',
    status                      text          not null default 'draft',
    access_roles                text[]        default '{}',
    is_sensitive                boolean       default false,
    escalation_required         boolean       default false,
    approved_for_ai_answers     boolean       default false,
    contains_personal_data_warning boolean    default false,
    primary_language            text          default 'en',
    available_languages         text[]        default '{en}',
    translation_status          text          default 'not_required',
    human_review_required       boolean       default true,
    version                     text          default '1.0',
    review_due_date             date,
    embedding_status            text          default 'pending',
    extraction_status           text,
    extracted_text_preview      text,
    extracted_character_count   integer,
    extracted_page_count        integer,
    personal_data_risk          text,
    personal_data_warnings      text[]        default '{}',
    created_by                  text          default 'admin',
    created_at                  timestamptz   default now(),
    updated_at                  timestamptz   default now(),
    metadata                    jsonb         default '{}'::jsonb
);

create index if not exists idx_doc_registry_org_id
    on document_registry (organisation_id);

create index if not exists idx_doc_registry_status
    on document_registry (status);

create index if not exists idx_doc_registry_category
    on document_registry (category);

create index if not exists idx_doc_registry_vertical
    on document_registry (vertical);

create index if not exists idx_doc_registry_embedding_status
    on document_registry (embedding_status);

create index if not exists idx_doc_registry_created_at
    on document_registry (created_at desc);

-- Row-level security is enabled but the backend uses the service role key,
-- which bypasses RLS. No additional policies are needed for backend-only access.
-- Add policies here in a future milestone when staff need direct DB read access.
alter table document_registry enable row level security;
