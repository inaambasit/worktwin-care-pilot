# WorkTwin Care Pilot - Auth Schema and Membership Plan

**Milestone:** 4S.85C
**Date:** 2026-05-03
**Status:** Documentation only. No SQL migration created or run.
**Depends on:** 4S.85B (auth-dependencies.md), 4S.85A (auth-implementation-checklist.md),
               4S.83 (pilot-security-boundary.md), 4S.84 (admin-proxy-hardening-plan.md)

---

## 1. Purpose

This document turns the identity model agreed in milestone 4S.83
(docs/pilot-security-boundary.md) into a concrete database plan for the
`organisation_memberships` table.

4S.83 defined the minimum viable auth design: who the roles are, what each role
can access, how identity must be derived server-side, and why no client-supplied
value may be trusted for `user_id`, `organisation_id`, or `role`. That design
is complete. What does not yet exist is the exact SQL that implements the binding
between a verified Supabase Auth user and their organisation and role.

Schema design must be agreed before any migration is run because:

- The `organisation_id` value pattern must match what already exists in
  `document_registry` and `document_audit_events`. A mismatch at design time
  means broken joins and misrouted queries in production.
- The role values must match exactly what `get_verified_staff_context()` will
  read in 4S.85F. A value agreed now locks the contract between the database
  and the backend before any code is written.
- Index decisions made after the table is populated are more disruptive to
  reverse than index decisions made now.
- Reviewing a SQL draft costs almost nothing. Running a migration against the
  wrong schema and correcting it under time pressure costs considerably more,
  particularly when real Thumhara Centre staff accounts may already be present.

This document is the agreed plan. The draft SQL in Section 9 is for review only.
It must not be run against any Supabase project as part of this milestone.

---

## 2. Non-Goals

The following are explicitly out of scope for milestone 4S.85C. None of these
actions may be taken, directly or indirectly, as part of this milestone.

- **No SQL migration file.** No file is created under `backend/sql/`. The
  proposed filename `backend/sql/008_organisation_memberships.sql` is reserved
  for the implementation milestone.
- **No database change.** No table, column, index, constraint, or trigger is
  created or modified in the Supabase project.
- **No Supabase dashboard change.** No Auth configuration, no RLS policy, no
  project settings of any kind are changed.
- **No authentication implementation.** No session middleware, JWT validation,
  login pages, session helpers, or auth callback routes.
- **No application code changes.** No frontend files, no backend files, no
  API routes, no middleware, no environment files, no package files.
- **No env or package changes.** No `.env.example` edits, no `package.json`
  or `requirements.txt` changes.
- **No test changes.** Tests for this schema are written in 4S.85F and 4S.85H,
  not here.
- **No real staff accounts.** No Thumhara Centre user accounts are created in
  Supabase Auth or any other system.
- **No real documents.** No Thumhara Centre policy documents are uploaded.

---

## 3. Existing Data Model Assumptions

### What is known from the repository

The following facts are confirmed by reading the existing SQL migrations in
`backend/sql/` and `backend/app/main.py`.

**`organisation_id` is `text` in all existing tables.**
Both `document_registry` (001_document_registry.sql) and
`document_audit_events` (007_document_governance.sql) define
`organisation_id text not null`. The seed data in
`002_seed_demo_document_registry.sql` uses the literal string `'demo-org'`
as the organisation identifier. The backend function `_get_pilot_staff_context()`
in `backend/app/main.py` reads `os.getenv("PILOT_ORGANISATION_ID", "demo-org")`.

**The backend uses the Supabase service role key for all database access.**
No frontend, staff session, or anon key touches the database directly. The
service role bypasses RLS entirely. Application-level `organisation_id` filtering
in backend code is therefore the only tenant boundary currently in place.

**RLS is enabled on existing tables but has no active policies.**
`ALTER TABLE document_registry ENABLE ROW LEVEL SECURITY` is present in
`001_document_registry.sql` with a comment noting that policies will be added
in a future milestone. The same pattern is in `007_document_governance.sql`
for `document_audit_events`. Enabling RLS without policies means the service
role still bypasses it; no staff or anon access is possible.

