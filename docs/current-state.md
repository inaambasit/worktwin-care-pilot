# WorkTwin Care Pilot - Current State

> Generated: 2026-05-07. Updated: 2026-05-08. Source of truth for checkpoint `23632a4` on branch `main`.
> Update this file whenever a milestone changes the status of any item below.
> Do not edit other files to reconcile with this document - fix those files instead.

> **4S.90L (2026-05-08):** Sandbox auth E2E proof passed. Full E2E sign-in, JWT validation, membership resolution, and organisation-boundary enforcement proven locally using the `worktwin-sandbox-dev` sandbox Supabase project. A `/policies` wrong-org boundary gap was found and fixed; regression tests added; `pytest` passed 117/117. Fix committed in `23632a4`. Public auth remains disabled; this is a sandbox-only proof.

> **4S.90M (2026-05-08):** Sandbox RLS baseline proof passed. All six tables (`document_registry`, `document_chunks`, `document_extractions`, `document_embeddings`, `document_audit_events`, `organisation_memberships`) confirmed `rls_enabled=true`, `policy_count=0` in the sandbox. `anon` direct REST access to all six tables returned 401 blocked. Authenticated sandbox staff direct REST access returned 403 blocked. `service_role` direct REST access returned 200 allowed. No RLS policies are yet implemented; current safe posture remains backend-gated with service_role as the controlled gatekeeper. No database changes were made. No code changes were made. Latest checkpoint remains `2506e6c` until this docs commit is made.

> **4S.90M-B (2026-05-08):** RLS strategy decision recorded. WorkTwin will remain backend-gated for the controlled pilot. No direct authenticated Supabase table access or new RLS policies are being introduced. The backend continues to enforce all policy checks (JWT validation, membership lookup, organisation boundary, role checks, governance gates) using `service_role`. Decision doc at `docs/4s90m-b-rls-strategy-decision.md`. Latest checkpoint remains `b33fb71` until this docs commit is made.

> **4S.90N-A (2026-05-08):** Admin proxy real session guard design recorded. Decision: keep the frontend/Vercel environment free of SUPABASE_SERVICE_ROLE_KEY; backend remains the membership and role authority; the proxy will call a future backend /admin/session-check endpoint using the user Supabase access token before forwarding any admin request. Admin proxy remains disabled publicly (ADMIN_PROXY_ENABLED not set). No code or database changes made. Design doc at `docs/4s90n-admin-proxy-real-session-guard-design.md`. Next slice is 4S.90N-B (backend /admin/session-check tests and implementation). Latest checkpoint remains `002a6dd` until this docs commit is made.

---

## 1. Current Checkpoint

| Item | Value |
|---|---|
| Commit | `5acf430` |
| Branch | `main` |
| Repo path | `C:\Projects\worktwin-care-pilot\worktwin-care-pilot-starter` |
| Backend | FastAPI / `backend/app/main.py` |
| Frontend | Next.js 14 / `frontend/` |
| Database | Supabase / PostgreSQL + pgvector (Thumhara Centre project - sample data only) |
| Deployment | Frontend -> Vercel / Backend -> Render |

---

## 2. What WorkTwin Is Right Now

WorkTwin Care Pilot is a controlled prototype of a privacy-first AI staff support and policy assistant for regulated UK care settings. It is **not production-ready** and is **not approved for unsupervised use by real staff**.

The system currently demonstrates:

- A staff question portal (`/ask`) that routes questions through a source-grounded RAG pipeline using approved policy documents
- Deterministic escalation for six high-risk topic categories (safeguarding, whistleblowing, medication, wellbeing, HR, legal) - no LLM involved in those paths
- A three-gate governance model controlling which documents reach staff, embeddings, and AI answers independently
- An admin document registry with upload, embedding generation, vector search, and answer-debug tooling
- Authentication scaffolding (Supabase Auth + JWT validation + membership resolution) that is wired but not activated

The pilot client is **Thumhara Centre**. No real staff, service-user, resident, care-plan, HR, safeguarding case-note or named complaint personal data has been introduced. Some controlled internal policy testing has used Thumhara Centre/QCS policy documents under governance restrictions. A content-source review completed on 2026-05-07 established a formal QCS and third-party content restriction; see Section 11.

---

## 3. What Is Currently Working

