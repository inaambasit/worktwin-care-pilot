# WorkTwin Care Pilot - Authentication Implementation Checklist

**Milestone:** 4S.85A
**Date:** 2026-05-03
**Status:** Checklist and design only. No authentication code is implemented by this milestone.
**Depends on:** 4S.83 (pilot-security-boundary.md), 4S.84 (admin-proxy-hardening-plan.md)

---

## 1. Purpose

4S.85 is the highest-risk implementation milestone in the WorkTwin Care Pilot roadmap.
It introduces real authentication, session-derived identity, and route protection for the
first time. A mistake in any one of those areas -- a session that can be forged, a route
that falls back to demo mode under an unexpected condition, a client-supplied identity
field that is trusted instead of ignored -- could undermine the product's core privacy
guarantee before Thumhara Centre staff have joined.

This document splits 4S.85 into safe, reviewable sub-milestones. Each sub-milestone ends
with a defined proof point: the codebase must pass all proof commands before the next
sub-milestone begins. This is not a precaution for a low-risk change; it is the minimum
discipline appropriate for a system that will handle care workers' identities and questions
about their workplace.

The design decisions that make implementation possible were agreed in:

- docs/pilot-security-boundary.md (4S.83) -- identity model, roles, access matrix,
  session model, organisation boundary, privacy boundary.
- docs/admin-proxy-hardening-plan.md (4S.84) -- admin proxy controls, path allowlist,
  method allowlist, CSRF design, session validation design, test plan.
- docs/reviews/consolidated-10-10-roadmap.md (4S.78) -- must-fix list, do-not-build
  list, and overall sequence.

This checklist translates those decisions into a safe implementation sequence.

---

## 2. Non-Goals for 4S.85A

The following are explicitly out of scope for this milestone. They may not be started
until later sub-milestones specifically permit them.

- **No authentication code.** No Supabase Auth integration, no session middleware, no
  JWT validation, no magic link handler, no login or logout pages.
- **No new dependencies.** No npm packages, no Python packages, and no changes to
  package.json, package-lock.json, requirements.txt, or any lock file.
- **No environment variable changes.** No new .env variables, no changes to
  .env.example, no deployment environment changes of any kind.
- **No SQL migrations.** No new tables, no schema changes, no migration files in
  backend/sql/.
- **No admin proxy changes.** frontend/app/api/admin/[...path]/route.ts is not to be
  touched. ADMIN_PROXY_ENABLED remains false.
- **No upload changes.** The upload pipeline, upload endpoint, and document governance
  defaults are not to be changed.
- **No real staff or real documents.** No Thumhara Centre staff accounts, no Thumhara
  Centre policy documents, and no live pilot access.
- **ADMIN_PROXY_ENABLED remains false on all public deployments.** `NEXT_PUBLIC_ADMIN_DEMO_ENABLED`
  controls admin UI visibility only; it has since been enabled on the live Vercel demo
  for managed walkthroughs and does not grant API access. ADMIN_PROXY_ENABLED must
  remain false.

---

## 3. Implementation Principles

These principles apply to every sub-milestone from 4S.85B onwards. They are not
guidelines; they are constraints on every implementation decision.

**One proof at a time.**
Each sub-milestone must be implemented, built, and proved before the next begins. Do not
combine sub-milestones. Do not begin 4S.85F while 4S.85E is in progress. Authentication
code that is half-wired is more dangerous than no authentication code.

**Tests are part of each sub-milestone.**
Every implementation sub-milestone that introduces new behaviour must include the tests
needed to prove that behaviour before the sub-milestone is committed. Tests are not
deferred to a later milestone. 4S.85H is the consolidated final regression and Playwright
update milestone; it is not the first point at which tests for 4S.85F and 4S.85G are
written.

**Fail closed.**
Every new route guard, session check, and identity derivation must fail to a safe
default on any unexpected condition: no session, expired session, revoked session,
inactive membership, network failure reading the membership table. The correct failure
mode is a 401 or 403 response with no forwarding and no content. Falling back to demo
mode on authentication failure is not acceptable once pilot-auth mode is enabled.

**Keep the public demo safe.**
The current demo mode -- staff see placeholder responses, policies page shows five sample
documents, no real documents, no real identity -- must remain reachable and safe until
pilot-auth mode is deliberately enabled. No sub-milestone may break the demo before
pilot-auth mode is ready to replace it.

**Keep ADMIN_PROXY_ENABLED=false.**
The admin proxy must not be enabled at any point during the 4S.85 sequence until 4S.85G
is complete and all proxy tests in docs/admin-proxy-hardening-plan.md Section 13 are
passing. Enabling the proxy before session validation and the path allowlist are in place
would expose full backend admin access to any public URL visitor.

**No client-supplied identity.**
At no point in the implementation may user_id, organisation_id, or role be read from the
request body, a URL parameter, a query string, or any client-set header. These values
must come from the verified server-side session or the organisation_memberships table
only. This applies to the Next.js server, the FastAPI backend, and the admin proxy.