**`gen_random_uuid()` is used for primary keys across all existing tables.**
All existing migrations use `gen_random_uuid()` as the primary key default.
This function requires pgcrypto. It is already confirmed to work in this
Supabase project.

**`organisation_memberships` does not yet exist.**
No migration for this table exists under `backend/sql/`. The table must be
created from scratch.

**`auth.users` does not yet have any records.**
Supabase Auth has not been enabled on this project. No `auth.users` rows exist.
The `organisation_memberships` table will reference `auth.users(id)` via a
foreign key, which is the standard Supabase Auth integration pattern.

### Assumptions that must be checked before migration

The following are not confirmed from repository files alone. Each must be verified
before `008_organisation_memberships.sql` is run.

**Assumption A:** The Thumhara Centre pilot will use a single `organisation_id`
value that is either `'demo-org'` (consistent with current seed data) or a new
value agreed with the WorkTwin team (for example, `'thumhara-centre'`). The
exact value must be confirmed before the seed step in Section 11.

**Assumption B:** No table named `organisations` exists in the database. The
pilot does not use a separate organisations table; `organisation_id` is a plain
`text` identifier. This must be verified by inspecting the Supabase schema editor
before the migration is run.

**Assumption C:** `pgcrypto` is enabled and `gen_random_uuid()` works. This is
a safe assumption given it is used in all existing migrations, but it should be
verified with a quick test query in the Supabase SQL editor before running the
full migration.

**Assumption D:** No existing column or table name conflicts exist with the
proposed `organisation_memberships` name. This must be confirmed before migration.

---

## 4. Required New Table: organisation_memberships

The `organisation_memberships` table binds a verified Supabase Auth user to an
organisation, assigns a role, and records whether the membership is currently
active. It is the authoritative source for `organisation_id` and `role` in all
pilot-auth-mode backend decisions.

### Proposed column definitions

**`id uuid primary key default gen_random_uuid()`**
Surrogate primary key. Uses the same pattern as all existing tables in this
project. A UUID primary key is preferred over a composite key because it allows
the row to be referenced directly (for example, in audit log entries) without
carrying both `user_id` and `organisation_id` in every foreign key.

**`user_id uuid not null references auth.users(id) on delete cascade`**
The Supabase Auth user identifier. This is the `sub` claim from the verified
JWT. Using `uuid` matches the type that Supabase Auth assigns to `auth.users.id`.
`ON DELETE CASCADE` means that if the Supabase Auth user record is deleted, their
membership rows are also deleted. This prevents orphaned membership rows for
deprovisioned accounts.

**`organisation_id text not null`**
The organisation identifier. Kept as `text` to match the type used in
`document_registry` and `document_audit_events`. Changing this to UUID would
require a coordinated migration across all three tables and introduce a new
`organisations` table that is out of scope for the controlled pilot. The text
pattern matches the existing `'demo-org'` value in the seed data. The Thumhara
pilot value must be confirmed (see Section 7 and Section 15).

**`role text not null`**
The role assigned to this user within this organisation. Constrained to the exact
allowed values defined in Section 5. Not nullable; every membership must have a
role. The role is read from this column by `get_verified_staff_context()` and
passed into every access control decision. It is not derived from JWT claims.

**`active boolean not null default true`**
Whether the membership is currently active. Defaults to `true` on creation.
Setting `active = false` deactivates the membership without deleting the row.
A deactivated membership blocks access immediately at the application layer
(`get_verified_staff_context()` must return a 403 for any inactive membership)
and preserves the audit trail. This is the correct way to deprovision a staff
member who leaves Thumhara Centre.

**`display_name text null`**
An optional human-readable name for the member, set at provisioning time.
Nullable because it is not always available when an account is first created.
Used in admin views and audit log entries. It does not affect access control.
It is not sourced from the JWT; it is set by the organisation admin at membership
creation.

**`created_at timestamptz not null default now()`**
Record creation timestamp. Matches the pattern used across all existing tables.
`timestamptz` stores the value with time zone, which is important for a system
deployed across multiple regions and for audit trail correctness.

**`updated_at timestamptz not null default now()`**
Timestamp of the last update to this row. Used to track when a membership was
deactivated, when a role was changed, or when `display_name` was updated. Must
be maintained accurately. See Section 6 for the trigger vs application-level
decision.