### Staff-facing surfaces
- `/ask` - accepts questions, runs escalation check, returns source-grounded answers from approved documents (demo identity mode)
- `/policies` - lists approved, role-visible policy documents
- `/dashboard`, `/notes`, `/escalation`, `/onboarding`, `/scenarios` - all load and render
- Escalation topic detection - six patterns, short-circuits to deterministic safe response before any LLM call

### Backend pipeline (end-to-end, demo mode)
- PDF upload -> text extraction (pypdf) -> character-based chunking (~1,200 chars, 150 overlap)
- OpenAI `text-embedding-3-small` embeddings (1,536 dims) -> pgvector HNSW index
- `match_document_chunks` RPC for vector search
- `gpt-4o-mini` source-grounded answer generation with fail-closed fallback
- 11-condition staff `/ask` document gate (`_can_use_document_for_staff_ask`)
- In-memory rate limiting (20 requests / 15 min per user; 100 / hr per org)

### Governance
- Three-gate model: `approved_for_embedding`, `approved_for_source_grounded_answers`, `approved_for_staff_visibility`
- `approved_for_ai_answers` flag distinct from staff visibility
- Governance reviewer metadata fields (`governance_reviewed_by`, `governance_reviewed_at`) on document records
- Audit event logging for governance changes

### Auth scaffolding (code present, not activated)
- JWT validation supporting ES256 (JWKS) and HS256 - `backend/app/jwt_auth.py`
- Membership resolution from `organisation_memberships` table - `backend/app/membership.py`
- Bearer token forwarding from frontend to backend - `frontend/lib/api.ts` (lines 27-29, 107-109)
- Supabase SSR client, login/callback/logout routes

### Admin tooling (proxy disabled - internal dev use only)
- Document registry CRUD, approval, archive
- Embedding generation endpoint
- Vector search debug endpoint
- Answer-debug endpoint
- Governance patch endpoint
- Admin proxy route with path allowlist, method guard, role guard, audit logging

### Test coverage
- 9 backend test files (JWT auth, membership, staff context, ask identity, policies identity, grounding safety, document registry models, governance gates, test_app_import.py)
- `backend/tests/test_governance_gates.py` added in 4S.90A: 39 governance gate unit tests passed (8 test classes covering embedding gate, answer-debug gate, staff visibility gate, staff Ask gate, sensitive/escalation/dummy document blocking, role matching, and fully approved document pass-all verification) — no DB, no HTTP, plain dict fixtures only
- Related tests also passed in 4S.90A: `test_ask_grounding_safety.py` and `test_document_registry_models.py`, 17 passed — no runtime code changed
- Playwright smoke tests (15 tests, all major staff routes)
- Admin proxy spec (30+ tests, 5 describe blocks)

---

## 4. What Is Deliberately Disabled or Not Ready

| Item | Status | Why |
|---|---|---|
| `PILOT_AUTH_MODE` | `false` | E2E proof (4S.88G) not complete; activating without it would give false confidence |
| Admin proxy | Disabled (`ADMIN_PROXY_ENABLED` not set) | Session guard and CSRF guard are test-only stubs; not safe to expose in production |
| Session guard | Test stub only | `getAdminProxySessionContext` returns `null` for all non-test requests |
| CSRF guard | Test stub only | Production always returns 403 for POST/PATCH through proxy |
| Real staff use | Not approved | No DPA, no QCS licence AI/RAG confirmation, auth not activated |
| `008_organisation_memberships.sql` | Not applied | 4S.88G blocker - safe dev branch required before applying |
| `middleware.ts` route protection | Staff routes covered in pilot-auth mode (4S.90C) | In pilot-auth mode, middleware protects `/dashboard`, `/ask`, `/policies`, `/onboarding`, `/scenarios`, `/scenarios/*`, `/notes`, `/escalation`; public demo behaviour remains fail-open when `NEXT_PUBLIC_PILOT_AUTH_MODE` is not `true`; admin routes are deliberately not protected by this middleware slice — admin auth/RBAC/proxy session is a separate concern |
| `supabase-browser.ts` token extraction | Hardened (partial) | `getSession()` obtains the local token; `getUser(token)` validates it server-side before forwarding; admin proxy real Supabase session validation remains outstanding |

---

## 5. Current Policy and Document State

