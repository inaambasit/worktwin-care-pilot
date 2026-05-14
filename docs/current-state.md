# WorkTwin Care Pilot - Current State

> Generated: 2026-05-07. Updated: 2026-05-14. Source of truth through checkpoint `94df6ee` on branch `main`.
> Update this file whenever a milestone changes the status of any item below.
> Do not edit other files to reconcile with this document - fix those files instead.

> **4S.90L (2026-05-08):** Sandbox auth E2E proof passed. Full E2E sign-in, JWT validation, membership resolution, and organisation-boundary enforcement proven locally using the `worktwin-sandbox-dev` sandbox Supabase project. A `/policies` wrong-org boundary gap was found and fixed; regression tests added; `pytest` passed 117/117. Fix committed in `23632a4`. Public auth remains disabled; this is a sandbox-only proof.

> **4S.90M (2026-05-08):** Sandbox RLS baseline proof passed. All six tables (`document_registry`, `document_chunks`, `document_extractions`, `document_embeddings`, `document_audit_events`, `organisation_memberships`) confirmed `rls_enabled=true`, `policy_count=0` in the sandbox. `anon` direct REST access to all six tables returned 401 blocked. Authenticated sandbox staff direct REST access returned 403 blocked. `service_role` direct REST access returned 200 allowed. No RLS policies are yet implemented; current safe posture remains backend-gated with service_role as the controlled gatekeeper. No database changes were made. No code changes were made. Latest checkpoint remains `2506e6c` until this docs commit is made.

> **4S.90M-B (2026-05-08):** RLS strategy decision recorded. WorkTwin will remain backend-gated for the controlled pilot. No direct authenticated Supabase table access or new RLS policies are being introduced. The backend continues to enforce all policy checks (JWT validation, membership lookup, organisation boundary, role checks, governance gates) using `service_role`. Decision doc at `docs/4s90m-b-rls-strategy-decision.md`. Latest checkpoint remains `b33fb71` until this docs commit is made.

> **4S.90N-A (2026-05-08):** Admin proxy real session guard design recorded. Decision: keep the frontend/Vercel environment free of SUPABASE_SERVICE_ROLE_KEY; backend remains the membership and role authority; the proxy will call a future backend /admin/session-check endpoint using the user Supabase access token before forwarding any admin request. Admin proxy remains disabled publicly (ADMIN_PROXY_ENABLED not set). No code or database changes made. Design doc at `docs/4s90n-admin-proxy-real-session-guard-design.md`. Next slice is 4S.90N-B (backend /admin/session-check tests and implementation). Latest checkpoint remains `002a6dd` until this docs commit is made.

> **4S.90N-B (2026-05-09):** Backend `/admin/session-check` endpoint implemented and tested. JWT validation, membership resolution, organisation boundary check, and role guard (organisation_admin, worktwin_dev_admin) are passing. Backend returns a minimal decision response only (allowed, role, active, reason) - no tokens, no document data, no secrets. Admin proxy remains disabled publicly. Checkpoint: `4766805`.

> **4S.90N-C (2026-05-09):** Next.js admin proxy real session-check integration wired. `getAdminProxySessionContext` now validates the real Supabase server session server-side via `getUser()` in non-test mode, then calls the backend `/admin/session-check` endpoint. Test seam preserved for Playwright test mode only. Magic link token hash callback supported. No service_role key in the frontend environment. Admin proxy remains disabled publicly. Checkpoint: `a740daa`.

> **4S.90N-D (2026-05-09):** Sandbox E2E proof passed. Real sandbox organisation_admin session verified end to end: Next.js admin proxy read the real Supabase server session; proxy called backend `/admin/session-check`; backend returned `200 OK` for organisation_admin; proxy reached the final ADMIN_TOKEN guard; with ADMIN_TOKEN intentionally empty, proxy returned `503 not_configured` (expected pass condition). No admin backend forwarding occurred. Admin proxy remains disabled publicly. CSRF guard remains a test stub (4S.90N-E required). Response minimisation outstanding (4S.90N-F required). This does not make production admin access ready. Proof doc at `docs/4s90n-d-admin-proxy-sandbox-e2e-proof.md`. Checkpoint remains `a740daa` (documentation only).

> **4S.90N-E (2026-05-09):** Real same-origin / fetch-metadata CSRF guard implemented and tested. POST and PATCH admin proxy requests now require `Sec-Fetch-Site: same-origin` or a matching `Origin` header; absence of both fails closed. GET remains CSRF-bypassed (read-only). DELETE is method-blocked by the path allowlist before CSRF is checked. Test seam preserved for `NODE_ENV=test` / `PLAYWRIGHT_TEST` only. 13 targeted CSRF tests passed; full E2E public-demo suite 40 passed, 37 skipped, 0 failed. No raw `Origin`, `Referer`, session tokens, or secret values are logged. Admin proxy remains disabled publicly. Admin response minimisation (4S.90N-F) remains outstanding as the next blocker before non-local admin proxy enablement. Proof doc at `docs/4s90n-e-admin-proxy-csrf-proof.md`. Checkpoint: `185b07e`.