**`created_by uuid null references auth.users(id)`**
The Supabase Auth `user_id` of the admin who created or last confirmed this
membership. Nullable because the first admin account must be seeded without an
existing admin to set this field. Allows the audit trail to record who provisioned
a given membership, which is important for governance. This column references
`auth.users(id)` without `ON DELETE CASCADE` so that deleting the admin who
created a membership does not cascade to the membership itself.

---

## 5. Role Values

The following role values are the exact strings that must be stored in the `role`
column and enforced by a check constraint. They are derived from
docs/pilot-security-boundary.md Section 5 and agreed in
docs/auth-implementation-checklist.md Section 5.

| Role value              | Maps to (4S.83)                             |
|-------------------------|---------------------------------------------|
| `staff`                 | Staff User / Care Worker (Section 5.1)      |
| `senior_care_staff`     | Senior Care Staff / Team Lead (Section 5.2) |
| `registered_manager`    | Registered Manager / Safeguarding Lead (5.3)|
| `organisation_admin`    | Organisation Admin (Section 5.4)            |
| `worktwin_dev_admin`    | WorkTwin Developer / Admin (Section 5.5)    |
| `read_only_reviewer`    | Read-Only Reviewer (Section 5.6)            |

### Mapping notes

`staff` is the default role for a frontline Thumhara Centre care worker. Most
pilot members will hold this role.

`senior_care_staff` currently has the same access as `staff` (see 4S.83 Section
5.2 and the open question in Section 15.2 of this document). The distinct value
is reserved so that differentiated permissions can be added later without a schema
change.

`registered_manager` has read access to the anonymous insights dashboard and the
document registry. It does not have Ask WorkTwin access. Whether it can approve
documents for embedding is an open question (see Section 15.3 of this document).

`organisation_admin` can upload documents, manage memberships, and access admin
settings. It cannot access debug endpoints. In the admin proxy, only
`organisation_admin` and `worktwin_dev_admin` can reach admin routes.

`worktwin_dev_admin` is internal to the WorkTwin team. It must not be assigned
to any Thumhara Centre staff member. It is the only role that can access
`documents/search-vector`, `documents/answer-debug`, and `debug/storage-config`.

`read_only_reviewer` is included in the schema now so that an external auditor
or care inspector can be provisioned without a schema migration later. Whether
this role is needed for the Thumhara pilot is an open question (see Section 15).

### Role check constraint

The allowed role values are enforced by a `CHECK` constraint on the `role`
column. The exact constraint text appears in the draft SQL in Section 10.

---

## 6. Constraints and Indexes

### Unique constraint: `unique(user_id, organisation_id)`

A user may hold only one membership per organisation. This is the correct
constraint for the controlled pilot where every user belongs to exactly one
organisation (see 4S.83 Section 8.1). It also prevents duplicate membership
rows being inserted in an error scenario. In a future multi-organisation model
this constraint would still be correct: a user may join multiple organisations
but must have exactly one membership row per organisation.

### Check constraint: role values

```sql
constraint organisation_memberships_role_check
  check (role in (
    'staff',
    'senior_care_staff',
    'registered_manager',
    'organisation_admin',
    'worktwin_dev_admin',
    'read_only_reviewer'
  ))
```

The database enforces the role allowlist independently of application code. This
means that a backend bug that writes an unrecognised role value is caught at the
database layer before the row is committed, rather than silently propagating into
access control decisions.

### Index: `user_id`

```sql
create index idx_org_memberships_user_id on organisation_memberships (user_id);
```

`get_verified_staff_context()` looks up the membership by `user_id` on every
authenticated request. This is the hot path. An index on `user_id` alone is the
most important index in this table.

### Index: `organisation_id`

```sql
create index idx_org_memberships_org_id on organisation_memberships (organisation_id);
```

Allows efficient listing of all members for an organisation, used in the admin
membership management view and in audit queries.

### Index: `(organisation_id, role)`

```sql
create index idx_org_memberships_org_id_role
  on organisation_memberships (organisation_id, role);
```

Allows efficient queries such as "list all `organisation_admin` members of
Thumhara Centre" without a full table scan. Useful for membership provisioning
checks and for the admin proxy role lookup.