**No manager access to private staff questions or notes.**
The Registered Manager and Organisation Admin roles must never gain access to individual
staff question history or Private Notes, whether through an API route, a database query,
or an admin UI. This is a hard product boundary from docs/pilot-security-boundary.md and
docs/reviews/consolidated-10-10-roadmap.md, not a design choice to be revisited.

**No debug tools for organisation admins.**
The documents/search-vector, documents/answer-debug, and debug/storage-config endpoints
must be accessible only to WorkTwin Developer / Admin role users. No implementation
decision may expose these endpoints to an Organisation Admin or any Thumhara Centre user.

**No real documents before legal and governance checks.**
No Thumhara Centre policy document may be uploaded to the production system until the
following are confirmed: DPA in place with Supabase and OpenAI, named governance
reviewer confirmed at Thumhara Centre, document review process agreed. These are
prerequisites from docs/pilot-security-boundary.md Section 14 and
docs/reviews/consolidated-10-10-roadmap.md Section 4, item 11.

---

## 4. Proposed Sub-Milestones

### 4S.85B -- Auth dependency and environment documentation

**Goal:** Produce an explicit written record of every dependency that will be added and
every environment variable that will be required before any code is written. Codex
reviews this list before any package is installed or any .env.example line is changed.

**Files likely to change:**
- docs/auth-dependencies.md (new file, documentation only)

**Files that must not change:**
- package.json, package-lock.json, frontend/package.json
- backend/requirements.txt
- .env.example
- Any frontend or backend application code
- backend/sql/ (any migration file)

**Proof commands:**
- `git diff --stat` must show only docs/auth-dependencies.md as changed
- `git diff HEAD -- package.json frontend/package.json backend/requirements.txt .env.example`
  must produce no output

**Build and test commands required:**
- `cd frontend && npm run build` must pass with no new errors or warnings
- `cd frontend && npx playwright test` must pass with no new failures

**Pass criteria:**
The new docs/auth-dependencies.md file lists: the exact @supabase/supabase-js version to
be added, the exact @supabase/ssr or @supabase/auth-helpers-nextjs version to be added,
the exact Python supabase-auth or equivalent version to be confirmed, every new
environment variable name (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
SUPABASE_JWT_SECRET, AUTH_COOKIE_NAME -- or whichever names are decided), and a note on
whether any existing env vars overlap. No dependency is installed. No env file is changed.

**Rollback/stop condition:**
If the dependency list reveals that Supabase Auth requires a version of @supabase/ssr or
supabase-py that conflicts with any currently pinned package, stop and resolve the
conflict on paper before proceeding to 4S.85C.

---

### 4S.85C -- Supabase schema and membership design and migration plan

**Goal:** Produce the exact SQL for the organisation_memberships table and any supporting
objects, reviewed and agreed before any migration is run against any database.

**Files likely to change:**
- docs/auth-schema-plan.md (new file, documentation only)

**Files that must not change:**
- backend/sql/ (any existing or new .sql file)
- The Supabase project database (no migration is to be run in this sub-milestone)
- Any frontend or backend application code

**Proof commands:**
- `git diff --stat` must show only docs/auth-schema-plan.md as changed
- `git diff HEAD -- backend/sql/` must produce no output

**Build and test commands required:**
- `cd frontend && npm run build` must pass with no new errors

**Pass criteria:**
docs/auth-schema-plan.md contains:
- The exact CREATE TABLE statement for organisation_memberships, including user_id
  (references Supabase Auth users.id), organisation_id (UUID), role (text, constrained to
  the role values defined in docs/pilot-security-boundary.md Section 5), active (boolean,
  default true), created_at (timestamptz, default now()).
- A note confirming that no RLS policy is added to this table at this stage (the backend
  uses the service role key which bypasses RLS; RLS is a later milestone as noted in
  docs/pilot-security-boundary.md Section 8.5).
- The migration file name to be used (e.g. backend/sql/008_organisation_memberships.sql).
- A note on the seeding approach for the Thumhara Centre organisation record and the
  first admin user account.
- Open questions from docs/pilot-security-boundary.md Section 14 that must be resolved
  before the migration can be run: exact pilot user list, whether Thumhara Centre staff
  have work email addresses, who the named governance reviewer is.

**Rollback/stop condition:**
If any of the open questions in docs/pilot-security-boundary.md Section 14 cannot be
resolved, stop at this sub-milestone. Do not run migrations against an unresolved schema.

---

### 4S.85D -- Staff login, logout route and session helper

**Goal:** Add magic link login and logout pages and a server-side session helper that
extracts user_id from a verified Supabase Auth cookie. No route is protected yet. The
demo continues to work unchanged.

**Files likely to change:**
- frontend/app/login/page.tsx (new -- magic link request form)
- frontend/app/login/sent/page.tsx (new -- confirmation page)
- frontend/app/auth/callback/route.ts (new -- Supabase Auth callback handler)
- frontend/app/logout/route.ts (new -- logout handler that invalidates the session)
- frontend/lib/session.ts (new -- server-side helper: getVerifiedSession(), returning
  user_id or null; no fallback to env vars in this helper)