> **4S.90N-F (2026-05-09):** Admin response minimisation complete. Three commits across backend and frontend: raw upload exception text no longer leaks from backend upload paths (6416c37); answer-debug no longer returns the real ANSWER_MODEL or estimated_cost_note (80e9124); a per-role strip helper now removes internal document fields, upload internals, registry_warning, and embedding model/token/cost fields from organisation_admin proxy responses before forwarding (02f64ea); worktwin_dev_admin passthrough remains unchanged. Backend pytest 138 passed (F1A), 150 passed (F1B); frontend build passed; admin proxy grep tests 21 passed, 31 skipped, 0 failed; strip helper tests 29 passed. ADMIN_PROXY_ENABLED remains disabled publicly. No production admin rollout is active. Remaining blockers are production rollout controls, public env safety, DPA/content permissions, pilot governance, and final deployment proof. Proof doc at `docs/4s90n-f-admin-response-minimisation-proof.md`. Checkpoint: `02f64ea`.

> **4S.90P (2026-05-09):** Public deployment safety proof passed for current public demo posture. Tested against https://worktwin-care-pilot.vercel.app at commit `3513f2a`. Repo was clean. Admin proxy endpoints (`/api/admin/documents`, `/api/admin/debug/storage-config`) both returned 403 with a safe static message only - `{"detail":"Admin proxy is disabled for this deployment."}`. No admin data, storage configuration, environment details, document data, or backend debug data was exposed. All public demo pages (`/`, `/dashboard`, `/ask`, `/policies`, `/onboarding`, `/scenarios`, `/notes`, `/escalation`, `/login`) returned 200. `ADMIN_PROXY_ENABLED` appears disabled in the public deployment based on runtime behaviour. This does not activate production auth, does not make the product production-ready, and does not substitute for real staff use approval, DPA/content permissions, pilot governance, QCS permissions, or final controlled pilot sign-off. `ADMIN_PROXY_ENABLED` must not be enabled in any non-local environment - do not touch this flag. Proof doc at `docs/4s90p-public-deployment-safety-proof.md`. Latest checkpoint remains `3513f2a` until this docs commit is made.

> **4S.90Q-A (2026-05-09):** QCS wording alignment and Visitor SOP clean-corpus approval -- docs-only slice.
> - QCS wording alignment complete in external-review-pack and staff-demo-walkthrough
> - Visitor SOP clean-corpus approval record created
> - QCS DB/embedding cleanup decision added as deferred backlog
> - docs-only slice
> - no DB, code, env, migration, embedding, or governance flag changes
> - latest checkpoint remains `965f059` until this docs commit is made

> **4S.91B (2026-05-10):** Visitor SOP-only demo journey polished. Dashboard guides the demo path; Ask demo path focuses on Visitor SOP questions; Policy Library fallback is Visitor Sign-In and Identification Procedure only; Access Refusal scenario connects to Visitor SOP and escalation; Escalation uses sample/non-personal contact labels; no real staff names in the staff-facing demo journey. Build passed. Smoke passed 16/16. Live route check: / 200, /dashboard 200, /ask 200, /policies 200, /scenarios/access-refusal 200, /escalation 200. Public admin proxy check: /api/admin/documents 403 - {"detail":"Admin proxy is disabled for this deployment."}. No backend, DB, auth, admin proxy, env, QCS, migration, or embedding changes made. Checkpoint: `ac2d6ac`.

> **4S.91C (2026-05-10):** Documentation and review pack alignment -- docs-only slice. current-state.md, staff-demo-walkthrough.md, external-review-pack.md, and docs/README.md updated to reflect Visitor SOP-only demo journey, checkpoint ac2d6ac, 4S.91B closed, smoke 16/16, live route check results, and public admin proxy 403 confirmation. No backend, DB, auth, admin proxy, env, QCS, migration, or embedding changes made. Latest checkpoint remains `ac2d6ac` until this docs commit is made.

> **4S.95A (2026-05-10):** Pilot identity and environment decision record saved -- docs-only slice. Authoritative pre-migration reference created at `docs/4s95a-pilot-identity-and-environment-decision-record.md` (checkpoint `04fc14c`). Confirms: `organisation_id=thumhara-centre`; new dedicated Supabase pilot project (`worktwin-thumhara-pilot`) required (do not use sandbox or existing production-labelled project); placeholder-only user references in repo; bootstrap admin via Supabase SQL editor after Auth user exists, `created_by` nullable for bootstrap row only; single-org `LIMIT 1` membership lookup acceptable for first pilot only; staff middleware routes confirmed (seven routes); `/admin/:path*` not yet in middleware (must be added in 4S.95E before admin proxy is enabled); admin proxy remains disabled publicly; JWT validation wording clarified (see `backend/app/jwt_auth.py`); DPA/governance prerequisites and real-staff blockers recorded; AC32/CC34/QQ03 remain frozen; Visitor SOP re-upload (not SQL patch) is the preferred pilot path (4S.95G); next-slice sequence 4S.95B–4S.95I defined. No code, SQL, env, migration, or Supabase changes made. Latest checkpoint remains `04fc14c` until this docs commit is made.