### Index: `active`

```sql
create index idx_org_memberships_active on organisation_memberships (active);
```

`get_verified_staff_context()` filters by `active = true`. With only a handful
of pilot users this index has negligible performance impact now, but the
application-layer logic depends on this filter being reliable, and an explicit
index makes that dependency visible and documentable.

### `updated_at` maintenance: trigger vs application-level

**Decision: use a trigger.**

A Postgres trigger on `BEFORE UPDATE` that sets `updated_at = now()` is the most
reliable approach. If `updated_at` is maintained only in application code, any
direct SQL update (a manual correction, a migration, a seed step) will silently
leave `updated_at` stale. A trigger makes `updated_at` maintenance unconditional.

The trigger function is included in the draft SQL in Section 10.

---

## 7. Organisation ID Decision

### For the Thumhara Centre controlled pilot

The existing `document_registry` and `document_audit_events` tables use
`organisation_id text`. The demo seed data uses `'demo-org'`. The backend
environment variable `PILOT_ORGANISATION_ID` defaults to `'demo-org'`.

`organisation_memberships.organisation_id` must use the same type and the same
value as the records that already exist in `document_registry`. If the pilot will
use `'demo-org'`, the membership rows must also use `'demo-org'`. If the team
decides to use a new identifier such as `'thumhara-centre'`, then the existing
`document_registry` rows seeded with `'demo-org'` must also be updated before
any live pilot query runs, or they will not be matched by the `organisation_id`
filter in the backend.

**The exact `organisation_id` value for the Thumhara pilot is an open question
that must be resolved before the migration is run.** See Section 15.1.

### Later production model

If the product expands beyond a single pilot to multiple care providers, the
correct longer-term design is an `organisations` table with a UUID primary key
and `organisation_id uuid` foreign keys across all tables. That design requires
a coordinated migration across `document_registry`, `document_audit_events`, and
`organisation_memberships`. It is explicitly out of scope for 4S.85C.

The `text` type used now does not prevent this future migration. It does mean
that the migration, when it happens, must update all three tables together.

### Every backend query must filter by organisation_id from the verified session

This is a binding constraint from docs/pilot-security-boundary.md Section 8.4.
The backend derives `organisation_id` from the verified membership row, not from
any client-supplied value. It passes `organisation_id` as an explicit filter into
every database query: vector search, policy listing, document registry, and audit
events. The service role bypasses RLS, so this application-level filter is the
only tenant boundary. It must be enforced without exception.

---

## 8. RLS Decision

### RLS is deferred for this milestone

Row-level security policy design and enforcement are deferred for this milestone.
The draft migration in Section 9 includes `alter table organisation_memberships
enable row level security` with no active policies, following the same posture
used for `document_registry` and `document_audit_events`. Because 4S.85C runs
no SQL, RLS is not currently enabled on this table. If the implementation
milestone runs the draft as written, RLS will be enabled with no policies; the
service role will still bypass it entirely, and no additional protection is in
place until policies are written in a later milestone.

This is confirmed in docs/pilot-security-boundary.md Section 8.5 and
docs/auth-dependencies.md Section 9.

### Application-level checks are mandatory

Because RLS is deferred, the application-level controls in
`get_verified_staff_context()` and in every downstream query are the only
enforcement layer. They must be implemented correctly and completely in 4S.85F.
The absence of RLS must not be treated as an acceptable long-term state; it is a
known gap that increases the blast radius of any backend application bug.

### RLS policies on `organisation_memberships` must be written in a later milestone

When RLS policies are written in a later milestone, `organisation_memberships` must have a
policy that allows each Supabase Auth user to read only their own row (or rows
for their own `user_id`). No staff member should be able to enumerate the
membership table to discover other staff identities or roles.

A future RLS policy might look like:

```sql
-- Illustrative only. Not part of this milestone.
create policy "users see own membership"
  on organisation_memberships
  for select
  using (auth.uid() = user_id);
```

However, because the backend uses the service role key, adding this policy will
not affect backend behaviour until the backend is changed to use a scoped key.
The RLS addition and the key scoping change must be planned together to avoid
creating a false sense of protection.

### RLS must never be the only boundary

