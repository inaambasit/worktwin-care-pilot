# 4S.90I — Sandbox Supabase Auth E2E Setup Plan

**Type:** Planning and documentation only  
**Date:** 2026-05-07  
**Branch:** `main`  
**Prerequisite checkpoint:** `f7045ce`  
**Status:** Plan only — no code, no env, no migration, no commit

---

## 1. Goal

Prove auth E2E in a **separate sandbox Supabase project** that has no connection to the production-labelled Thumhara Centre Supabase project.

This moves WorkTwin from:

> "safe because disabled"

toward:

> "safe because verified in sandbox"

The proof must cover:

- Magic-link sign-in or local test session creation via sandbox Supabase Auth
- Frontend obtaining a valid Supabase session (access token)
- Frontend forwarding the Bearer token to backend `/ask` and `/policies`
- Backend validating the JWT using sandbox Supabase JWKS / `getUser(token)` path (as implemented in `backend/app/jwt_auth.py`)
- Backend resolving `organisation_memberships` from the sandbox database
- Allowed membership → request succeeds
- Inactive membership → request rejected
- Wrong organisation membership → request rejected
- Missing/invalid Bearer token → request rejected with 401
- Staff route middleware protection verified locally

Completing this proof is the prerequisite for activating `PILOT_AUTH_MODE` in any controlled environment.

---

## 2. Non-Goals

The following are **explicitly out of scope** for this plan and must not be done during execution of any slice derived from it:

- Do not enable `PILOT_AUTH_MODE=true` in any deployed or shared environment
- Do not enable `NEXT_PUBLIC_PILOT_AUTH_MODE=true` in any deployed or shared environment
- Do not enable `ADMIN_PROXY_ENABLED` in any environment
- Do not use real Thumhara Centre staff accounts in any test
- Do not use real Thumhara Centre personal data, care plans, or named individuals
- Do not change the AC32, CC34, or QQ03 database flags — QCS content restriction is deliberately deferred (see Section 7)
- Do not run any SQL against the production-labelled Thumhara Centre Supabase project
- Do not apply `008_organisation_memberships.sql` to any shared or production-labelled project
- Do not commit secrets, `.env` files, tokens, or Supabase keys to the repository

---

## 3. Required Sandbox Setup

Complete this checklist before any migration or testing begins.

### 3.1 Supabase sandbox project