> **Note on QCS-derived document DB flag state (AC32, CC34, QQ03):** The table below records historical/current database flag state as it exists in the registry. These flags have not been changed in this slice. However, AC32, CC34, and QQ03 are frozen/blocked from 2026-05-07 by the QCS content restriction (see Section 11). The "Staff-visible" and "AI answer" states shown for AC32 reflect the historical DB flags set during controlled internal testing before this restriction was formally recorded — they do not represent an approved continuing state. A future data-governance cleanup slice should review whether existing QCS-derived DB flags or embeddings need to be disabled, hidden, archived, or removed.

| Document | Lane | Uploaded | Extracted | Embedded | Staff-visible | AI answer | Notes |
|---|---|---|---|---|---|---|---|
| Visitor Sign-In and Identification Procedure | A | Yes | Yes | Yes (indexed) | Yes | Yes | Clean baseline policy proof; approved for staff-visible pathway testing |
| AC32 Mobile Phone and Portable Device Use Policy | A - controlled internal only | Yes | Yes | Yes (indexed) | Yes - controlled internal only | Yes - controlled internal only | BLOCKED (2026-05-07) — QCS content restriction applies; no further expansion of embedding, AI answers, or staff serving until written permission obtained; see Section 11 |
| CC34 Infection Control Policy and Procedure | B -> A candidate | Yes | Yes | Yes (indexed) | No | Admin answer-debug only | BLOCKED (2026-05-07) — QCS content restriction applies; extended admin-only QA complete; not for staff visibility or further AI-RAG expansion until written permission obtained; see Section 11 |
| QQ03 Complaints, Suggestions and Compliments Policy | B | Yes | Yes | Yes (indexed) | No | Admin answer-debug only | BLOCKED (2026-05-07) — QCS content restriction applies; not for staff visibility or further AI-RAG expansion until written permission obtained; see Section 11 |
| CR100 Safeguarding Adults Policy and Procedure | C - human-only | Yes (human-only reference) | Yes | No | No | No - human escalation required | Not approved for embedding or AI answers; must trigger human escalation |
| PM11 Raising Concerns / Freedom to Speak Up / Whistleblowing | C - human-only | Yes (human-only reference) | Yes | No | No | No - human escalation required | Not approved for embedding or AI answers; must trigger human escalation |
| PPE Policy | Pending | No | No | No | No | No | PDF not yet received from Shagufta |
| CR07 Data Protection (English) | Parked | No | No | No | No | No | DOCX exists but PDF export and data-protection escalation strategy required before upload |
| CR07 Data Protection (Urdu) | Parked - do not upload | No | No | No | No | No | Multilingual strategy required before upload |

**Lane definitions:**
- A - safe AI answer candidate (can progress to staff visibility with governance sign-off)
- B - admin-test only (not for staff visibility)
- C - human-only escalation (do not use in RAG)
- Pending - PDF not yet received; not uploaded
- Parked - exists in some form but upload blocked pending decisions

---

## 6. Current Blockers

1. **4S.88G** - `organisation_memberships` table not applied to the Thumhara Centre Supabase project. Cannot activate `PILOT_AUTH_MODE` or demonstrate real auth E2E without either a separate Supabase dev branch or explicit approval to run `008_organisation_memberships.sql` against the named project. See `docs/4s88g-auth-e2e-proof-blocker.md`.

2. **Third-party content and QCS restriction (recorded 2026-05-07)** — WorkTwin must not ingest, upload, embed, vectorise, answer-debug, or staff-serve QCS Documentation or any other third-party copyrighted compliance-library content unless explicit written permission exists for this specific AI/RAG use case. AC32, CC34, and QQ03 are QCS-licensed content. Thumhara Centre has a QCS licence; however, WorkTwin must not use QCS Documentation in any AI/RAG workflow unless written permission confirms that the licence permits this specific use case. No further expansion of staff visibility, AI answer access, or embedding scope for these documents until written permission is obtained. This is a content-source restriction, not a WorkTwin architecture failure. See Section 12.

3. **No DPA or data processing agreement** - WorkTwin does not yet have a signed DPA or data processing addendum covering the Thumhara Centre relationship. Required before any real personal data is introduced.