- frontend/lib/supabase-server.ts (new -- createServerSupabaseClient() helper)

**Files that must not change:**
- frontend/app/api/admin/[...path]/route.ts
- frontend/app/ask/page.tsx
- frontend/app/policies/page.tsx
- frontend/middleware.ts (must not be added or modified in this sub-milestone)
- backend/app/main.py
- .env.example (no new entries yet; dependencies are being installed, not configured)

**Proof commands:**
- `cd frontend && npm run build` must pass with no TypeScript errors
- Visiting /login in the demo deployment must show the magic link request form
- Visiting /ask without a session must still show the demo placeholder experience
  (no redirect, no 401 -- route protection is not added until 4S.85E)
- `git diff HEAD -- frontend/app/ask/page.tsx frontend/app/policies/page.tsx
  frontend/app/api/admin/[...path]/route.ts` must produce no output

**Build and test commands required:**
- `cd frontend && npm run build`
- `cd frontend && npx playwright test` (existing smoke tests must still pass)

**Pass criteria:**
- getVerifiedSession() in frontend/lib/session.ts returns the Supabase Auth user object
  (including user.id) from the server-side cookie, or null if no valid session exists.
  It does not fall back to PILOT_USER_ID or any environment variable.
- The login page sends a magic link to the submitted email using Supabase Auth.
- The auth callback route exchanges the code for a session and sets an httpOnly session
  cookie via Supabase SSR helpers.
- The logout route invalidates the session server-side and clears the session cookie.
- No existing page is changed. No route redirects unauthenticated users yet.

**Rollback/stop condition:**
If the Supabase Auth callback cannot set an httpOnly session cookie in the Next.js
deployment environment (e.g. due to a cookie domain or SameSite configuration issue),
stop and resolve the session model before adding any route protection. A session that
cannot be reliably set cannot be relied on for access control.

---

### 4S.85E -- Protect staff routes in pilot-auth mode

**Goal:** Add Next.js middleware (or route-level guards) that block /ask and /policies
for unauthenticated sessions when pilot-auth mode is enabled. The demo must remain
accessible when pilot-auth mode is off.

**Files likely to change:**
- frontend/middleware.ts (new -- redirect unauthenticated /ask and /policies to /login
  when NEXT_PUBLIC_PILOT_AUTH_MODE=true)
- .env.example (document NEXT_PUBLIC_PILOT_AUTH_MODE=false as a new entry -- this is the
  feature flag that separates demo mode from pilot-auth mode; it is false by default)
- frontend/app/ask/page.tsx (minimal: add a server-side session check at the top of the
  page component that returns a 401 or redirect when pilot-auth mode is active)
- frontend/app/policies/page.tsx (same as above)

**Files that must not change:**
- frontend/app/api/admin/[...path]/route.ts
- backend/app/main.py
- backend/requirements.txt
- Any SQL migration file

**Proof commands:**
- With NEXT_PUBLIC_PILOT_AUTH_MODE=false (default): visiting /ask and /policies without
  a session must still show demo content. No redirect.
- With NEXT_PUBLIC_PILOT_AUTH_MODE=true: visiting /ask without a session must redirect
  to /login with a 302. Visiting /policies without a session must redirect to /login.
- With NEXT_PUBLIC_PILOT_AUTH_MODE=true: visiting /ask with a valid session must show the
  authenticated page (not a redirect).
- `cd frontend && npm run build` must pass with no TypeScript errors.
- `cd frontend && npx playwright test` with NEXT_PUBLIC_PILOT_AUTH_MODE=false must pass.

**Build and test commands required:**
- `cd frontend && npm run build`
- `cd frontend && npx playwright test` (smoke tests must pass with pilot-auth mode off)

**Pass criteria:**
- NEXT_PUBLIC_PILOT_AUTH_MODE=false is the documented default in .env.example.
  The demo is unaffected.
- NEXT_PUBLIC_PILOT_AUTH_MODE=true activates route protection without changing any
  application logic. The middleware does not contain any demo fallback.
- The middleware uses getVerifiedSession() from frontend/lib/session.ts introduced in
  4S.85D. It does not contain any identity logic itself.
- /login, the auth callback, and the landing page (/) are excluded from the middleware
  guard to avoid redirect loops.

**Rollback/stop condition:**
If the Next.js middleware cannot reliably read the Supabase Auth session cookie
(e.g. due to edge runtime limitations on cookie access), stop and investigate the
session model before enabling pilot-auth mode on any environment. Do not work around
this by accepting a session token from a query parameter or request header.

---

### 4S.85F -- Backend verified staff context

**Goal:** Replace the backend's reliance on PILOT_USER_ID and PILOT_USER_ROLE
environment variables with session-derived identity for the real pilot path. Remove
stale identity fields from the frontend Ask payload. The demo path via environment
variables may remain only behind an explicit demo-mode branch.

**Files likely to change:**
- backend/app/main.py (add a get_verified_staff_context() function that reads the
  Supabase Auth JWT from the Authorization header or session cookie forwarded by the
  Next.js server, validates it against the Supabase JWT secret, derives user_id, then
  looks up organisation_id and role from organisation_memberships; keep
  _get_pilot_staff_context only if PILOT_AUTH_MODE=false in the environment)
