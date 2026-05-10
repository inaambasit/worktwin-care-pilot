# 4S.95A — Pilot Identity and Environment Decision Record

**Date:** 2026-05-10
**Checkpoint:** `04fc14c`
**Branch:** `main`
**Status:** Docs-only decision record. No code, SQL, env, or migration changes made.

> This record is the authoritative pre-migration reference for pilot identity and environment decisions.
> It must be read before executing any of: `organisation_memberships` migration, pilot auth activation,
> admin proxy enablement, or real staff pilot onboarding.

---

## 1. organisation_id

**Decision:** `thumhara-centre`

This string is the canonical `organisation_id` for the pilot client. It must be used consistently in:
- `organisation_memberships` seed rows
- Backend organisation boundary checks
- Any future multi-org expansion that references Thumhara Centre

---

## 2. Supabase Project

**Decision:** Create a new dedicated Supabase pilot project for the real pilot.

- Suggested project name: `worktwin-thumhara-pilot`
- Do not use the sandbox project (`worktwin-sandbox-dev`) for the real pilot. It was created for E2E proof only and contains fake/test data.
- Do not use the existing production-labelled project until separately and explicitly approved in writing.
- The new pilot project must have all migrations (001–008) applied in order before any auth or membership operations.

---

## 3. First Admin and Test Users

**Decision:** Do not write real email addresses into the repository.

All references to pilot user accounts in this record and all related docs use placeholders only:

| Placeholder | Meaning |
|---|---|
| `<pilot-admin-email>` | WorkTwin-controlled admin test account email (set only in secure Supabase dashboard or Vercel env) |
| `<pilot-staff-test-email>` | Thumhara-affiliated test staff email — only after DPA/governance signed off |
| `<auth-user-uuid>` | Supabase Auth `id` for the relevant user — set in SQL editor or via API, never committed to repo |

Real credentials belong in the Supabase Auth dashboard and in secrets management only.

---

## 4. Bootstrap Admin

**Decision:** The first `worktwin_dev_admin` row may be created manually in the Supabase SQL editor after the Auth user exists.

- `created_by` may be `null` for this bootstrap row only.
- This row must use a WorkTwin-controlled or admin test account (`<pilot-admin-email>`).
- No real Thumhara Centre staff accounts may be created until the governance prerequisites in Section 8 are satisfied.
- The bootstrap procedure is:
  1. Create the Auth user via Supabase dashboard or API (email: `<pilot-admin-email>`)
  2. Note the resulting `<auth-user-uuid>`
  3. Insert a row into `organisation_memberships` via SQL editor using those values
  4. Verify via `/admin/session-check` (see slice 4S.95D)

---

## 5. Membership Model

**Decision:** Single-org only for the first controlled pilot.

- Every pilot user has exactly one active membership row for `thumhara-centre`.
- The current backend membership lookup uses `LIMIT 1` (`backend/app/membership.py`).
  This is acceptable for the first single-org pilot only.
- Before any multi-org expansion, the membership lookup must be revisited: `LIMIT 1` silently picks one
  membership if a user has several, which is incorrect in a multi-org context.
- Do not treat `LIMIT 1` as a production-safe multi-org pattern.

---

## 6. Middleware Route Protection

**Decision:** Staff routes are protected when `NEXT_PUBLIC_PILOT_AUTH_MODE=true`. Admin routes are not yet in middleware scope and must be added before admin proxy is enabled.

### Staff routes currently protected in pilot-auth mode (`frontend/middleware.ts`)

- `/dashboard`
- `/ask`
- `/policies`
- `/onboarding`
- `/scenarios`
- `/notes`
- `/escalation`

### Admin routes — not yet in middleware

`/admin` and `/admin/:path*` are **not** currently included in the pilot-auth middleware.
Admin auth/RBAC is currently enforced only by the admin proxy session guard (`getAdminProxySessionContext`),
the backend `/admin/session-check` endpoint, the CSRF guard, the path allowlist, and response minimisation.

**Before enabling `ADMIN_PROXY_ENABLED` for any pilot admin use:** add `/admin/:path*` to
`frontend/middleware.ts` as an authentication gate. Role enforcement stays in the admin proxy/backend
session-check path — middleware is the auth gate only. This is slice **4S.95E**.

---

## 7. Admin Proxy

**Decision:** Admin proxy remains disabled publicly. Enabling it requires completing 4S.95E first.

- `ADMIN_PROXY_ENABLED=false` is the public default and must not be changed without completing 4S.95E.
- The enabled-mode path uses Supabase session/token validation (`getAdminProxySessionContext`, proven in 4S.90N-C/D) and the backend `/admin/session-check` endpoint (proven in 4S.90N-D).
- The `PLAYWRIGHT_TEST` production fail-closed guard exists to prevent test seam misuse in production.
- Do not enable admin proxy in any Vercel, Render, or shared environment until 4S.95E and the
  DPA/governance prerequisites are satisfied.

---

## 8. DPA and Governance Prerequisites Before Real Staff

**Decision:** No real Thumhara Centre staff accounts until all of the following are satisfied.

| Prerequisite | Owner | Status |
|---|---|---|
| WorkTwin–Thumhara data processing route agreed (covering how WorkTwin processes Thumhara Centre data) | Legal / WorkTwin | Outstanding |
| Supabase and OpenAI subprocessor and processing terms reviewed (WorkTwin reviews the relevant processor/subprocessor terms as part of its own compliance position — Thumhara does not directly contract with Supabase or OpenAI) | WorkTwin / Legal | Outstanding |
| Thumhara management written pilot sign-off | Thumhara Centre management | Outstanding |