> **4S.95B-R (2026-05-10):** Supabase reuse decision recorded — docs-only slice. The original 4S.95A assumption of creating a new Supabase project (`worktwin-thumhara-pilot`) is superseded. Supabase Free tier limits block a third active project. Inspection of the existing `worktwin-care-pilot` project (labelled PRODUCTION in Supabase UI) confirmed: 1 `auth.users` row; 1 `organisation_memberships` row (`demo-org` / `staff` / `active=true`); 15 `document_registry` rows, all under `demo-org`; no `thumhara-centre` rows found. Decision: reuse `worktwin-care-pilot` for controlled pilot infrastructure and isolate all pilot data under `organisation_id=thumhara-centre`. Constraints: `demo-org` rows must remain untouched; QCS/demo documents must not migrate to `thumhara-centre`; bootstrap user must be a new Auth user with exactly one active `thumhara-centre` membership row; do not use the existing `demo-org` staff user; migrations 001–008 do not need re-applying (schema already present — verify before any operations); `ADMIN_PROXY_ENABLED` remains disabled; `NEXT_PUBLIC_PILOT_AUTH_MODE` remains `false`. Next-slice sequence revised in Section 13 of the decision record: 4S.95C (create bootstrap Auth user in existing project), 4S.95D (insert bootstrap `worktwin_dev_admin` membership row for `thumhara-centre`), 4S.95E (prove `/admin/session-check` for bootstrap admin), 4S.95F (add `/admin/:path*` to middleware), 4S.95G (enable admin proxy in controlled pilot deployment), 4S.95H (re-upload Visitor SOP under `thumhara-centre`), 4S.95I (activate pilot auth with test users only). No code, SQL, env, migration, or Supabase changes made. Latest checkpoint remains `cb45480` until this docs commit is made.

> **4S.97J (2026-05-14):** Final full-policy Staff Ask smoke proof passed. Four staff-visible Thumhara policies (TC-POL-001 to TC-POL-004) answered safe day-to-day questions with source-grounded responses. Medication, safeguarding, legal/confidentiality family-sharing, accident/fall and HR/named-staff complaint questions all returned deterministic escalation with zero sources. Checkpoint `0009056`.

> **4S.98A (2026-05-14):** Authenticated backend proof passed. Dedicated non-real staff test user (`inaam.basit+worktwin-staff-test@gmail.com`) with `organisation_id=thumhara-centre`, `role=staff`, `active=true` accessed `/policies` and `/ask` using a real Supabase Bearer token. 9/9 authenticated Staff Ask smoke proof passed — four positive source-grounded answers, five high-risk escalations with zero sources. Checkpoint `38d2d7a`.

> **4S.98B (2026-05-14):** Local frontend auth/session proof passed. With `NEXT_PUBLIC_PILOT_AUTH_MODE=true` locally only, logged-out protected routes redirected to `/login` with safe `next` paths, magic-link callback created a browser session, `/policies` and `/ask` worked through the browser session, medication escalation remained intact, and logout cleared protected access. Public/live staff auth rollout remains disabled. Checkpoint `241eecc`.

> **Trusted-user pilot pack (2026-05-14):** `docs/thumhara-trusted-user-pilot-pack.md` created and committed at `7100135`. Required before any 3–5 named trusted-user access is granted. Covers safe-use rules, prohibited data, escalation boundaries, feedback route, incident process, access checklist and go/no-go position.

> **Docs index alignment (2026-05-14):** `docs/README.md` aligned with current pilot state at `c55d951`. Status note, current-state table and auth section intro updated to reflect current controlled proof position.

> **Pilot shell wording polish (2026-05-14):** Shared staff/admin shell wording polished at checkpoint `94df6ee`. "Demo User" became "Pilot User"; "Care Worker" became "Staff pilot view"; "Demo Mode — Sample Data Only" became "Controlled Pilot — No Real Data"; "Demo Mode — Switch View" became "Host View — Switch Area". Frontend build passed and full smoke suite passed 20/20. No backend, auth, API, admin proxy, RAG, policy, env, SQL or data changes.

---

## 1. Current Checkpoint

| Item | Value |
|---|---|
| Commit | `94df6ee` |
| Branch | `main` |
| Repo path | `C:\Projects\worktwin-care-pilot\worktwin-care-pilot-starter` |
| Backend | FastAPI / `backend/app/main.py` |
| Frontend | Next.js 14 / `frontend/` |
| Database | Supabase / PostgreSQL + pgvector — reused `worktwin-care-pilot` project with `thumhara-centre` isolation for controlled proof; no real service-user or confidential personal data |
| Deployment | Frontend -> Vercel / Backend -> Render |

---

## 2. What WorkTwin Is Right Now

WorkTwin Care Pilot is a controlled prototype of a privacy-first AI staff support and policy assistant for regulated UK care settings. It is **not production-ready** and is **not approved for real staff use or live operational deployment**.

