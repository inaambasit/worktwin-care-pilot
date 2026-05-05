-- ============================================================
-- Migration file prepared for review/readiness only.
-- Do not run against any shared, production or Thumhara Centre
-- Supabase database until open questions in
-- docs/auth-schema-plan.md Section 15 are resolved.
-- No real staff accounts should be created until DPA/legal/
-- governance sign-off.
--
-- Run only after:
--   - 001_document_registry.sql through 007_document_governance.sql
--   - Supabase Auth is enabled on the project
--   - auth.users table exists
--   - pgcrypto / gen_random_uuid() is confirmed available
--   - Exact organisation_id value for Thumhara Centre is agreed
--   - Open questions in docs/auth-schema-plan.md Section 15 are resolved
-- ============================================================

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table: organisation_memberships
-- ---------------------------------------------------------------------------

create table if not exists organisation_memberships (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  organisation_id  text        not null,
  role             text        not null,
  active           boolean     not null default true,
  display_name     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id),

  constraint organisation_memberships_user_org_unique
    unique (user_id, organisation_id),

  constraint organisation_memberships_role_check
    check (role in (
      'staff',
      'senior_care_staff',
      'registered_manager',
      'organisation_admin',
      'worktwin_dev_admin',
      'read_only_reviewer'
    ))
);

-- ---------------------------------------------------------------------------
-- Trigger: maintain updated_at on every row update
-- ---------------------------------------------------------------------------

create trigger organisation_memberships_set_updated_at
  before update on organisation_memberships
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_org_memberships_user_id
  on organisation_memberships (user_id);

create index if not exists idx_org_memberships_org_id
  on organisation_memberships (organisation_id);

create index if not exists idx_org_memberships_org_id_role
  on organisation_memberships (organisation_id, role);

create index if not exists idx_org_memberships_active
  on organisation_memberships (active);

-- ---------------------------------------------------------------------------
-- RLS: this statement enables row level security with no policies,
-- matching the posture of existing tables. The service role bypasses RLS
-- regardless. Policies are deferred to a later milestone.
-- ---------------------------------------------------------------------------

alter table organisation_memberships enable row level security;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
