# 4S.95A — Pilot Identity and Environment Decision Record

**Date:** 2026-05-10
**Checkpoint:** `04fc14c`
**Branch:** `main`
**Status:** Docs-only decision record. No code, SQL, env, or migration changes made.
**Amendment:** Section 2 superseded by 4S.95B-R (2026-05-10). See Section 2B for the current Supabase project decision. Section 13 next-slice sequence updated accordingly.

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

> **SUPERSEDED (4S.95B-R, 2026-05-10):** The original decision in Section 2A is superseded. Section 2B records the revised decision. Read Section 2B as the current authoritative decision.

### 2A. Original Decision (4S.95A) — Superseded

Original decision: create a new dedicated Supabase pilot project (`worktwin-thumhara-pilot`). Do not use the sandbox or the existing production-labelled project. Apply all migrations 001–008 to the new project before any auth or membership operations.

This decision is superseded because Supabase Free tier limits block a third active project.

### 2B. Revised Decision (4S.95B-R, 2026-05-10)

**Decision:** Use the existing `worktwin-care-pilot` Supabase project for controlled pilot infrastructure. Isolate all pilot data under `organisation_id=thumhara-centre`.

**Reason for reuse:** Supabase Free tier limits block creation of a third active project. Inspection of the existing project confirms it can be reused safely because pilot data is isolated by `organisation_id`.

**Supabase project facts (inspected 2026-05-10):**

| Field | Value |
|---|---|
| Project name | `worktwin-care-pilot` |
| Label in Supabase UI | PRODUCTION |
| Public tables present | `document_registry`, `document_chunks`, `document_embeddings`, `document_extractions`, `document_audit_events`, `organisation_memberships` |
| `auth.users` count | 1 |
| `organisation_memberships` count | 1 |
| Existing membership | `demo-org` / `staff` / `active=true` / count=1 |
| `document_registry` count | 15 |
| Existing document `organisation_id` | All 15 rows under `demo-org` |
| `thumhara-centre` rows | None found |

**Constraints on reuse:**

- This is not a clean new project. It is an existing project with historical `demo-org` data.
- Reuse is acceptable only because all pilot data will be isolated under `organisation_id=thumhara-centre`.
- The existing `demo-org` rows must remain untouched.
- QCS/demo documents must not be migrated or re-associated to `thumhara-centre`.
- The first WorkTwin admin/test user must be a new Auth user with exactly one active `organisation_memberships` row for `thumhara-centre`.
- Do not use the existing `demo-org` staff user for any pilot activity.
- The current backend membership lookup uses `LIMIT 1` (`backend/app/membership.py`). Every pilot test user must have exactly one active membership row to avoid silent wrong-org resolution.
- Real Thumhara Centre staff remain blocked pending DPA and governance sign-off (Section 8).
- `ADMIN_PROXY_ENABLED` remains disabled.
- `NEXT_PUBLIC_PILOT_AUTH_MODE` remains `false`.
- Migrations 001–008 do not need to be re-applied — the project already carries the schema. Verify the schema state before any auth or membership operations.

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
  4. Verify via `/admin/session-check` (see slice 4S.95E)

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
session-check path — middleware is the auth gate only. This is slice **4S.95F**.

---

## 7. Admin Proxy

**Decision:** Admin proxy remains disabled publicly. Enabling it requires completing 4S.95F first.

- `ADMIN_PROXY_ENABLED=false` is the public default and must not be changed without completing 4S.95F.
- The enabled-mode path uses Supabase session/token validation (`getAdminProxySessionContext`, proven in 4S.90N-C/D) and the backend `/admin/session-check` endpoint (proven in 4S.90N-D).
- The `PLAYWRIGHT_TEST` production fail-closed guard exists to prevent test seam misuse in production.
- Do not enable admin proxy in any Vercel, Render, or shared environment until 4S.95F and the
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

**Preferred route for Visitor SOP in the pilot project:** re-upload the Visitor SOP under the existing
`worktwin-care-pilot` Supabase project with `organisation_id=thumhara-centre` rather than SQL-patching
existing `demo-org` rows. This is slice **4S.95H**.

---

## 10. JWT Validation Wording