The system currently demonstrates:

- A staff question portal (`/ask`) that routes questions through a source-grounded RAG pipeline using approved policy documents
- A four-policy Thumhara staff-visible set (TC-POL-001 to TC-POL-004) proven locally in controlled Staff Ask proof, real backend auth proof, and local frontend auth/session proof
- Deterministic escalation for high-risk topic categories (safeguarding, whistleblowing, medication, wellbeing, HR, legal/confidentiality, and accident/fall concerns) — no LLM involved in those paths
- A three-gate governance model controlling which documents reach staff, embeddings, and AI answers independently
- An admin document registry with upload, embedding generation, vector search, and answer-debug tooling
- Supabase Auth, JWT validation, membership resolution and browser Bearer forwarding have passed controlled local proof; public/live rollout is not enabled

The pilot client is **Thumhara Centre**. No real staff, service-user, resident, care-plan, HR, safeguarding case-note or named complaint personal data has been introduced. No real service-user, HR, safeguarding, medication, complaint or confidential personal data should be entered. Some controlled internal policy testing has used Thumhara Centre/QCS policy documents under governance restrictions. A content-source review completed on 2026-05-07 established a formal QCS and third-party content restriction; see Section 11.

Public/live staff rollout remains blocked. Trusted-user access (3–5 named users) is conditional on pilot-pack review and named-user approval per `docs/thumhara-trusted-user-pilot-pack.md`.

---

## 3. What Is Currently Working

### Staff-facing surfaces
- `/ask` — proven with the four-policy Thumhara staff-visible set in controlled local proof, real backend auth proof, and local frontend auth/session proof; returns source-grounded answers from approved documents; escalation short-circuit before any LLM call
- `/policies` — lists approved, role-visible policy documents; proven in controlled local proof and authenticated backend/frontend proof
- `/dashboard`, `/notes`, `/escalation`, `/onboarding`, `/scenarios` — all load and render
- Escalation topic detection — seven pattern groups (safeguarding, whistleblowing, medication, wellbeing, HR, legal/confidentiality, accident/incident/fall), short-circuits to deterministic safe response before any LLM call

### Backend pipeline (end-to-end, controlled local and auth proof)
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

### Auth implementation and controlled proof
- JWT validation supporting ES256 (JWKS) and HS256 — `backend/app/jwt_auth.py`
- Membership resolution from `organisation_memberships` table — `backend/app/membership.py`
- Bearer token forwarding from frontend to backend — `frontend/lib/api.ts`
- Supabase SSR client, login/callback/logout routes
- Backend unauthenticated `/policies` and `/ask` fail closed with HTTP 401 when `PILOT_AUTH_MODE=true`
- Real Supabase staff Bearer token accepted for `/policies` and `/ask` in controlled local proof (4S.98A)
- Browser session proof completed locally: logged-out routes redirect to `/login`, magic-link callback creates session, `/policies` and `/ask` work through the browser session, logout clears protected access (4S.98B)
- Public/live staff auth rollout remains disabled; no real staff have been granted access

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
- Playwright smoke tests (16 tests, all major staff routes)
- Admin proxy spec (30+ tests, 5 describe blocks)

---

## 4. What Is Deliberately Disabled or Not Ready

| Item | Status | Why |
|---|---|---|
| `PILOT_AUTH_MODE` | Local backend proof passed with `true` (4S.98A, 4S.98B); public/live rollout not enabled | Local controlled proof with `PILOT_AUTH_MODE=true` is complete and documented. Public/live staff auth rollout remains disabled and is not approved without a dedicated rollout decision, named-user plan, pilot-pack acceptance, governance approval and deployment proof |
| Admin proxy | Disabled (`ADMIN_PROXY_ENABLED` not set) | Session guard is now real (4S.90N-C); CSRF guard is now a real same-origin / fetch-metadata guard (4S.90N-E); admin response minimisation complete (4S.90N-F); remaining blockers are production rollout controls, public env safety, DPA/content permissions, pilot governance, and final deployment proof |
| Session guard | Real (4S.90N-C) | `getAdminProxySessionContext` validates real Supabase server session via `getUser()` and calls backend `/admin/session-check`; test seam preserved for Playwright test mode only |
| CSRF guard | Real same-origin / fetch-metadata guard (4S.90N-E) | POST and PATCH require `Sec-Fetch-Site: same-origin` or matching `Origin`; GET is CSRF-bypassed; DELETE is method-blocked before CSRF; fails closed if neither header is present |
| Real staff use | Not approved | Trusted-user pilot pack exists (`docs/thumhara-trusted-user-pilot-pack.md`); access is conditional on named-user approval, briefing, safe-use rules, feedback route, incident process, and applicable DPA/governance/content permissions/final sign-off |
| `008_organisation_memberships.sql` / membership schema | Schema present in the reused project for controlled proof; dedicated non-real staff test membership exists | Do not re-run or alter migrations without a dedicated controlled migration slice and explicit approval. The test membership (`inaam.basit+worktwin-staff-test@gmail.com`, `thumhara-centre`, `role=staff`) is for controlled proof only |
| `middleware.ts` route protection | Staff routes proven in local frontend auth proof (4S.98B) | Local proof confirmed `/dashboard`, `/ask`, `/policies`, and `/admin` all redirect to `/login` when `NEXT_PUBLIC_PILOT_AUTH_MODE=true`; public demo behaviour remains fail-open when the flag is not `true`; public/live rollout remains disabled |
| `supabase-browser.ts` token extraction | Hardened (complete via 4S.90N-C) | `getSession()` obtains the local token; `getUser(token)` validates it server-side before forwarding; admin proxy real Supabase session validation complete (4S.90N-C); public pilot auth remains disabled; full production rollout remains blocked pending production controls, DPA/content permissions, pilot governance, and final sign-off |
| Public deployment safety (4S.90P) | Passed - current demo posture | Admin proxy disabled in public deployment; admin and debug endpoints return 403 with safe static message; no data exposed; all public demo pages load; does not activate production auth; does not satisfy full production rollout prerequisites |