- frontend/lib/api.ts (remove organisation_id, user_id, and user_role from the
  AskRequest payload; the frontend must not send these fields)
- frontend/lib/types.ts (update AskRequest type to match; add missing backend risk
  categories: policy, compliance, vertical_sensitive -- identified in the Codex review
  as a stale contract)
- backend/tests/__init__.py (new)
- backend/tests/test_staff_context.py (new -- tests for get_verified_staff_context:
  valid JWT, expired JWT, malformed JWT, missing membership, inactive membership, role
  derivation, missing organisation_id filter; must be written and passing before 4S.85F
  is committed)
- backend/tests/test_organisation_scoping.py (new -- tests for /ask and /policies: that
  organisation_id from session is used in every query, that a session for one organisation
  cannot retrieve documents from another; must be written and passing before 4S.85F is
  committed)

**Files that must not change:**
- frontend/app/api/admin/[...path]/route.ts
- The governance gate functions (_can_embed_document, _can_use_document_for_answer,
  _can_show_document_to_staff) -- these must not be touched
- backend/sql/ (no new migrations in this sub-milestone)

**Proof commands:**
- POST /ask with a valid Supabase Auth session cookie (pilot-auth mode on): backend must
  derive user_id, organisation_id, and role from the session, not from the request body.
- POST /ask without a session (pilot-auth mode on): backend must return 401.
- POST /ask with organisation_id, user_id, user_role in the request body: backend must
  ignore these fields and derive identity from the session only.
- GET /policies with a valid session: must return only documents scoped to the
  organisation_id from the session.
- `cd frontend && npm run build` must pass.
- `cd frontend && npx playwright test` with NEXT_PUBLIC_PILOT_AUTH_MODE=false must pass.

**Build and test commands required:**
- `cd frontend && npm run build`
- `cd frontend && npx playwright test`
- `cd backend && python -m pytest` (the backend verified-context tests for
  get_verified_staff_context and organisation scoping are written and must pass as part
  of 4S.85F; they are not deferred to 4S.85H)

**Pass criteria:**
- get_verified_staff_context() returns a typed object containing user_id,
  organisation_id, and role, all derived from the verified JWT and the memberships table.
- The function raises a 401 exception on any token validation failure, any expired token,
  any missing or inactive membership record.
- organisation_id is passed explicitly to every database query in /ask and /policies
  (vector search, policy listing, audit event). It is not assumed from a query parameter
  or a global variable.
- frontend/lib/api.ts no longer sends identity fields in the AskRequest payload.
- _get_pilot_staff_context remains in the codebase but is called only when the
  environment variable PILOT_AUTH_MODE is not set to "true". It is not the production
  path.

**Rollback/stop condition:**
If the Supabase JWT secret is not available in the backend deployment environment
(required to validate Auth tokens server-side without an additional network call), stop
and confirm the secret is correctly set before validating JWTs in application code. Do
not use the anon key for JWT validation.

---

### 4S.85G -- Admin proxy session guard and allowlist

**Partial implementation status:** Several fail-closed hardening controls have been
implemented in 4S.85G slices: typed path allowlist, method guard (405), unauthenticated
guard (401), global role and membership guard (403), route-specific role allowlist,
CSRF fail-closed guard for POST/PATCH, upload content-type guard (415), upload size
guard (413), safe structured audit logging, and `Cache-Control: no-store`. Outstanding:
real Supabase Auth session validation (currently stub/test-mode based), real
`organisation_memberships` lookup, and production CSRF token and same-site
implementation. ADMIN_PROXY_ENABLED must remain false until these are complete.

**Goal:** Complete all remaining controls from docs/admin-proxy-hardening-plan.md
before ADMIN_PROXY_ENABLED can be set to true on any deployment. This sub-milestone
is the most directly security-critical change in the 4S.85 sequence.

**Files likely to change:**
- frontend/app/api/admin/[...path]/route.ts (add: session extraction from httpOnly
  cookie, role lookup from organisation_memberships, typed path/method/role allowlist,
  deny-by-default routing, CSRF/same-site validation for POST and PATCH, upload content-
  type enforcement, request size limits, response minimisation for Org Admin, structured
  audit logging; fix UTF-8 mojibake in existing comments as noted in
  docs/admin-proxy-hardening-plan.md Section 14)
- backend/tests/test_proxy.py (new -- covers all test cases from
  docs/admin-proxy-hardening-plan.md Section 13; must be written and passing before
  ADMIN_PROXY_ENABLED is considered safe to set to true)

**Files that must not change:**
- backend/app/main.py (no backend route changes in this sub-milestone)
- ADMIN_PROXY_ENABLED (remains false in all deployment environments)
- .env.example (no changes to the ADMIN_PROXY_ENABLED entry)
- Any SQL migration file

**Proof commands (all must be run with ADMIN_PROXY_ENABLED=false during development,
 then verified against the hardened route logic with ADMIN_PROXY_ENABLED=true in a
 local developer-controlled environment only):**