4. **Admin proxy session and CSRF guards are test-only stubs** - The proxy cannot be safely enabled in production in this state. Both guards must be replaced with real implementations before `ADMIN_PROXY_ENABLED` is set in any non-local environment.

5. **Admin routes not protected by this middleware slice** - Staff routes (`/dashboard`, `/ask`, `/policies`, `/onboarding`, `/scenarios`, `/notes`, `/escalation`) are now covered in pilot-auth mode (4S.90C). Admin routes (`/admin/*`) are deliberately outside this middleware slice; admin auth, RBAC, and proxy session design remain outstanding and are prerequisites before `ADMIN_PROXY_ENABLED` can be set in any non-local environment.

6. **`supabase-browser.ts` token validation (partial hardening)** - `getSession()` is used to obtain the local access token, and `getUser(token)` now validates it server-side before forwarding. Real Supabase Auth session validation inside the admin proxy and production CSRF/same-site controls remain outstanding and are prerequisites before `ADMIN_PROXY_ENABLED` can be set in any non-local environment.

---

## 7. Demo Posture

WorkTwin is **credible for a controlled stakeholder demo** with the following conditions:

- Demo must use the dev/local environment or Vercel preview - not the Thumhara Centre production-labelled project with real credentials
- All questions must use the demo identity mode (`PILOT_AUTH_MODE=false`)
- Escalation demos are safe - deterministic, no LLM
- RAG answers from Visitor SOP are available for controlled internal demonstration (AC32 is blocked — QCS content restriction applies from 2026-05-07; must not be used in demo, pilot, or staff-style Ask until written permission obtained; see Section 11)
- Do not demonstrate the admin proxy upload flow - the proxy is disabled and the session/CSRF guards are test-only stubs
- Do not represent the system as production-ready or as having passed any regulatory review

The system demonstrates the intended architecture convincingly: governance gates, fail-closed grounding, escalation short-circuit, source citation. The gaps are infrastructure and compliance, not design.

---

## 8. Current Scores

| Dimension | Score | Rationale |
|---|---|---|
| RAG pipeline | 7 / 10 | End-to-end working in demo mode; not tested under real auth or real org context |
| Governance model | 7 / 10 | Three-gate model solid and enforced; Visitor SOP reviewer metadata gap outstanding |
| UI completeness | 7 / 10 | All staff routes render; admin tooling present but proxy-guarded |
| Test coverage | 6 / 10 | Good backend unit tests; integration tests limited; E2E not passing with real auth |
| Auth readiness | 3 / 10 | Scaffolding complete; E2E proof (4S.88G) not done; mode flag off; middleware incomplete |
| Production readiness | 2 / 10 | Multiple infrastructure blockers; no DPA; auth not activated |
| Privacy / compliance | 3 / 10 | Privacy-by-design in architecture; no DPA; QCS use unconfirmed; no real data review |
| Documentation accuracy | 6 / 10 | Detailed tracking docs; backend README 4I.4/4I.5 stale re AC32; auth-readiness-review partially stale |

---

## 9. Sandbox Auth E2E Plan (4S.90I)

A sandbox Supabase auth E2E setup plan has been created at `docs/4s90i-sandbox-auth-e2e-plan.md`. This plan documents how to prove auth E2E using a separate sandbox Supabase project without touching the production-labelled Thumhara Centre project. It covers sandbox setup, database seeding with fake memberships, the full E2E proof flow, evidence capture, and pass/fail criteria. Next slices: 4S.90J (create sandbox project), 4S.90K (apply migrations and seed), 4S.90L (local auth E2E proof), 4S.90M (RLS), 4S.90N (admin proxy real session guard).

**QCS DB cleanup deliberately deferred:** AC32, CC34, and QQ03 remain in their current dev/internal registry state. They must not be expanded, demoed, staff-served, or used as the future clean corpus. QCS cleanup is a separate future slice, not part of the sandbox auth proof track.

---

## 10. Next Recommended Sequence

### Immediate documentation track