- [ ] Create a new Supabase project at [supabase.com](https://supabase.com) — personal or WorkTwin dev account, not the Thumhara Centre account
- [ ] Name the project so it is unambiguous that this is a sandbox (e.g. `worktwin-sandbox-dev`, `worktwin-auth-sandbox`, `worktwin-dev-auth-proof`) — the name must visibly include `sandbox` or `dev`
- [ ] Confirm in the Supabase dashboard that the project is **not** labelled `PRODUCTION` and is **not** associated with the Thumhara Centre organisation
- [ ] Note the sandbox project name and URL (no keys in docs)

### 3.2 Auth redirect URL configuration

- [ ] In the sandbox project dashboard → Authentication → URL Configuration:
  - [ ] Set **Site URL** to `http://localhost:3000`
  - [ ] Add `http://localhost:3000/auth/callback` to **Redirect URLs**
- [ ] Confirm magic-link emails will redirect to local frontend

### 3.3 Sandbox credentials

- [ ] Obtain from the sandbox dashboard:
  - `SUPABASE_URL` (sandbox project URL)
  - `SUPABASE_ANON_KEY` (sandbox anon/public key)
  - `SUPABASE_SERVICE_ROLE_KEY` (sandbox service role key)
  - `SUPABASE_JWT_SECRET` (for HS256 validation) or confirm JWKS endpoint for ES256
- [ ] Do not paste any key values into chat, docs, commits, or screenshots

### 3.4 Local env file

- [ ] Create a **local-only** env file (e.g. `.env.local` for frontend, `.env` for backend) with sandbox credentials
- [ ] Confirm `.env*` and `.env.local` are in `.gitignore` — do not override `.gitignore` to commit secrets
- [ ] After the proof session, do not leave sandbox service-role keys in plaintext files that sync to cloud storage or shared drives
- [ ] Env var names to set (values never committed):
  - Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PILOT_AUTH_MODE=true` (local only)
  - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (or JWKS URL), `PILOT_AUTH_MODE=true` (local only)

### 3.5 Gitignore confirmation

- [ ] Run `git check-ignore .env.local` and `git check-ignore .env` to confirm both are ignored
- [ ] Confirm `git status` shows no env files as untracked

### 3.6 Test user

- [ ] Create one fake test user in the sandbox project via Supabase Auth dashboard → Users → Invite or via SQL insert
- [ ] Use a clearly fake email (e.g. `test-staff@worktwin-sandbox.local` or similar) — not a real name, not a real email address
- [ ] Do not use real Thumhara Centre staff email addresses

---

## 4. Database Setup

All migrations and seed operations apply to the **sandbox project only**.

### 4.1 Schema migrations

- [ ] Confirm which migrations are already present in the sandbox project (check `supabase_migrations` table or equivalent)
- [ ] Apply all required migrations up to and including `008_organisation_memberships.sql` in the sandbox project via:
  - Supabase SQL editor (dashboard), or
  - `supabase db push` targeting the sandbox project (not the production project)
- [ ] Confirm `organisation_memberships` table exists in the sandbox PostgREST surface by running a test query

### 4.2 Migration safety gate

- [ ] Before running any SQL, confirm the Supabase project URL in the dashboard matches the sandbox project URL, not the Thumhara Centre production URL
- [ ] Do not proceed if the dashboard URL matches `worktwin-care-pilot / main / PRODUCTION`

### 4.3 Seed data — fake organisation

- [ ] Insert one fake organisation record:
  - `name`: e.g. `WorkTwin Sandbox Org`
  - `id`: note the UUID (for membership seeding)
  - Do not use Thumhara Centre as the organisation name or ID

### 4.4 Seed data — fake memberships

Seed the following test membership rows, each linked to the fake test user and the fake organisation:

| Row | Role | `is_active` | Purpose |
|-----|------|-------------|---------|
| 1 | `staff` | `true` | Happy path — allowed staff member |
| 2 | `registered_manager` or `organisation_admin` | `true` | Elevated role test |
| 3 | `staff` | `false` | Inactive membership — must be rejected |
| 4 | `staff` | `true` | Wrong organisation — use a different org ID not registered | 

- [ ] Seed row 1 (allowed staff)
- [ ] Seed row 2 (elevated role)
- [ ] Seed row 3 (inactive — same user, same org, `is_active=false`)
- [ ] Note the user IDs and org IDs for reference during the proof run — record IDs only, not names or personal data
- [ ] Do not seed any real Thumhara Centre membership data

### 4.5 Confirmation

- [ ] Confirm no operations were run against the Thumhara Centre production-labelled Supabase project
- [ ] Confirm `008_organisation_memberships.sql` was applied to the sandbox project only

---

## 5. E2E Proof Flow

Run this flow locally with the sandbox environment variables set.

### Step 1 — Start local frontend

```
cd frontend
NEXT_PUBLIC_PILOT_AUTH_MODE=true npm run dev
```

Confirm the dev server starts on `http://localhost:3000`.

### Step 2 — Start local backend

```
cd backend
PILOT_AUTH_MODE=true uvicorn app.main:app --reload --port 8000
```

Confirm the backend starts and logs that `PILOT_AUTH_MODE` is active.

### Step 3 — Sign in with sandbox Supabase

- Navigate to `http://localhost:3000/login` (or the configured sign-in route)
- Enter the fake test user email and request a magic link
- Check the email inbox (sandbox project will send a real email to whatever address you used — use a real inbox you control, not a fake domain)
- Click the magic link → redirected to `http://localhost:3000/auth/callback`
- Confirm the frontend obtains a valid Supabase session (check browser devtools → Application → localStorage or Cookies for the Supabase session)

### Step 4 — Verify frontend obtains session

- Open browser devtools → Network tab
- Trigger an action that calls the backend (e.g. submit a question via `/ask`)
- Confirm the `Authorization: Bearer <token>` header is present in the request to the backend
- Confirm the token is a non-empty JWT string (do not paste the token value into docs or chat)

### Step 5 — Backend JWT validation

- Confirm the backend receives the Bearer token
- Confirm the backend calls `getUser(token)` against the sandbox Supabase project
- Check backend logs for a successful user resolution (user ID should appear in logs — no personal data expected since test user is fake)
- Confirm the backend does **not** fall through to demo mode when a valid token is present

### Step 6 — Membership lookup — allowed staff (row 1)

- With the fake test user signed in and row 1 (active staff) present:
  - Send a request to `/ask`
  - Send a request to `/policies`
- Confirm both return 200 with valid responses
- Confirm backend logs show membership resolved for the correct org

### Step 7 — Membership lookup — inactive membership (row 3)

- Update the fake user's membership to use row 3 (`is_active=false`), or sign in as a user whose only membership is inactive
- Send a request to `/ask`
- Confirm the backend returns 403 or 401 (as implemented)
- Confirm the response does not include policy document content

### Step 8 — Wrong organisation (row 4)

- Configure the backend env to expect a different organisation ID, or create a second fake user with a membership in a different (non-matching) org
- Send a request to `/ask`
- Confirm the backend returns 403 or 401
- Confirm no policy content is returned

### Step 9 — Unauthenticated request

- Send a request to `/ask` with no `Authorization` header (e.g. using `curl` or a fetch call without the Bearer token)
- Confirm the backend returns 401
- Confirm no policy content is returned

### Step 10 — Invalid token

- Send a request to `/ask` with a malformed or expired Bearer token (e.g. a truncated JWT string)
- Confirm the backend returns 401
- Confirm no policy content is returned

### Step 11 — Staff route middleware protection

- With `NEXT_PUBLIC_PILOT_AUTH_MODE=true` and no active session:
  - Navigate directly to `http://localhost:3000/dashboard`
  - Navigate directly to `http://localhost:3000/ask`
  - Navigate directly to `http://localhost:3000/policies`
- Confirm each route redirects to `/login` (middleware protection active per 4S.90C)

---

## 6. Evidence to Capture

Record the following during the proof run. **Never record secret values.**

### Before the proof

- [ ] `git status` — confirm clean repo before starting
- [ ] Note current branch and HEAD commit hash
- [ ] Confirm `.env*` files are not tracked (`git status` must not show them)

### Sandbox confirmation

- [ ] Sandbox Supabase project **name** (not keys) — confirm it includes `sandbox` or `dev`
- [ ] Sandbox project URL **hostname only** (e.g. `xxxxxxxxxxxx.supabase.co`) — not keys
- [ ] Confirmation that the dashboard does not show `PRODUCTION` label for the Thumhara Centre project
- [ ] Migration applied: `008_organisation_memberships.sql` — sandbox only

### Fake user and seed data

- [ ] Fake user email address used (e.g. `test-staff@worktwin-sandbox.local`) — not a real person
- [ ] Fake user UUID (from Supabase dashboard Users tab) — for reference only
- [ ] Fake org name and UUID — for reference only
- [ ] Seed rows confirmed present (screenshot of `organisation_memberships` table with fake data — no real names)

### Auth flow evidence

- [ ] Screenshot or log showing frontend magic-link sign-in flow completed (no token values in screenshot)
- [ ] Browser devtools Network tab screenshot showing `Authorization: Bearer ...` header present (blur or crop the token value)
- [ ] Backend log line showing JWT validated and user resolved (no personal data expected — fake user)
- [ ] Backend log or response showing membership lookup succeeded for row 1 (allowed staff)

### Negative case evidence

- [ ] Backend returned 401 or 403 for inactive membership (row 3) — log line or curl response
- [ ] Backend returned 401 or 403 for wrong org — log line or curl response
- [ ] Backend returned 401 for unauthenticated request — curl output
- [ ] Backend returned 401 for invalid token — curl output

### Middleware protection evidence

- [ ] Browser screenshot or log showing redirect to `/login` when accessing `/dashboard` without a session

### After the proof

- [ ] `git status` — confirm repo is clean or only docs files changed
- [ ] Confirm no `.env*` files are staged or committed
- [ ] Note env var names used (not values) for the proof record

### Commands to capture evidence

```sh
# Git state before
git status
git log --oneline -3

# Gitignore check
git check-ignore -v .env.local
git check-ignore -v backend/.env

# Unauthenticated request check
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
# Expected: 401

# Invalid token check
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ask \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
# Expected: 401

# Git state after
git status
```

---

## 7. Safety Rules

The following rules apply to all slices derived from this plan and must not be relaxed.

### Secrets

- No Supabase keys, JWT secrets, service role keys, or access tokens may appear in:
  - Documentation files
  - Commits or commit messages
  - Screenshots or screen recordings
  - Terminal paste output shared in chat or reviews
  - Any file that is tracked by git
- Use env var **names** only in docs (e.g. `SUPABASE_SERVICE_ROLE_KEY`) — never values

### Real data

- No real Thumhara Centre staff accounts in any test
- No real service-user data, care plans, resident names, or personal data in any sandbox environment
- All test users must be clearly fake (fake email, fake name if any)

### Production environment

- No operations against the production-labelled Thumhara Centre Supabase project (`worktwin-care-pilot / main / PRODUCTION`)
- No SQL run against that project
- No Auth settings changed in that project
- No data seeded or modified in that project

### Deployment flags

- `PILOT_AUTH_MODE=true` is only set **locally** for the duration of the proof session and reset afterward
- `NEXT_PUBLIC_PILOT_AUTH_MODE=true` is only set **locally** for the duration of the proof session and reset afterward
- Neither flag is committed to `.env*` files or set in Vercel, Render, or any shared environment
- `ADMIN_PROXY_ENABLED` must not be enabled at any point

### QCS and content restriction

- AC32, CC34, and QQ03 database flag cleanup is **deliberately deferred** — this plan is not about QCS cleanup
- Do not change any DB flag for AC32, CC34, or QQ03
- Do not use QCS-derived documents in sandbox testing
- The Visitor Sign-In SOP (clean corpus) may be used for policy lookup testing if needed

### Repository integrity

- The repository must remain clean or have only documentation changes at the conclusion of each slice
- Do not commit any code, env file, migration output, or test result as a code change during this plan

---

## 8. Pass/Fail Criteria

### PASS

All of the following must be true for the E2E proof to be considered passing:

- [ ] Sandbox Supabase project is clearly separate from the production-labelled Thumhara Centre project (different project name, different URL, not labelled PRODUCTION)
- [ ] `008_organisation_memberships.sql` was applied to the sandbox project only — not to any production-labelled or shared project
- [ ] Fake test user sign-in (magic-link or test session) succeeds locally
- [ ] Frontend correctly obtains and forwards the Bearer token to backend `/ask` and `/policies`
- [ ] Backend validates the JWT via `getUser(token)` against the sandbox project (not via demo mode bypass)
- [ ] Backend resolves `organisation_memberships` for the allowed test user
- [ ] Allowed user (active, correct org) → `/ask` and `/policies` return 200
- [ ] Inactive membership → request rejected (401 or 403)
- [ ] Wrong org → request rejected (401 or 403)
- [ ] Unauthenticated request → 401
- [ ] Invalid/malformed token → 401
- [ ] Staff route middleware redirects unauthenticated browser to `/login`
- [ ] No public deployment flags (`PILOT_AUTH_MODE`, `NEXT_PUBLIC_PILOT_AUTH_MODE`) are enabled in any shared environment
- [ ] No secrets are committed to the repository
- [ ] `git status` after the proof shows no unexpected changes

### FAIL

The proof fails immediately if any of the following is true:

- Any operation is run against the production-labelled Thumhara Centre Supabase project
- Any real Thumhara Centre staff data, personal data, or care-plan data is used
- Any Supabase key, JWT secret, or access token is exposed in a commit, doc, screenshot, or chat message
- `PILOT_AUTH_MODE` or `NEXT_PUBLIC_PILOT_AUTH_MODE` is set to `true` in any deployed or shared environment (Vercel, Render, etc.)
- `ADMIN_PROXY_ENABLED` is enabled in any environment
- Auth appears to work only because token validation was bypassed or skipped (demo mode accepted despite auth mode being set)
- The `organisation_memberships` table is missing and the proof proceeds anyway (auth without membership resolution is not a valid proof)

---

## 9. Next Slices After This Plan

| Slice | Description | Prerequisite |
|-------|-------------|--------------|
| **4S.90J** | Create and configure sandbox Supabase project manually — create project, set name, configure Auth redirect URLs, obtain credentials, confirm sandbox is separate from Thumhara Centre project | This plan (4S.90I) |
| **4S.90K** | Apply sandbox migrations and seed fake memberships — apply all required migrations including `008_organisation_memberships.sql` to sandbox, seed fake org and fake membership rows for all four test cases | 4S.90J |
| **4S.90L** | Local auth E2E proof — execute the full proof flow from Section 5, capture all evidence from Section 6, confirm pass/fail per Section 8 | 4S.90K |
| **4S.90M** | RLS policy design and proof in sandbox — design and verify Row-Level Security policies on `organisation_memberships` and related tables in the sandbox; confirm staff cannot read other orgs' data | 4S.90L |
| **4S.90N** | Admin proxy real session guard tests — replace the test-only session stub in the admin proxy with real Supabase Auth session validation, verify in sandbox | 4S.90L |

---

## 10. Related Documents

| Document | Relevance |
|----------|-----------|
| [Auth E2E proof blocker (4S.88G)](4s88g-auth-e2e-proof-blocker.md) | Original blocker that this plan resolves — migration cannot run against production-labelled project |
| [Current state](current-state.md) | Auth readiness score (3/10), disabled flags, do-not-touch list |
| [Auth readiness review](auth-readiness-review.md) | Auth component status at checkpoint 4S.88A |
| [Auth schema plan](auth-schema-plan.md) | `008_organisation_memberships.sql` schema and design |
| [Supabase auth configuration checklist](supabase-auth-configuration-checklist.md) | Dashboard checks required before any controlled auth activation |
| [Pilot security boundary](pilot-security-boundary.md) | Security boundary design — admin proxy disabled publicly |