> **Wording note:** WorkTwin is the data processor for Thumhara Centre's staff data. Supabase and OpenAI
> are subprocessors used by WorkTwin. The DPA/processing agreement is between WorkTwin and Thumhara Centre.
> WorkTwin is responsible for reviewing Supabase and OpenAI's processing terms as part of its own
> compliance position. Thumhara Centre does not directly sign with Supabase or OpenAI.

---

## 9. QCS and Content Restrictions

**Decision:** AC32, CC34, and QQ03 remain frozen and blocked. Visitor SOP is the only confirmed clean Lane A document for the pilot.

| Document | Status |
|---|---|
| AC32 Mobile Phone and Portable Device Use Policy | Frozen — QCS content restriction from 2026-05-07; must not be migrated to `thumhara-centre` or served to staff |
| CC34 Infection Control Policy and Procedure | Frozen — QCS content restriction; must not be migrated or served |
| QQ03 Complaints, Suggestions and Compliments Policy | Frozen — QCS content restriction; must not be migrated or served |
| Visitor Sign-In and Identification Procedure | Confirmed clean Lane A; Thumhara-original SOP; approved for controlled demo use (corpus approval: `docs/visitor-sop-corpus-approval.md`) |

**Preferred route for Visitor SOP in the pilot project:** re-upload the Visitor SOP under the new
`worktwin-thumhara-pilot` Supabase project and `thumhara-centre` org rather than SQL-patching
existing demo rows. This is slice **4S.95G**.

---

## 10. JWT Validation Wording

**Decision:** Do not describe JWT validation as HS256-only.

The backend JWT verifier (`backend/app/jwt_auth.py`) must be read before making algorithm-specific claims.
The sandbox E2E proof (4S.90L) used Supabase-issued JWTs. Use this wording for any documentation
or security-facing description:

> JWT validation uses the implemented backend verifier in `backend/app/jwt_auth.py`;
> role and `organisation_id` are resolved from `organisation_memberships`, not from JWT claims.

---

## 11. Pre-Migration Checklist

The following questions must be answered before running any migration against the new pilot project.

- [ ] New `worktwin-thumhara-pilot` Supabase project created and confirmed accessible
- [ ] Migration files 001–008 reviewed for the new project (no sandbox-specific data in seed files)
- [ ] `organisation_memberships` migration (008) reviewed: confirm `thumhara-centre` org row, placeholder users only, no real emails committed
- [ ] `.env` for pilot deployment prepared with new project credentials (Supabase URL, anon key, service role key) — stored in secrets only, not committed to repo
- [ ] Backend JWT verifier configuration for the new pilot project confirmed and stored securely in deployment secrets
- [ ] ANSWER_MODEL, OPENAI_API_KEY, and rate limits confirmed for pilot deployment
- [ ] Visitor SOP PDF available for re-upload under the new project

---

## 12. Real Staff Account Blockers

The following must all be resolved before any real Thumhara Centre staff account is created.

- [ ] WorkTwin–Thumhara data processing route agreed and documented
- [ ] Supabase and OpenAI subprocessor/processing terms reviewed by WorkTwin
- [ ] Thumhara management written pilot sign-off received
- [ ] New pilot Supabase project (`worktwin-thumhara-pilot`) standing and migrations applied (4S.95B/C)
- [ ] Bootstrap admin account proven via `/admin/session-check` (4S.95D)
- [ ] `/admin/:path*` added to middleware protection (4S.95E)
- [ ] Admin proxy enabled and E2E proven in pilot deployment only (4S.95F)
- [ ] Visitor SOP re-uploaded and indexed under `thumhara-centre` in the new project (4S.95G)
- [ ] Pilot auth activated and proven with test users only (4S.95H)

---

## 13. Next-Slice Sequence

| Slice | Description | Prerequisite |
|---|---|---|
| **4S.95B** | Create/check new pilot Supabase project (`worktwin-thumhara-pilot`) and confirm migration readiness | This record (4S.95A) |
| **4S.95C** | Apply migrations 001–008 to the new pilot project in order | 4S.95B |
| **4S.95D** | Seed first bootstrap admin (WorkTwin-controlled account only) and prove `/admin/session-check` returns `200 OK` | 4S.95C |
| **4S.95E** | Add `/admin/:path*` to `frontend/middleware.ts` as an authentication gate | 4S.95D |
| **4S.95F** | Enable admin proxy (`ADMIN_PROXY_ENABLED=true`) in pilot deployment only and prove E2E (session guard → session-check → role check → response minimisation) | 4S.95E |
| **4S.95G** | Re-upload Visitor SOP PDF under `thumhara-centre` in the new pilot project; verify extraction, embedding, governance flags, and staff visibility | 4S.95F |
| **4S.95H** | Activate pilot auth (`NEXT_PUBLIC_PILOT_AUTH_MODE=true`) in pilot deployment; prove E2E with test users only; no real Thumhara staff at this stage | 4S.95G |
| **4S.95I** | DPA and governance pack complete; Thumhara management sign-off received; real staff accounts permitted under the agreed data processing route | 4S.95H + all governance prerequisites |

---

## 14. Safety Constraints

This record does not contain:
- Real email addresses
- Secrets, tokens, or API keys
- UUIDs from real or production users
- SQL ready to execute with real values
- Any claim that the system is production-ready or has passed regulatory review

All placeholders (`<pilot-admin-email>`, `<pilot-staff-test-email>`, `<auth-user-uuid>`) must be
resolved only in the Supabase dashboard, Render/Vercel environment secrets, or a local `.env` file
that is excluded from version control.