| Slice | Description | File(s) to change | Prerequisite |
|---|---|---|---|
| 4S.89A | This document (done) | `docs/current-state.md` | None |
| 4S.89B | Update docs/README.md index to include current-state entry | `docs/README.md` | None |
| 4S.89C | Align root README with current-state summary | `README.md` | 4S.89B |
| 4S.89D | Update auth-readiness note to reflect 4S.88G blocker status | `docs/auth-readiness-review.md` | None |
| 4S.89E | Update auth-schema note to reflect current migration state | `docs/auth-schema-plan.md` | None |
| 4S.89F | Align external-review-pack and staff-demo walkthrough with current policy and demo posture | `docs/external-review-pack.md`, `docs/staff-demo-walkthrough.md` | 4S.89C |

### Technical backlog

| Item | Description | File(s) to change | Prerequisite |
|---|---|---|---|
| Admin proxy session guard | Replace test-only session stub with real Supabase Auth session validation | `frontend/app/api/admin/[...path]/route.ts` | None |
| Admin proxy CSRF guard | Replace test-only CSRF stub with production same-site/CSRF mechanism | `frontend/app/api/admin/[...path]/route.ts` | None |
| Admin middleware / RBAC | Design and implement admin route protection (admin auth, RBAC, proxy session) — staff routes already covered by 4S.90C | `frontend/middleware.ts`, `frontend/app/api/admin/[...path]/route.ts` | None |
| 4S.88G | Resolve `organisation_memberships` migration blocker (dev Supabase branch or explicit approval) | `backend/sql/008_organisation_memberships.sql` | Decision required |

#### Completed technical backlog items

| Item | Description | Completed in |
|---|---|---|
| Governance gate unit tests | Added `backend/tests/test_governance_gates.py`; 39 tests covering all four gate functions; no runtime code changed | 4S.90A (`336335f`) |
| Expanded pilot-auth middleware staff route coverage | `frontend/middleware.ts` now protects all seven staff routes in pilot-auth mode; added `frontend/tests/middleware-pilot-auth.spec.ts`; focused middleware test: 3 passed, 6 skipped in public-demo mode; `npm run build` passed; full smoke has unrelated/stale failures and was not used as the pass gate for this slice | 4S.90C (`5acf430`) |
| CI baseline (4S.90J) | `.github/workflows/ci.yml` added: GitHub Actions CI runs frontend smoke tests, middleware-pilot-auth tests, and `npm run build` plus backend `pytest` automatically on push and pull request to main. No secrets, no deployment, demo/public-safe mode only. | 4S.90J |
| Sandbox auth E2E proof (4S.90L) | Full local E2E proof using `worktwin-sandbox-dev` sandbox Supabase project: sign-in, JWT validation, membership resolution, positive and negative boundary checks. `/policies` wrong-org boundary gap found and fixed; `_ALLOWED_ORGANISATION_IDS` guard added; regression tests added to `backend/tests/test_policies_identity.py`; `pytest` 117/117. Public auth remains disabled. Checkpoint: `23632a4`. | 4S.90L (`23632a4`) |

### External decisions required

| Item | Owner |
|---|---|
| Obtain written permission confirming QCS licence permits this specific AI/RAG use case (text extraction, storage in WorkTwin/Supabase, chunking, vectorisation, AI-generated answers, staff-facing serving) for AC32, CC34, QQ03 and any other QCS content | Legal / QCS |
| DPA / data processing addendum with Thumhara Centre | Legal |
| PPE Policy PDF delivery | Shagufta |
| CR07 data-protection escalation strategy | Legal / governance |

---

## 11. Do-Not-Touch List

1. **Thumhara Centre Supabase project** - do not run any migrations, schema changes, or data operations against the named production-labelled project until 4S.88G is resolved with a safe dev branch or explicit written approval.

2. **`008_organisation_memberships.sql`** - do not apply to any shared or Thumhara Centre database. The file carries a header warning that must be honoured.

3. **QCS Documentation and third-party copyrighted compliance-library content (including AC32, CC34, QQ03)** - do not ingest, upload, embed, vectorise, answer-debug, or staff-serve any QCS Documentation or third-party copyrighted compliance-library content. Do not expand staff visibility, AI answer access, or embedding scope for existing QCS-derived documents until written permission confirms that the QCS licence (or relevant third-party licence) permits this specific AI/RAG use case. See Section 12.

4. **`PILOT_AUTH_MODE`** - do not set to `true` in any deployed environment until 4S.88G is resolved and E2E auth proof is demonstrated.

5. **`ADMIN_PROXY_ENABLED`** - do not enable in any non-local environment until the session guard and CSRF guard are replaced with real implementations.