---

## 5. Current Policy and Document State

> **Minimum Safe Thumhara staff-visible set (2026-05-14):** The following four Thumhara-owned policies have passed controlled local Staff Ask proof, real backend auth proof (4S.98A), and local frontend auth/session proof (4S.98B). They are the current approved staff-visible set for controlled pilot proof only. Public/live staff rollout remains blocked.
> - TC-POL-001 Visitor Sign-In and Identification
> - TC-POL-002 Mobile Phone and Portable Device Use
> - TC-POL-003 Confidentiality and Information Handling
> - TC-POL-004 Infection Prevention and Basic Hygiene

> **Note on QCS-derived document DB flag state (AC32, CC34, QQ03):** The table below records historical/current database flag state as it exists in the registry. These flags have not been changed in this slice. However, AC32, CC34, and QQ03 are frozen/blocked from 2026-05-07 by the QCS content restriction (see Section 11). The "Staff-visible" and "AI answer" states shown for AC32 reflect the historical DB flags set during controlled internal testing before this restriction was formally recorded — they do not represent an approved continuing state. A future data-governance cleanup slice should review whether existing QCS-derived DB flags or embeddings need to be disabled, hidden, archived, or removed.

| Document | Lane | Uploaded | Extracted | Embedded | Staff-visible | AI answer | Notes |
|---|---|---|---|---|---|---|---|
| Visitor Sign-In and Identification Procedure | A | Yes | Yes | Yes (indexed) | Yes | Yes | Clean baseline policy proof; approved for staff-visible pathway testing |
| AC32 Mobile Phone and Portable Device Use Policy | A - controlled internal only | Yes | Yes | Yes (indexed) | Yes - controlled internal only | Yes - controlled internal only | BLOCKED (2026-05-07) — QCS content restriction applies; no further expansion of embedding, AI answers, or staff serving until written permission obtained; see Section 11 |
| CC34 Infection Control Policy and Procedure | B -> A candidate | Yes | Yes | Yes (indexed) | No | Admin answer-debug only | BLOCKED (2026-05-07) — QCS content restriction applies; extended admin-only QA complete; not for staff visibility or further AI-RAG expansion until written permission obtained; see Section 11 |
| QQ03 Complaints, Suggestions and Compliments Policy | B | Yes | Yes | Yes (indexed) | No | Admin answer-debug only | BLOCKED (2026-05-07) — QCS content restriction applies; not for staff visibility or further AI-RAG expansion until written permission obtained; see Section 11 |
| CR100 Safeguarding Adults Policy and Procedure | C - human-only | Yes (human-only reference) | Yes | No | No | No - human escalation required | Not approved for embedding or AI answers; must trigger human escalation |
| PM11 Raising Concerns / Freedom to Speak Up / Whistleblowing | C - human-only | Yes (human-only reference) | Yes | No | No | No - human escalation required | Not approved for embedding or AI answers; must trigger human escalation |
| PPE Policy | Pending | No | No | No | No | No | PDF not yet received |
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

**Remaining blockers before 3–5 trusted-user access:**

1. Review and accept `docs/thumhara-trusted-user-pilot-pack.md` with Thumhara Centre leadership.
2. Decide and confirm named test users.
3. Brief each user and confirm safe-use boundaries, prohibition on real personal/service-user data, escalation rules, feedback route, and incident process.
4. Agree access removal plan and start/end dates.
5. Final leadership and governance approval before granting access.

**Wider/live rollout and production remain blocked:**

6. **Third-party content and QCS restriction (recorded 2026-05-07)** — WorkTwin must not ingest, upload, embed, vectorise, answer-debug, or staff-serve QCS Documentation or any other third-party copyrighted compliance-library content unless explicit written permission exists for this specific AI/RAG use case. AC32, CC34, and QQ03 are QCS-licensed content. Thumhara Centre has a QCS licence; however, WorkTwin must not use QCS Documentation in any AI/RAG workflow unless written permission confirms that the licence permits this specific use case. No further expansion of staff visibility, AI answer access, or embedding scope for these documents until written permission is obtained. This is a content-source restriction, not a WorkTwin architecture failure. See Section 12.