Even after RLS is added, it must not be treated as the sole control. The
application-layer `organisation_id` enforcement remains mandatory. Defence in
depth requires both. A bug that disables RLS must not automatically create an
unprotected system; the application-layer checks must catch it.

---

## 9. Migration Draft

The following SQL is a draft for review only. It must not be executed against any
Supabase project as part of milestone 4S.85C. It is provided here so that it can
be reviewed and agreed before the implementation milestone.

When this SQL is confirmed, it will be saved as
`backend/sql/008_organisation_memberships.sql` and run as part of a later
implementation milestone (4S.85F or earlier as appropriate).

```sql
-- ============================================================
-- DRAFT - DO NOT RUN IN 4S.85C
-- Proposed file: backend/sql/008_organisation_memberships.sql
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
-- END OF DRAFT - DO NOT RUN IN 4S.85C
-- ============================================================
```

---

## 10. Seed Data Plan for the Controlled Pilot

### Do not create real user accounts in this milestone

No Supabase Auth user accounts are created as part of 4S.85C. The
`organisation_memberships` table does not exist yet and Supabase Auth has not
been enabled on the project. Attempting to seed membership rows before both of
those prerequisites are in place would fail.

### Seed only after Supabase Auth users exist

The correct seeding order is:

1. Enable Supabase Auth on the project (done in 4S.85D preparation).
2. Run `008_organisation_memberships.sql` (done in the implementation milestone).
3. Create the first admin Supabase Auth user account for the WorkTwin team
   (done via the Supabase Auth dashboard or magic link invite).
4. Insert the first `organisation_memberships` row for that admin user.
5. Once the admin account exists, the admin can provision Thumhara Centre staff
   accounts and membership rows through the admin UI.

### Placeholder seed rows for development and testing only

For local development and integration testing, placeholder seed rows using
non-real email addresses can be inserted after the table is created. These must
use test UUIDs that do not correspond to real Supabase Auth users in the
production project.

Example shape (development only, not part of the migration):

```sql
-- Development test data only. Never run against the Thumhara Centre project.
-- insert into organisation_memberships
--   (user_id, organisation_id, role, active, display_name)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'demo-org', 'staff',              true, 'Test Staff User'),
--   ('00000000-0000-0000-0000-000000000002', 'demo-org', 'organisation_admin', true, 'Test Org Admin'),
--   ('00000000-0000-0000-0000-000000000003', 'demo-org', 'worktwin_dev_admin', true, 'WorkTwin Dev');
```

### `worktwin_dev_admin` must not be assigned to Thumhara Centre staff

A membership row with `role = 'worktwin_dev_admin'` must be assigned only to
WorkTwin team members. No Thumhara Centre staff, senior staff, registered manager,
or organisation admin may hold this role. This is a hard boundary from
docs/pilot-security-boundary.md Section 5.5 and the admin proxy access matrix in
docs/admin-proxy-hardening-plan.md Section 5.

### `registered_manager` and `organisation_admin` require Thumhara confirmation

Which specific people at Thumhara Centre will hold these roles must be agreed
with Thumhara Centre before any real accounts are created. The open questions in
Section 15 cover this. No membership row with these roles may be seeded for real
users until the governance confirmation step in the deployment checklist
(4S.85I) is complete.

---

## 11. Backend Usage Plan

### `get_verified_staff_context()` in `backend/app/main.py` (4S.85F)

On every request to a protected endpoint in pilot-auth mode, the backend must:

1. Extract the session token from the `Authorization` header (forwarded by the
   Next.js server from the httpOnly session cookie) or directly from a
   validated Supabase Auth cookie.
2. Validate the JWT against `SUPABASE_JWT_SECRET` (local validation, no network
   call). Reject with 401 on any failure: invalid signature, expired token,
   malformed token.
3. Extract `user_id` from the `sub` claim of the verified JWT.
4. Query `organisation_memberships` where `user_id = <verified user_id>` and
   `active = true`.
5. If no active row is found, reject with 401 (unauthenticated or deprovisioned).
   If the row exists but `active = false`, reject with 403.
6. Read `organisation_id` and `role` from the returned row.
7. Return a typed context object containing `user_id`, `organisation_id`, and
   `role`. All three values come from server-verified sources only.

