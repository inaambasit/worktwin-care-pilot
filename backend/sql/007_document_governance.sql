-- Milestone 4I: Document governance gate
-- Adds governance fields to document_registry and creates document_audit_events.
-- Run in Supabase SQL Editor after all previous migrations (001–006).
-- Safe to re-run — ADD COLUMN IF NOT EXISTS is idempotent.
-- Do NOT run on a production database without first testing on a staging environment.
-- No existing columns are removed. Backwards compatibility is maintained.

-- ---------------------------------------------------------------------------
-- A) Governance fields on document_registry
-- ---------------------------------------------------------------------------

alter table document_registry
  add column if not exists governance_status                        text        default 'not_reviewed',
  add column if not exists governance_reviewed_by                   text,
  add column if not exists governance_reviewed_at                   timestamptz,
  add column if not exists governance_notes                         text,
  add column if not exists real_document                            boolean     default false,
  add column if not exists dummy_document                           boolean     default true,
  add column if not exists source_owner                             text,
  add column if not exists source_licence_notes                     text,
  add column if not exists contains_qcs_or_third_party_content      boolean     default false,
  add column if not exists requires_human_review_before_embedding   boolean     default true,
  add column if not exists requires_human_review_before_staff_visibility boolean default true,
  add column if not exists approved_for_embedding                   boolean     default false,
  add column if not exists approved_for_staff_visibility            boolean     default false,
  add column if not exists approved_for_source_grounded_answers     boolean     default false;

-- Allowed governance_status values (enforced by backend, not DB constraint):
--   not_reviewed | pilot_approved | approved_for_staff | approved_for_ai | rejected | archived

-- Safe governance indexes
create index if not exists idx_doc_registry_governance_status
  on document_registry (governance_status);

create index if not exists idx_doc_registry_real_document
  on document_registry (real_document);

create index if not exists idx_doc_registry_dummy_document
  on document_registry (dummy_document);

create index if not exists idx_doc_registry_approved_for_embedding
  on document_registry (approved_for_embedding);

create index if not exists idx_doc_registry_approved_for_staff_visibility
  on document_registry (approved_for_staff_visibility);

create index if not exists idx_doc_registry_approved_for_source_grounded
  on document_registry (approved_for_source_grounded_answers);

-- ---------------------------------------------------------------------------
-- B) document_audit_events
--
-- Records every significant governance and pipeline event for audit purposes.
-- Backend service role only — no frontend direct access.
-- document_id is nullable (set null on document deletion via ON DELETE SET NULL).
--
-- Example event_type values:
--   document_uploaded | extraction_saved | chunks_prepared
--   embedding_records_prepared | embeddings_generated | embedding_generation_blocked
--   vector_search_tested | answer_debug_tested
--   governance_status_changed | document_approved_for_embedding
--   document_approved_for_staff_visibility | document_approved_for_source_grounded_answers
--   document_rejected | document_archived
-- ---------------------------------------------------------------------------

create table if not exists document_audit_events (
  id                uuid          primary key default gen_random_uuid(),
  organisation_id   text          not null,
  document_id       uuid          references document_registry(id) on delete set null,
  event_type        text          not null,
  event_summary     text,
  actor             text          default 'admin',
  actor_role        text          default 'admin',
  metadata          jsonb         default '{}'::jsonb,
  created_at        timestamptz   default now()
);

create index if not exists idx_audit_events_org_id
  on document_audit_events (organisation_id);

create index if not exists idx_audit_events_document_id
  on document_audit_events (document_id);

create index if not exists idx_audit_events_event_type
  on document_audit_events (event_type);

create index if not exists idx_audit_events_created_at
  on document_audit_events (created_at desc);

-- RLS: backend service role bypasses RLS automatically.
-- No frontend, staff, or anon access to audit events.
alter table document_audit_events enable row level security;