- All test cases in docs/admin-proxy-hardening-plan.md Section 13 must pass.
- Proxy disabled: all /api/admin/* requests return 403.
- Unauthenticated request: 401, no forwarding.
- Authenticated staff-role user: 403, no forwarding.
- Authenticated Registered Manager: 403, no forwarding.
- Inactive membership (active=false): 403, no forwarding.
- Org Admin on GET documents: 200, forwarded, results scoped to their organisation_id.
- Org Admin on POST documents/search-vector: 403, not forwarded.
- Org Admin on GET debug/storage-config: 403, not forwarded.
- WorkTwin Dev/Admin on POST documents/search-vector: 200, forwarded.
- Unknown path: 404, no forwarding.
- DELETE on an allowed path: 405, no forwarding.
- POST documents/upload with application/json content type: 415, no forwarding.
- POST documents/upload with body over size limit: 413, no forwarding.
- PATCH request without CSRF/same-site control: 403, no forwarding.
- Session token expired: 401, no forwarding.
- `cd frontend && npm run build` must pass.

**Build and test commands required:**
- `cd frontend && npm run build`
- `cd frontend && npx playwright test` (existing smoke tests must still pass with
  ADMIN_PROXY_ENABLED=false)
- All proxy-specific tests (allowlist, session guard, CSRF) must be written and passing
  as part of 4S.85G; they are not deferred to 4S.85H

**Pass criteria:**
- The proxy route contains a typed allowlist constant (not a runtime config) that matches
  the table in docs/admin-proxy-hardening-plan.md Section 5.
- No path outside the allowlist can be forwarded under any condition.
- No state-changing method (POST, PATCH) can be forwarded without passing CSRF/same-site
  validation.
- Org Admin role cannot reach search-vector, answer-debug, or debug/storage-config under
  any condition.
- Every proxied request produces a structured audit log entry matching
  docs/admin-proxy-hardening-plan.md Section 11 (request_id, route_key, method, status,
  latency_ms, actor_role, organisation_id -- no raw query text, no document content).
- The UTF-8 mojibake in the existing route comments is corrected.

**Rollback/stop condition:**
If any test case from docs/admin-proxy-hardening-plan.md Section 13 cannot be made to
pass, do not set ADMIN_PROXY_ENABLED=true under any circumstances. The proxy must be
verified against every test case in a controlled environment before any real Thumhara
Centre documents or admin sessions are introduced.

---

### 4S.85H -- Auth and security tests and Playwright updates

**Goal:** Consolidate, expand, and re-run the full authentication and security regression
test suite as the final gate before controlled deployment. The backend verified-context
tests are written as part of 4S.85F; the admin proxy tests are written as part of 4S.85G.
4S.85H adds new Playwright auth boundary tests, expands edge-case coverage, updates the
smoke test suite for the post-auth codebase, and confirms the complete combined suite
passes before 4S.85I begins. This is not the first point at which tests for 4S.85F or
4S.85G are written.

**Files likely to change:**
- frontend/tests/auth.spec.ts (new -- Playwright tests: unauthenticated /ask redirects
  to /login when pilot-auth mode is on; authenticated session can access /ask;
  /login shows magic link form; logout invalidates session)
- frontend/tests/smoke.spec.ts (update: verify demo mode still works with
  NEXT_PUBLIC_PILOT_AUTH_MODE=false after all auth changes)
- backend/tests/test_staff_context.py (expand edge cases beyond those written in 4S.85F)
- backend/tests/test_organisation_scoping.py (expand edge cases beyond those written in
  4S.85F)
- backend/tests/test_proxy.py (expand edge cases beyond those written in 4S.85G)

**Files that must not change:**
- The governance gate functions in backend/app/main.py (_can_embed_document,
  _can_use_document_for_answer, _can_show_document_to_staff) -- these are tested by
  the later 4S.86 milestone; touching them here creates a scope conflict
- frontend/app/api/admin/[...path]/route.ts (proxy tests verify it but must not change it)

**Proof commands:**
- `cd backend && python -m pytest -v` must pass with all new tests.
- `cd frontend && npx playwright test` must pass with all new and existing tests.
- `cd frontend && npm run build` must pass.

**Build and test commands required:**
- `cd backend && python -m pytest -v`
- `cd frontend && npx playwright test`
- `cd frontend && npm run build`

**Pass criteria:**
Backend tests cover:
- get_verified_staff_context: valid JWT, expired JWT, malformed JWT, missing
  membership record, inactive membership (active=false), missing organisation_id,
  wrong role format.
- /ask organisation scoping: the organisation_id from the verified session is passed
  to the vector search and policy listing queries; a query using one org's session
  cannot retrieve another org's document chunks.
- /policies organisation scoping: same as above.

Proxy tests cover:
- All 15 test cases in docs/admin-proxy-hardening-plan.md Section 13.
- No cross-organisation forwarding.

Playwright tests cover:
- Demo mode (NEXT_PUBLIC_PILOT_AUTH_MODE=false): /ask and /policies accessible without
  login.
- Pilot-auth mode (NEXT_PUBLIC_PILOT_AUTH_MODE=true): /ask and /policies redirect
  unauthenticated users to /login.
- Pilot-auth mode: authenticated session permits access to /ask.
- Login page submits magic link request and shows confirmation.
- Logout clears session and returns user to /login.

**Rollback/stop condition:**
If any test cannot be written because the implementation from 4S.85D-G does not expose
a testable interface (e.g. no way to inject a mock JWT without a live Supabase Auth
instance), stop and revise the implementation to support testing before proceeding to
4S.85I. Untestable auth code is not acceptable in a system handling care worker
identities.

---

### 4S.85I -- Controlled deployment checklist

**Goal:** Produce a step-by-step checklist for enabling pilot-auth mode on a controlled
non-production environment. This is a documentation milestone. No code changes. No
production deployment.

**Files likely to change:**
- docs/auth-deployment-checklist.md (new -- ordered checklist for controlled pilot-auth
  deployment, covering: Supabase Auth configuration, magic link email domain allowlist,
  running the membership migration, seeding the Thumhara Centre organisation record,
  creating the first admin account, setting NEXT_PUBLIC_PILOT_AUTH_MODE=true in a
  non-production environment, smoke testing login/logout, smoke testing /ask and
  /policies with and without session, confirming ADMIN_PROXY_ENABLED remains false,
  confirming DPA and legal sign-off are in place before any real documents or real
  staff accounts are added)

**Files that must not change:**
- Any application code
- Any environment variable on the production or public demo deployment
- ADMIN_PROXY_ENABLED (remains false)
- NEXT_PUBLIC_PILOT_AUTH_MODE (remains false on public demo)

**Proof commands:**
- `git diff --stat` must show only docs/auth-deployment-checklist.md as changed.
- `cd frontend && npm run build` must pass.
- `cd frontend && npx playwright test` must pass.

**Build and test commands required:**
- `cd frontend && npm run build`
- `cd frontend && npx playwright test`

**Pass criteria:**
docs/auth-deployment-checklist.md contains an ordered list of steps that:
- Can be followed by any WorkTwin team member without ambiguity.
- Includes a step confirming the open questions from docs/pilot-security-boundary.md
  Section 14 are resolved before staff accounts are created.
- Includes a step confirming DPA and legal sign-off are in place before any real
  Thumhara Centre policy document is uploaded.
- Includes a step confirming all tests from 4S.85H are passing on the non-production
  deployment.
- Explicitly states that ADMIN_PROXY_ENABLED must remain false until after pilot-auth
  mode is validated in the controlled environment.
- References the prohibited document types from docs/pilot-security-boundary.md
  Section 9.4.

**Rollback/stop condition:**
If any unresolved open question from docs/pilot-security-boundary.md Section 14 cannot
be resolved, the checklist must note this as a blocker. No real Thumhara Centre staff
or documents may be added until the blocker is cleared.

---

## 5. Supabase Auth Decisions

These decisions are agreed based on docs/pilot-security-boundary.md Section 3 and 7.
They are binding on every sub-milestone from 4S.85D onwards.

**Magic link first.**
Email magic link (passwordless) via Supabase Auth is the first and only authentication
method for the Thumhara Centre pilot. No passwords. No SMS OTP. No OAuth social login.
Care workers are not expected to manage separate work passwords for a new system.

**user_id from Supabase Auth.**
The user_id used throughout the system is the Supabase Auth users.id (UUID). It is
derived from the JWT sub claim of the verified session. It is never supplied by the
client.

**organisation_memberships table.**
A separate organisation_memberships table (designed in 4S.85C) binds user_id to
organisation_id, role, and active status. The role and organisation_id used in every
backend decision are read from this table after session validation, not from the JWT
claims or the request body.

**Role derived server-side.**
The role value (staff, senior_care_staff, registered_manager, organisation_admin,
worktwin_dev_admin) is read from the verified membership record on the server. It is
not accepted from any client source. It is not embedded in the Supabase Auth JWT
metadata for trust purposes; the membership table lookup is the authoritative source.

**organisation_id derived server-side.**
The organisation_id is read from the verified membership record on the server. The same
rule applies: no client source is trusted, no request body field is accepted, no query
parameter is accepted.

**Session via httpOnly cookie.**
The Supabase Auth session token is stored in an httpOnly, SameSite=Lax (minimum) session
cookie set by the Next.js server via the Supabase SSR helpers. It is never exposed to
browser JavaScript. The ADMIN_TOKEN pattern for the proxy is the existing precedent for
this approach.

**Microsoft Entra ID/SSO is later-only.**
If Thumhara Centre or a future pilot client requires Microsoft 365 single sign-on, this
can be added via the Supabase Auth OAuth provider support without replacing the identity
model. It is not required for the initial Thumhara pilot unless explicitly requested and
confirmed via the open questions in docs/pilot-security-boundary.md Section 14.

---

## 6. Staff Route Protection Decision

**The public demo must remain accessible in demo mode.**
With NEXT_PUBLIC_PILOT_AUTH_MODE=false (the default), /ask and /policies must continue
to show placeholder content to unauthenticated visitors. The demo is used in managed
walkthroughs and must not break.

**Real pilot mode must block unauthenticated /ask and /policies.**
With NEXT_PUBLIC_PILOT_AUTH_MODE=true, any request to /ask or /policies without a valid
session must receive a 302 redirect to /login (for browser requests) or a 401 response
(for API requests). There is no fallback to placeholder content in pilot-auth mode.

**Do not break the demo before pilot-auth mode is ready.**
No sub-milestone may change the default behaviour of /ask or /policies for
unauthenticated visitors until NEXT_PUBLIC_PILOT_AUTH_MODE=true is explicitly set and
the auth flow from 4S.85D and 4S.85E is fully working and tested.

**Feature flag approach.**
NEXT_PUBLIC_PILOT_AUTH_MODE is a plain boolean environment variable. It is documented in
.env.example as false. It is not a runtime toggle or a database flag. Changing it
requires a redeployment. This is intentional: enabling pilot-auth mode on a public
deployment is a deliberate, auditable infrastructure change, not a UI setting.

The flag is added to .env.example in 4S.85E. It is not added earlier.

---

## 7. Backend Identity Decision

**Remove reliance on client-supplied user_id, user_role, and organisation_id.**
The frontend lib/api.ts currently sends these fields in the AskRequest payload. The
backend currently ignores them (Pydantic silently discards extra fields). They must be
removed from the frontend payload in 4S.85F so that no future code can accidentally
start reading them. The Codex review (4S.76) identifies this as a stale contract that
can mislead contributors.

**_get_pilot_staff_context may remain only for demo mode.**
The existing function that derives pilot context from PILOT_USER_ID and PILOT_USER_ROLE
environment variables may remain in backend/app/main.py behind an explicit check for
PILOT_AUTH_MODE != "true". It must not be on the code path for any request in pilot-auth
mode. This keeps the demo working without creating a backdoor in the pilot.

**Real pilot mode must derive context from the verified session.**
The new get_verified_staff_context() function introduced in 4S.85F is the only identity
source for pilot-auth mode. It validates the JWT, looks up the membership record, and
returns user_id, organisation_id, and role. Any failure raises a 401 exception.

**Backend must enforce organisation_id for /ask and /policies.**
Every database query in these endpoints -- vector search, policy listing, audit event --
must receive the organisation_id derived from the session as an explicit filter. The
backend must not assume that the Supabase service role will scope results correctly by
default. As the Codex review and the security boundary document both note, the service
role bypasses RLS, so application-level enforcement is the only control.

---

## 8. Admin Proxy Decision

**Implementation must follow docs/admin-proxy-hardening-plan.md.**
Every control in that document -- session validation, role lookup, typed path/method/role
allowlist, deny-by-default routing, CSRF/same-site validation, upload content-type
enforcement, size limits, response minimisation, and audit logging -- must be implemented
in full before ADMIN_PROXY_ENABLED is set to true on any deployment.

**No enabling ADMIN_PROXY_ENABLED until all controls exist.**
ADMIN_PROXY_ENABLED remains false on all public deployments. Fail-closed hardening
controls have been partially implemented in 4S.85G slices, but real Supabase Auth
session validation, real organisation_memberships lookup, and production CSRF are not
yet complete. ADMIN_PROXY_ENABLED must not be set to true until 4S.85G is fully
complete, all proxy tests from docs/admin-proxy-hardening-plan.md Section 13 are
passing, and the implementation has been verified in a developer-controlled
environment. This sequence is not optional.

The four conditions that must all be true before ADMIN_PROXY_ENABLED=true is set on any
environment:
1. Admin session extraction and validation are implemented (Step 1 of
   docs/admin-proxy-hardening-plan.md Section 12).
2. Role and membership lookup from organisation_memberships is implemented (Step 2).
3. The typed path/method/role allowlist is implemented and tested (Steps 3, 4, 5).
4. CSRF and same-site checks are implemented for POST and PATCH (Step 6).

Steps 7-10 (upload guards, response minimisation, audit logging, tests) must also be
complete before enabling on any environment where real Thumhara Centre data exists.

---

## 9. Testing Strategy

The following tests are required across the 4S.85 sub-milestones. Each implementation
sub-milestone includes the tests needed to prove its own behaviour. 4S.85H consolidates
and re-runs the full suite; its Playwright additions and any expanded coverage must be
passing before 4S.85I begins.

**Frontend build.**
`cd frontend && npm run build` must pass with no new TypeScript errors or warnings after
every sub-milestone.

**Playwright smoke tests.**
The existing smoke tests in frontend/tests/smoke.spec.ts must continue to pass with
NEXT_PUBLIC_PILOT_AUTH_MODE=false after every sub-milestone. They represent the demo
mode guarantee.

**New auth boundary tests (Playwright).**
Written in 4S.85H. Cover: unauthenticated redirect to /login in pilot-auth mode,
authenticated access to /ask and /policies, login flow (magic link request and
confirmation), logout (session cleared, next request redirects to /login).

**Backend tests for verified context.**
Written as part of 4S.85F. Cover: get_verified_staff_context with valid JWT, expired JWT,
malformed JWT, missing membership, inactive membership. Organisation_id enforcement in
/ask and /policies queries. 4S.85H re-runs these and may expand edge-case coverage as
part of the full regression pass.

**Proxy tests.**
Written as part of 4S.85G. Cover all 15 test cases from docs/admin-proxy-hardening-plan.md
Section 13 exactly: disabled proxy, unauthenticated, staff role, registered manager
role, inactive membership, Org Admin on allowed path, Org Admin on debug path, WorkTwin
Dev/Admin on debug path, unknown path, disallowed method, wrong content type on upload,
body over size limit, PATCH without CSRF, cross-organisation access attempt, expired
session. 4S.85H re-runs these and may expand edge-case coverage as part of the full
regression pass.

**No cross-organisation access tests.**
The pilot handles only one organisation (Thumhara Centre). Cross-organisation access
tests must still be written (a session for org A must not retrieve org B's documents)
because the organisation scoping logic must be correct from the start. The fact that
only one organisation exists in the database does not make these tests unnecessary.

---

## 10. Codex Review Gates

Codex is used as a strict technical reviewer at specific points in the 4S.85 sequence.
The following gates define when a Codex review is required.

**After 4S.85A (this checklist).**
Review the checklist for completeness, correctness of the sub-milestone sequence, and
any missing controls or test cases. This is the review happening now.

**Before first auth code (before 4S.85D begins).**
Review the planned session model, dependency list (4S.85B), and schema plan (4S.85C)
before any authentication code is written. Codex should verify that the session model
follows the design in docs/pilot-security-boundary.md and that no client-supplied
identity is trusted at any point.

**Before admin proxy implementation (before 4S.85G begins).**
Review the hardened proxy design against docs/admin-proxy-hardening-plan.md. Codex
should verify that the allowlist covers all paths in Section 5 of that document, that
the CSRF design is sound, and that the deny-by-default rule is correctly applied.

**Before enabling any auth or admin environment flag.**
Before NEXT_PUBLIC_PILOT_AUTH_MODE=true is set on any environment, or before
ADMIN_PROXY_ENABLED=true is considered for any environment, commission a Codex review
of the implemented code. Codex should verify the session validation logic, the
organisation_id enforcement, and the proxy test coverage against the test plan.

**Before any real document upload.**
Before any Thumhara Centre policy document is uploaded to any environment (test or
production), commission a Codex review of the complete auth and governance boundary as
implemented. This is the final gate before any real data enters the system.

---

## 11. Final Definition of Done for 4S.85

4S.85 is complete only when all of the following are true. No individual sub-milestone
completion is sufficient.

- **Staff identity is verified.** Every request to /ask and /policies in pilot-auth
  mode is authenticated via a valid Supabase Auth session. Unauthenticated requests
  receive a 401 or redirect to /login. No fallback to demo identity.

- **user_id, role, and organisation_id are derived server-side.** No request body
  field, query parameter, or client-set header is used for identity in pilot-auth mode.
  The frontend does not send identity fields in the AskRequest payload.

- **/ask and /policies are protected in pilot-auth mode.** With
  NEXT_PUBLIC_PILOT_AUTH_MODE=true, both routes enforce session validation.
  With NEXT_PUBLIC_PILOT_AUTH_MODE=false, both routes continue to show demo content.