The function must raise a 401 exception on any token failure and a 403 exception
on any membership failure. There is no fallback to demo mode or environment
variable identity within this function.

### `organisation_id` passed explicitly into every query

The `organisation_id` derived from the membership lookup must be passed as an
explicit parameter into:

- The vector search call (`/ask` endpoint) -- filters chunks to the organisation's
  documents only.
- The policy listing call (`/policies` endpoint) -- filters registry records to
  the organisation's documents only.
- Every audit event write -- records the correct organisation on the event row.

The backend must never assume that the service role returns only the correct
organisation's records. It must always filter explicitly. This is the application-
level tenant boundary that compensates for the absence of RLS.

### No client-supplied identity

The backend must reject (or ignore, as Pydantic does by default for extra fields)
any `organisation_id`, `user_id`, or `user_role` submitted in the request body.
These fields must be removed from the frontend `AskRequest` payload in 4S.85F
so that no future contributor can accidentally start trusting them. The verified
membership row is the only identity source.

---

## 12. Admin Proxy Usage Plan

The admin proxy at `frontend/app/api/admin/[...path]/route.ts` will be hardened
in 4S.85G. Its membership table usage follows the same pattern as the backend.

### Session and membership lookup

On every request to the proxy:

1. Extract the Supabase Auth session from the httpOnly session cookie.
2. Validate the session server-side. Reject with 401 if invalid or expired.
3. Derive `user_id` from the verified session.
4. Query `organisation_memberships` where `user_id = <verified user_id>` and
   `active = true`. Reject with 403 if no active row exists.
5. Read `organisation_id` and `role` from the membership row.

### Role-based routing

After deriving the role, the proxy checks it against the path/method/role
allowlist defined in docs/admin-proxy-hardening-plan.md Section 5.

| Role                   | Can access admin routes?       | Can access debug paths?        |
|------------------------|-------------------------------|-------------------------------|
| `staff`                | No - 403, no forwarding       | No                            |
| `senior_care_staff`    | No - 403, no forwarding       | No                            |
| `registered_manager`   | No - 403, no forwarding       | No                            |
| `organisation_admin`   | Yes - scoped to org documents | No - 403 on debug paths       |
| `worktwin_dev_admin`   | Yes - all permitted paths     | Yes                           |
| `read_only_reviewer`   | No - 403, no forwarding       | No                            |

Debug paths are `documents/search-vector`, `documents/answer-debug`, and
`debug/storage-config`. These paths return 403 for `organisation_admin` under
all circumstances. They are accessible only to `worktwin_dev_admin`.

`organisation_admin` requests are scoped to their own `organisation_id`. The
proxy verifies that the document or resource being accessed belongs to the admin's
organisation before forwarding.

---

## 13. Migration Safety Checklist

The following checks must be completed before `008_organisation_memberships.sql`
is run against any Supabase database. They apply to the local development
instance first and to the Thumhara Centre project separately.

**Backup and restore consideration.**
The controlled pilot database does not yet contain real staff data, so a point-in-
time backup is not strictly required before the first development run. However,
before the migration is run against any environment that contains real Thumhara
Centre documents or users, a database backup must be confirmed. Supabase provides
point-in-time recovery on paid plans; the backup retention setting should be
checked before any real data is introduced.

**Run on local development Supabase first.**
The migration must be run and verified in a local Supabase instance (using the
Supabase CLI) before it is applied to the shared or production project. This
confirms that the SQL is syntactically correct and that the table, constraints,
indexes, and trigger are created without errors.

**Verify `auth.users` exists.**
Before running the migration, confirm that Supabase Auth has been enabled and
that the `auth.users` table exists in the project. The foreign key on `user_id`
will fail if the `auth` schema or the `users` table is absent.

**Verify `gen_random_uuid()` availability.**
Run `select gen_random_uuid();` in the Supabase SQL editor and confirm it
returns a valid UUID. This is expected to pass given all existing migrations use
it, but it should be confirmed before the new migration is run.