7. **No DPA or data processing agreement** — WorkTwin does not yet have a signed DPA or data processing addendum covering the Thumhara Centre relationship. Required before any real personal data is introduced.

8. **Admin routes and production admin rollout** — Admin routes (`/admin/*`) are governed separately by the admin proxy session guard, CSRF guard, allowlist, role checks, and response minimisation. `ADMIN_PROXY_ENABLED` must not be enabled in any non-local environment until production rollout controls, public env safety, DPA/content permissions, pilot governance, and final deployment proof are complete. Admin proxy session guard (4S.90N-C/D), CSRF guard (4S.90N-E), and admin response minimisation (4S.90N-F) are complete locally.

9. **Production deployment, monitoring, retention/deletion and incident process** — Not yet designed or proven for live operational use. Required before wider rollout.

---

## 7. Demo Posture

WorkTwin is **credible for a controlled stakeholder demo** with the following conditions:

- Demo and pilot proof must use controlled local or preview environments, controlled test identities, and `thumhara-centre` isolation only. Do not use real staff credentials, real service-user data, HR data, safeguarding records, medication records, complaint details or confidential personal information.
- Escalation demos are safe — deterministic, no LLM
- RAG answers from the four Thumhara-owned staff-visible policies (TC-POL-001 to TC-POL-004) are available for controlled internal demonstration; AC32 is blocked — QCS content restriction applies from 2026-05-07; must not be used in demo, pilot, or staff-style Ask until written permission obtained; see Section 11
- Do not demonstrate the admin proxy upload flow — the proxy is disabled publicly and production rollout controls are outstanding
- Do not represent the system as production-ready or as having passed any regulatory review

**Historical milestone (4S.91B, checkpoint `ac2d6ac`):** The Visitor SOP-only demo journey was polished as an earlier controlled milestone — Dashboard guided the demo path; Ask focused on Visitor SOP questions; Policy Library fallback was Visitor Sign-In only; Escalation used sample/non-personal contact labels; smoke passed 16/16; public admin proxy returned 403. This was a historical controlled demo posture and is no longer the current controlled proof position.

**Current controlled proof position (from 4S.97J onwards):** The current local controlled pilot proof covers a four-policy Thumhara staff-visible set (TC-POL-001 to TC-POL-004), real backend auth proof, and local frontend auth/session proof. Public/live deployment does not have staff auth enabled. Public deployment safety confirmed at 4S.90P: admin proxy disabled; admin and debug endpoints return 403 with safe static message; no data exposed.

The system demonstrates the intended architecture convincingly: governance gates, fail-closed grounding, escalation short-circuit, source citation. The remaining gaps are pilot governance, DPA, production controls, and content permissions — not architecture or core safety design.

---

## 8. Current Scores

| Dimension | Score | Rationale |
|---|---|---|
| RAG pipeline | 8 / 10 | End-to-end working; four-policy Thumhara set proven under real auth and org context locally |
| Governance model | 8 / 10 | Three-gate model solid and enforced; four-policy staff-visible set proven; accident/fall escalation added |
| UI completeness | 7.5 / 10 | All staff routes render; shared pilot shell wording has been polished for stakeholder review; admin tooling remains proxy-guarded; final walkthrough-specific page wording may still need review |
| Test coverage | 7 / 10 | Good backend unit/integration tests; 248 passing; E2E now proven locally with real auth |
| Controlled trusted-user pilot readiness | 9 / 10 | Four-policy set proven; auth/session proven locally; pilot pack created; remaining step is named-user approval and access setup |
| Production / live operational readiness | NO-GO | No DPA; QCS use unconfirmed for AI/RAG; production deployment, monitoring, retention/deletion and incident process not proven; not production-ready |
| Privacy / compliance | 4 / 10 | Privacy-by-design in architecture; no DPA; QCS use unconfirmed; real data must not be entered |
| Documentation accuracy | 8 / 10 | Pilot scope, pilot pack, proof records and docs index aligned at `94df6ee` |

---

## 9. Sandbox Auth E2E Plan (4S.90I)

A sandbox Supabase auth E2E setup plan has been created at `docs/4s90i-sandbox-auth-e2e-plan.md`. This plan documents how to prove auth E2E using a separate sandbox Supabase project without touching the production-labelled Thumhara Centre project. It covers sandbox setup, database seeding with fake memberships, the full E2E proof flow, evidence capture, and pass/fail criteria. Next slices: 4S.90J (create sandbox project), 4S.90K (apply migrations and seed), 4S.90L (local auth E2E proof), 4S.90M (RLS), 4S.90N (admin proxy real session guard).

**QCS DB cleanup deliberately deferred:** AC32, CC34, and QQ03 remain in their current dev/internal registry state. They must not be expanded, demoed, staff-served, or used as the future clean corpus. QCS cleanup is a separate future slice, not part of the sandbox auth proof track.