- **Admin proxy is deny-by-default and session-guarded.** The proxy at
  frontend/app/api/admin/[...path]/route.ts validates a server-side admin session,
  checks role against the typed allowlist, enforces the path/method/role allowlist,
  enforces CSRF/same-site controls on POST and PATCH, and logs every proxied request.

- **Organisation Admin cannot access debug tools.** The routes documents/search-vector,
  documents/answer-debug, and debug/storage-config return 403 for any Organisation Admin
  session. These routes are accessible only to WorkTwin Developer / Admin sessions.

- **Tests are passing.** All backend tests (get_verified_staff_context, organisation
  scoping), all proxy tests (all 15 cases from docs/admin-proxy-hardening-plan.md),
  and all new Playwright auth tests are passing. The existing smoke tests pass with
  NEXT_PUBLIC_PILOT_AUTH_MODE=false.

- **Public demo safety is preserved.** The public demo deployment continues to work
  with NEXT_PUBLIC_PILOT_AUTH_MODE=false and ADMIN_PROXY_ENABLED=false. No changes to
  these flags on the public deployment are made as part of 4S.85.

- **No real Thumhara Centre pilot until DPA, governance, and legal sign-off.**
  Even after 4S.85 is complete, no real staff accounts are created, no real Thumhara
  Centre policy documents are uploaded, and no real staff queries are processed until
  the checklist in docs/auth-deployment-checklist.md (4S.85I) has been completed in
  full, including confirmation of a signed DPA with Supabase and OpenAI, named
  governance reviewer confirmed, and legal sign-off from Thumhara Centre.