**Verify existing `organisation_id` values.**
Before running the migration, query `document_registry` for the distinct values
of `organisation_id` that exist. Confirm that the `organisation_id` value chosen
for Thumhara Centre membership rows matches the value already used in the
document registry. A mismatch will cause every backend query to return zero
documents for Thumhara Centre staff.

**Verify no real staff or documents are affected.**
The migration only creates a new table. It does not alter any existing table.
It cannot corrupt existing data. However, the act of seeding membership rows
in a later step is irreversible in the sense that a staff member provisioned
with the wrong role will have access they should not have until the row is
corrected. The seed step must be performed carefully.

**Rollback plan for development only.**
If the migration needs to be undone in a local development environment:

```sql
-- Drop trigger and function first, then the table.
-- Development rollback only. Never run against the Thumhara Centre project.
drop trigger if exists organisation_memberships_set_updated_at
  on organisation_memberships;
drop function if exists set_updated_at();
drop table if exists organisation_memberships;
```

This rollback must not be run against any environment that contains real
Thumhara Centre Auth users or membership rows.

---

## 14. Tests Required When Implementation Begins

The following tests are required as part of 4S.85F and 4S.85H. They are listed
here so that the schema design can be validated against the test requirements
before implementation.

**Membership lookup - valid.**
A valid JWT for a user with an active membership row returns the correct
`user_id`, `organisation_id`, and `role`.

**Missing membership returns 401.**
A valid JWT for a user with no row in `organisation_memberships` returns a 401
response. The backend does not fall back to demo identity.

**Inactive membership returns 403.**
A valid JWT for a user whose membership has `active = false` returns a 403
response. The session itself is valid; the deactivated membership is the block.

**Role mapping is correct.**
A user with `role = 'staff'` receives staff-level access. A user with
`role = 'organisation_admin'` receives admin-level access. The role value
is read from the membership row, not from the JWT claims.

**`organisation_id` from membership is used in queries.**
The `organisation_id` used in the vector search, policy listing, and audit event
write matches the value from the membership row, not any client-supplied value.

**Client-supplied identity is ignored.**
A request to `/ask` with `organisation_id`, `user_id`, or `user_role` in the
request body is processed using the session-derived identity only. The payload
fields are discarded.

**Admin proxy role checks.**
A `staff`-role session returns 403 on all admin proxy routes. An
`organisation_admin` session returns 403 on debug paths. A
`worktwin_dev_admin` session returns the allowed response on debug paths.

**Inactive membership blocks admin proxy.**
A session for a user whose membership has `active = false` returns 403 from the
admin proxy. The session itself is valid.

---

## 15. Open Questions Before SQL Migration

The following questions must be resolved before `008_organisation_memberships.sql`
is run against any shared or Thumhara Centre database. They are unresolved because
they require input from Thumhara Centre or the WorkTwin team.

**15.1 Exact `organisation_id` value for Thumhara Centre.**
The demo seed data uses `'demo-org'`. The controlled pilot should use a value that
reflects the actual client, such as `'thumhara-centre'`. If a new value is chosen,
the existing `document_registry` seed rows using `'demo-org'` must be updated to
match before any live staff query is processed. This must be agreed before the
migration is run.

**15.2 Exact first admin user.**
Who holds the first `worktwin_dev_admin` or `organisation_admin` row? The first
membership row cannot reference a `created_by` user because no admin exists yet.
The seeding approach for the first admin account (a manual SQL insert, a Supabase
Auth invite, or a bootstrap script) must be agreed before the seed step.

**15.3 Whether `registered_manager` can review and approve documents.**
The access matrix in docs/pilot-security-boundary.md Section 6 assigns
"Mark document as governance-reviewed" to `registered_manager` (nominated
reviewer only) and `organisation_admin`. The open question from 4S.83 Section 14
item 3 asks whether the Registered Manager should also be able to approve
documents for embedding and staff visibility, and whether dual sign-off is
required. This affects what the backend permits for `registered_manager` in the
governance gate functions and must be confirmed before role gating is implemented.

**15.4 Whether `senior_care_staff` needs separate permissions.**
Currently `senior_care_staff` has the same access as `staff`. If Thumhara Centre
confirms that senior staff need additional capabilities (for example, access to
team-level escalation contacts or policy subsets restricted to team leads), the
role check constraint and access matrix must be updated before any senior staff
accounts are provisioned.