---

## 10. Next Recommended Sequence

### Immediate next steps (trusted-user access path)

| Step | Description |
|---|---|
| 1 | Review `docs/current-state.md` and `docs/thumhara-trusted-user-pilot-pack.md` with Thumhara Centre leadership |
| 2 | Decide named trusted users (3–5); confirm with pilot lead |
| 3 | Confirm access method and account setup for each named user |
| 4 | Brief each user; confirm they understand safe-use rules, prohibited data, and escalation boundaries |
| 5 | Run at least one supervised walkthrough before unsupervised access |
| 6 | Run a quick visual walkthrough of the polished pilot shell and key staff pages before stakeholder-facing use. |
| 7 | Collect structured feedback from each user after a defined test period |
| 8 | Do not add more policies until the trusted-user rollout controls are accepted and proven |

### Historical documentation track (completed)

| Slice | Description | Completed |
|---|---|---|
| 4S.89A–F | Current-state, README, auth-readiness, external-review-pack, staff-demo-walkthrough alignment | Done |
| 4S.90Q-A | QCS wording alignment and Visitor SOP clean-corpus approval | Done |
| 4S.91C | Documentation alignment for Visitor SOP-only demo journey, checkpoint `ac2d6ac` | Done (historical milestone) |
| 4S.95A/B-R | Pilot identity and Supabase reuse decision | Done |
| 4S.97J–4S.98B | Full-policy smoke proof, backend auth proof, frontend auth/session proof | Done |
| Trusted-user pilot pack | `docs/thumhara-trusted-user-pilot-pack.md` | Done (`7100135`) |
| Docs index alignment | `docs/README.md` updated | Done (`c55d951`) |

### Technical backlog

| Item | Description | Notes |
|---|---|---|
| Admin proxy production rollout | Enable `ADMIN_PROXY_ENABLED` in a controlled non-local environment | Blocked pending production rollout controls, DPA/content permissions, pilot governance, deployment proof |
| QCS DB/embedding cleanup | Review AC32, CC34, QQ03 flags and embeddings | Blocked on written QCS permission decision |

#### Completed technical backlog items

| Item | Description | Completed in |
|---|---|---|
| Governance gate unit tests | Added `backend/tests/test_governance_gates.py`; 39 tests covering all four gate functions; no runtime code changed | 4S.90A (`336335f`) |
| Expanded pilot-auth middleware staff route coverage | `frontend/middleware.ts` now protects all seven staff routes in pilot-auth mode; added `frontend/tests/middleware-pilot-auth.spec.ts`; focused middleware test: 3 passed, 6 skipped in public-demo mode; `npm run build` passed; full smoke has unrelated/stale failures and was not used as the pass gate for this slice | 4S.90C (`5acf430`) |
| CI baseline (4S.90J) | `.github/workflows/ci.yml` added: GitHub Actions CI runs frontend smoke tests, middleware-pilot-auth tests, and `npm run build` plus backend `pytest` automatically on push and pull request to main. No secrets, no deployment, demo/public-safe mode only. | 4S.90J |
| Sandbox auth E2E proof (4S.90L) | Full local E2E proof using `worktwin-sandbox-dev` sandbox Supabase project: sign-in, JWT validation, membership resolution, positive and negative boundary checks. `/policies` wrong-org boundary gap found and fixed; `_ALLOWED_ORGANISATION_IDS` guard added; regression tests added to `backend/tests/test_policies_identity.py`; `pytest` 117/117. Public auth remains disabled. Checkpoint: `23632a4`. | 4S.90L (`23632a4`) |
| Backend `/admin/session-check` endpoint (4S.90N-B) | `GET /admin/session-check` implemented; JWT validation, membership resolution, organisation boundary check, and role guard (organisation_admin, worktwin_dev_admin) passing; returns minimal decision response only (allowed, role, active, reason); no tokens, no document data, no secrets in response. | 4S.90N-B (`4766805`) |
| Admin proxy real session-check integration (4S.90N-C) | `getAdminProxySessionContext` now validates the real Supabase server session server-side via `getUser()` in non-test mode, then calls backend `/admin/session-check`; test seam preserved for Playwright only; magic link token hash callback supported; no service_role key in frontend. | 4S.90N-C (`a740daa`) |
| Admin proxy sandbox E2E proof (4S.90N-D) | Real sandbox organisation_admin session proven end to end; backend `/admin/session-check` returned `200 OK`; proxy reached ADMIN_TOKEN guard; `503 not_configured` with intentionally empty ADMIN_TOKEN (expected pass); no admin forwarding; admin proxy remains disabled publicly; documentation only. | 4S.90N-D (documentation only) |
| Admin proxy CSRF / same-origin guard (4S.90N-E) | Real same-origin / fetch-metadata CSRF guard implemented in `frontend/app/api/admin/[...path]/route.ts`; POST and PATCH protected; GET CSRF-bypassed; DELETE method-blocked before CSRF; fails closed if no valid header present; 13 targeted CSRF tests passed; full E2E public-demo suite 40 passed, 37 skipped, 0 failed. | 4S.90N-E (`185b07e`) |
| Admin response minimisation (4S.90N-F) | Three commits: upload error paths return safe strings only (6416c37, pytest 138 passed); answer-debug suppresses ANSWER_MODEL and estimated_cost_note (80e9124, pytest 150 passed); per-role strip helper removes internal document fields, upload internals, registry_warning, and embedding model/token/cost fields from organisation_admin proxy responses; worktwin_dev_admin passthrough unchanged; frontend build passed; admin proxy grep tests 21 passed, 31 skipped, 0 failed; strip helper tests 29 passed. | 4S.90N-F (`02f64ea`) |
| Visitor SOP-only demo journey (4S.91B) | Dashboard guides the demo path; Ask demo path focuses on Visitor SOP questions; Policy Library fallback is Visitor Sign-In and Identification Procedure only; Access Refusal scenario connects to Visitor SOP and escalation; Escalation uses sample/non-personal contact labels; no real staff names in the staff-facing demo journey; build passed; smoke 16/16; live route check passed; public admin proxy 403 confirmed. No backend, DB, auth, admin proxy, env, QCS, migration, or embedding changes made. | 4S.91B (`ac2d6ac`) |
| Pilot shell wording polish | Shared shell wording changed from generic demo labels to controlled pilot wording; frontend build passed; full smoke suite 20/20 passed | `94df6ee` |