6. **The 11-condition staff ask gate** (`_can_use_document_for_staff_ask`, `backend/app/main.py:546-587`) - do not loosen or remove any condition. Every condition exists for a specific governance or safety reason.

7. **Escalation topic patterns** (`_TOPIC_PATTERNS`, `backend/app/main.py`) - do not reduce coverage or remove topics without clinical or safeguarding review. False negatives on escalation topics carry real risk.

8. **Real staff, resident, or service-user personal data** - do not introduce any real personal data into the system until a DPA is in place and an appropriate data environment is confirmed.

9. **Embedding dimension or model** - do not change `text-embedding-3-small` (1,536 dims) without truncating or rebuilding the entire `document_chunks` vector index. Dimension mismatch silently returns wrong results.

10. **`backend/requirements.txt` `openai` entry** - `openai` is pinned to `openai==2.33.0`. Do not change this version without running the full backend test suite and checking for breaking changes in the embeddings and chat completion APIs.

---

## 12. Third-Party Content and QCS Restriction

**Recorded: 2026-05-07**

### Rule

WorkTwin may use organisation-owned, original, commissioned, or properly licensed source material.

WorkTwin must not ingest, upload, embed, vectorise, answer-debug, or staff-serve QCS Documentation or any other third-party copyrighted compliance-library content unless explicit written permission exists for this specific AI/RAG use case.

### Why this restriction exists

Holding a QCS licence permits the licensed organisation to read, use, and follow QCS Documentation for care governance purposes. It does not automatically permit:

- extracting QCS text and storing it in a third-party platform (WorkTwin / Supabase)
- chunking and vectorising QCS content
- using QCS wording to generate AI answers
- surfacing QCS-derived answers to staff via a WorkTwin interface
- using QCS content in any RAG pipeline, admin debug workflow, or demo

Thumhara Centre has a QCS licence; however, WorkTwin must not use QCS Documentation in any AI/RAG workflow unless written permission confirms that the licence permits this specific use case.

This is a content-source restriction, not a WorkTwin architecture failure. The WorkTwin governance model, RAG pipeline, and three-gate document approval process are working as designed. The issue is that QCS-licensed content is not currently confirmed as permitted source material for an AI/RAG workflow.

### What is blocked until written permission is obtained

| Operation | Status |
|-----------|--------|
| Document upload | Blocked for new QCS documents |
| Text extraction | Blocked for new QCS documents |
| Chunking | Blocked for new QCS documents |
| Embeddings / vector search | Blocked for new QCS documents; existing QCS embeddings must not be expanded |
| Admin answer-debug | Blocked — existing QCS answer-debug access must not be expanded |
| Source-grounded staff answers | Blocked — QCS documents must not serve staff answers |
| Staff visibility | Blocked — QCS document sources must not be visible to staff |
| Use in demo / pilot / production | Blocked unless written permission obtained |
| Derivative rewriting preserving protected third-party wording or structure | Blocked |

### Current QCS-derived documents in the registry

AC32, CC34, and QQ03 are QCS-licensed content. Their current states are recorded in Section 5. None of these documents may have their staff visibility, AI answer access, or embedding scope expanded until written permission is obtained.

### Clean corpus direction

WorkTwin's clean-corpus direction is bring-your-own approved documents:

- Thumhara-original documents (procedures, SOPs, and policies owned and written by Thumhara Centre)
- Commissioned or internally produced documents
- Organisation-owned procedures
- Public guidance (e.g. CQC, NHS England, Skills for Care) only where the licence or terms of use explicitly permit the intended use, with attribution where required, checked source-by-source

### What to do next

- Obtain written confirmation from QCS (or via legal review) that the Thumhara Centre QCS licence permits: text extraction, storage in a third-party platform, chunking, vectorisation, AI-generated answers, and staff-facing answer serving.
- Until that confirmation is received, AC32, CC34, and QQ03 are blocked/frozen from further use in WorkTwin AI/RAG workflows (from 2026-05-07). They must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use. Their recorded database flag states are historical/current registry state only — no flags are being changed in this docs-only record. A later data-governance cleanup slice should review whether existing QCS-derived DB flags or embeddings need to be disabled, hidden, archived, or removed.
- For demo and pilot documents, use clean-corpus sources only.