**15.5 Whether personal email addresses are acceptable for magic link authentication.**
Magic link authentication sends a one-time link to the user's registered email.
If Thumhara Centre staff do not have work email addresses, links must go to
personal addresses. This affects how accounts are provisioned and verified, and
whether the `display_name` column is sufficient to associate a personal address
with a care worker's identity at Thumhara Centre. This is an open question from
docs/pilot-security-boundary.md Section 14 item 5.

**15.6 Whether DPA and legal timing blocks any live auth setup.**
No real staff accounts may be created and no real queries processed until a Data
Processing Agreement is in place with Supabase and OpenAI, and until Thumhara
Centre has given legal sign-off. The migration itself is safe to run in a
development environment. Running it in the shared Thumhara Centre Supabase project
and then creating real user accounts before DPA sign-off is the scenario to avoid.
The DPA timing must be confirmed with the WorkTwin team before any real accounts
are provisioned.

---

## 16. Stop Conditions

Work on the SQL migration must stop if any of the following conditions are true.
These conditions must each be individually assessed before `008_organisation_memberships.sql`
is run.

**Unclear `organisation_id` pattern.**
If the exact value to be used in `organisation_memberships.organisation_id` for
the Thumhara Centre pilot is not confirmed, or if it conflicts with the values
already present in `document_registry`, the migration must not proceed. Mismatched
identifiers will silently break every tenant-scoped query.

**Unclear role owner.**
If it is not clear which person at Thumhara Centre or the WorkTwin team will hold
each role, and if the first admin account cannot be identified, the seed step cannot
proceed and the migration serves no purpose.

**Migration would require changes outside the auth boundary.**
If running the membership migration turns out to require changes to
`document_registry`, `document_audit_events`, or any other existing table, those
changes must be assessed as a separate scope. The membership migration must be
self-contained.

**Schema conflicts with existing tables.**
If the name `organisation_memberships` or the trigger function `set_updated_at()`
conflicts with any existing database object, the migration must be adjusted and
re-reviewed before running.

**Any plan to put `role` or `organisation_id` only in JWT claims.**
If any implementation proposal suggests deriving `role` or `organisation_id`
from Supabase Auth JWT user metadata claims instead of from the membership table
lookup, that proposal must be rejected. The membership table is the authoritative
source for both values. Custom JWT claims are unverified from an access control
perspective: they can be stale, spoofed, or not updated when a role changes. The
membership table lookup must be performed on every request.

---

## 17. Decision Summary

**`organisation_memberships` is the MVP table.**
It is the minimum structure needed to bind a verified Supabase Auth user to an
organisation and a role. No other table is required for the initial pilot.

**`role` and `organisation_id` are derived server-side from the membership row.**
On every authenticated request, `get_verified_staff_context()` validates the JWT
and performs a membership lookup. The returned `role` and `organisation_id` are
the values used for all access control and query scoping decisions. No client-
supplied value is used for these fields, ever.

**`organisation_id` remains `text` to match existing tables.**
Changing to UUID would require a coordinated migration across three tables and
is out of scope for the controlled pilot.

**SQL is drafted but not run.**
The draft in Section 9 is for review only. The migration file
`backend/sql/008_organisation_memberships.sql` does not yet exist. It will be
created and run in the implementation milestone after the open questions in
Section 15 are resolved.

**RLS is deferred but not forgotten.**
The draft migration in Section 9 includes enabling row-level security with no
policies, matching the existing table posture, but no SQL runs in this milestone
so RLS is not currently enabled. RLS policy design and enforcement are deferred
to a later milestone. The application-level organisation_id enforcement in
4S.85F is the current tenant boundary and must be implemented correctly and
completely. Application-level organisation_id filtering remains mandatory
regardless, because the service role bypasses RLS entirely.

**No real Thumhara Centre staff or documents until governance and legal sign-off.**
Even after the migration is run and pilot-auth mode is enabled, no real Thumhara
Centre staff accounts may be provisioned and no real Thumhara Centre policy
documents may be uploaded until the checklist in docs/auth-deployment-checklist.md
(4S.85I) is complete, including DPA confirmation and legal sign-off from Thumhara
Centre.