### QCS data-governance cleanup (deferred -- do not act without explicit approval)

The following DB and embedding cleanup actions are identified but not taken in this docs-only slice.
No DB action, migration, or embedding change is permitted without a dedicated controlled slice and
explicit sign-off.

| Item | Description | Blocked on |
|---|---|---|
| AC32 DB flag cleanup | Consider setting approved_for_staff_visibility = false and approved_for_source_grounded_answers = false for AC32; current flags are historical/current registry state and do not represent approved continuing use | Written QCS permission decision (permit or deny) |
| CC34 / QQ03 answer-debug flag review | Consider clearing approved_for_source_grounded_answers for CC34 and QQ03; staff visibility is already false; answer-debug access is already gated | Written QCS permission decision |
| QCS-derived embedding archive / removal | If QCS permission is denied: consider archiving or removing document_chunks and document_embeddings rows for AC32, CC34, QQ03; removes QCS-derived content from the vector store entirely | Written QCS permission denial confirmed |
| QCS-derived embedding retain | If QCS permission is granted: run clean-corpus approval templates for AC32, CC34, QQ03 and clear the content restriction | Written QCS permission granted confirmed |

> Visitor SOP clean-corpus approval record created: docs/visitor-sop-corpus-approval.md (2026-05-09).
> Visitor Sign-In and Identification Procedure is confirmed clean-corpus -- not QCS-derived; Lane A;
> all governance flags set correctly; approved for controlled internal demo use.

### External decisions required

| Item | Owner |
|---|---|
| Obtain written permission confirming QCS licence permits this specific AI/RAG use case (text extraction, storage in WorkTwin/Supabase, chunking, vectorisation, AI-generated answers, staff-facing serving) for AC32, CC34, QQ03 and any other QCS content | Legal / QCS |
| DPA / data processing addendum with Thumhara Centre | Legal |
| PPE Policy PDF delivery | Care provider |
| CR07 data-protection escalation strategy | Legal / governance |

---

## 11. Do-Not-Touch List

1. **Thumhara Centre Supabase project** — do not run any migrations, schema changes, or data operations against the named project without a dedicated controlled migration slice and explicit written approval. The membership schema is present and a controlled proof membership row exists; do not alter or add to this without a deliberate slice.

2. **`008_organisation_memberships.sql`** — do not re-apply or alter without a dedicated controlled slice and explicit approval. The schema is already present in the reused project. Do not add new membership rows without explicit approval.

3. **QCS Documentation and third-party copyrighted compliance-library content (including AC32, CC34, QQ03)** - do not ingest, upload, embed, vectorise, answer-debug, or staff-serve any QCS Documentation or third-party copyrighted compliance-library content. Do not expand staff visibility, AI answer access, or embedding scope for existing QCS-derived documents until written permission confirms that the QCS licence (or relevant third-party licence) permits this specific AI/RAG use case. See Section 12.

4. **`PILOT_AUTH_MODE`** — local controlled proof with `PILOT_AUTH_MODE=true` has passed and is documented (4S.98A, 4S.98B). Do not enable in any public/live/staff rollout environment without a dedicated controlled rollout decision, named-user plan, pilot-pack acceptance, governance approval, and deployment proof.

5. **`ADMIN_PROXY_ENABLED`** - do not enable in any non-local environment until all production rollout controls in Section 6 are satisfied. The session guard (4S.90N-C), CSRF guard (4S.90N-E), and admin response minimisation (4S.90N-F) are now complete. Remaining prerequisites are production rollout controls, public environment safety, DPA/content permissions, pilot governance, and final deployment proof.

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