**Decision:** Do not describe JWT validation as HS256-only.

The backend JWT verifier (`backend/app/jwt_auth.py`) must be read before making algorithm-specific claims.
The sandbox E2E proof (4S.90L) used Supabase-issued JWTs. Use this wording for any documentation
or security-facing description:

> JWT validation uses the implemented backend verifier in `backend/app/jwt_auth.py`;
> role and `organisation_id` are resolved from `organisation_memberships`, not from JWT claims.

---

## 11. Pre-Pilot Checklist

The following must be confirmed before any auth or membership operations against the existing `worktwin-care-pilot` project. No new Supabase project is required (see Section 2B).

- [ ] Existing `worktwin-care-pilot` Supabase project accessible and schema state verified — confirm all 8 migrations (001–008) are applied
- [ ] `organisation_memberships` table confirmed present with no existing `thumhara-centre` rows
- [ ] Existing `demo-org` rows confirmed intact — 15 `document_registry` rows, 1 `organisation_memberships` row — before any pilot operations touch the project
- [ ] `.env` for pilot deployment uses `worktwin-care-pilot` project credentials (Supabase URL, anon key, service role key) — stored in secrets only, not committed to repo
- [ ] Backend JWT verifier configuration confirmed for `worktwin-care-pilot` project and stored securely in deployment secrets
- [ ] ANSWER_MODEL, OPENAI_API_KEY, and rate limits confirmed for pilot deployment
- [ ] Visitor SOP PDF available for re-upload under `thumhara-centre` in the existing project (slice 4S.95H)

---

## 12. Real Staff Account Blockers

The following must all be resolved before any real Thumhara Centre staff account is created.

- [ ] WorkTwin–Thumhara data processing route agreed and documented
- [ ] Supabase and OpenAI subprocessor/processing terms reviewed by WorkTwin
- [ ] Thumhara management written pilot sign-off received
- [ ] Bootstrap Auth user created in existing `worktwin-care-pilot` project (4S.95C)
- [ ] Bootstrap `worktwin_dev_admin` membership row inserted for `thumhara-centre` (4S.95D)
- [ ] Bootstrap admin proven via `/admin/session-check` (4S.95E)
- [ ] `/admin/:path*` added to middleware protection (4S.95F)
- [ ] Admin proxy enabled and E2E proven in controlled pilot deployment only (4S.95G)
- [ ] Visitor SOP re-uploaded and indexed under `thumhara-centre` in the existing project (4S.95H)
- [ ] Pilot auth activated and proven with test users only (4S.95I)

---

## 13. Next-Slice Sequence

> **Updated by 4S.95B-R (2026-05-10):** Sequence revised to reflect reuse of the existing `worktwin-care-pilot` project. Steps for new project creation and migration application are removed. New project `worktwin-thumhara-pilot` is no longer required.

| Slice | Description | Prerequisite |
|---|---|---|
| **4S.95B-R** | Record decision to reuse existing `worktwin-care-pilot` project with `thumhara-centre` isolation (this slice — docs only) | 4S.95A |
| **4S.95C** | Create/invite WorkTwin-controlled bootstrap Auth user in existing `worktwin-care-pilot` project | 4S.95B-R |
| **4S.95D** | Insert bootstrap `worktwin_dev_admin` membership row for `thumhara-centre` using placeholder-safe SQL | 4S.95C |
| **4S.95E** | Prove backend `/admin/session-check` returns `200 OK` for the bootstrap admin | 4S.95D |
| **4S.95F** | Add `/admin/:path*` to `frontend/middleware.ts` as an authentication gate | 4S.95E |
| **4S.95G** | Enable admin proxy (`ADMIN_PROXY_ENABLED=true`) in controlled pilot deployment only and prove E2E (session guard → session-check → role check → response minimisation) | 4S.95F |
| **4S.95H** | Re-upload Visitor SOP PDF under `thumhara-centre` in the existing project; verify extraction, embedding, governance flags, and staff visibility | 4S.95G |
| **4S.95I** | Activate pilot auth (`NEXT_PUBLIC_PILOT_AUTH_MODE=true`) in pilot deployment; prove E2E with test users only; no real Thumhara Centre staff at this stage | 4S.95H |

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
