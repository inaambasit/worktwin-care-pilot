# Codex Strict Technical Review

Reviewer: Codex
Date: 2026-05-03
Milestone: 4S.76
Checkpoint reviewed: 4075a16
Source prompt: docs/external-review-pack.md, section "Codex-Style Strict Technical Review Prompt"

This is a review-only document. No application code, backend code, frontend code, environment files, SQL files, README files, governance flags, API behaviour or RAG behaviour were changed.

## Overall technical readiness rating

5 / 10

WorkTwin Care Pilot is a credible controlled-demo prototype with a much stronger privacy and governance posture than a typical early RAG app. The current code shows meaningful progress: admin pages are disabled by default, the admin bearer token is kept server-side, staff Ask uses server-derived pilot context, staff policy records are minimised, high-risk topics short-circuit before retrieval, and staff responses strip raw chunks and internal IDs.

It is still not ready for real staff or real documents. The critical gap is not the RAG logic itself; it is the absence of real authentication, session-derived identity, role-based access control and hardened admin routing. The safest interpretation is: suitable for guided internal technical review, not suitable for a live Thumhara pilot, and not suitable for public free exploration with admin features enabled.

## Evidence checked

- docs/external-review-pack.md
- docs/reviews/claude-code-engineering-review.md
- README.md
- backend/README.md
- frontend/README.md
- backend/app/main.py
- backend/requirements.txt
- backend/sql/001_document_registry.sql through backend/sql/007_document_governance.sql
- frontend/package.json
- frontend/app/api/admin/[...path]/route.ts
- frontend/components/AdminDemoDisabled.tsx
- frontend/components/AppLayout.tsx
- frontend/lib/api.ts
- frontend/lib/types.ts
- frontend/app/ask/page.tsx
- frontend/app/policies/page.tsx
- frontend/app/admin/*
- .env.example

No dependency audit, npm build, test run, migration, network check or live deployment check was run. Dependency and deployment observations below are based only on repository files.

## Top 5 technical strengths

1. Staff Ask has a strict backend safety path.
   - backend/app/main.py derives pilot organisation, user and role server-side in `_get_pilot_staff_context`.
   - `AskRequest` currently accepts only `question` with a 500 character max.
   - High-risk topics are classified before retrieval or LLM calls.
   - Staff audit events store query length and metadata, not raw query text or user ID.

2. Staff response minimisation is substantially improved.
   - `Source` exposes document name, optional section/page and source label only.
   - The staff Ask response maps sources without document IDs, chunk IDs, similarity scores, governance flags, storage keys or source previews.
   - This aligns well with the no raw chunks and no staff-facing sensitive metadata rule.

3. Policy Library is currently tenant-scoped and role-filtered in the backend.
   - `/policies` passes the server-derived organisation ID into `_list_registry_records`.
   - It filters through `_can_show_document_to_staff`.
   - It then filters by server-derived role or `All Staff`.
   - `StaffPolicyRecord` is a minimised DTO and does not expose storage keys, access roles or governance fields.

4. Admin demo exposure is reduced by default.
   - Admin pages currently render `AdminDemoDisabled`.
   - The admin proxy is disabled unless `ADMIN_PROXY_ENABLED=true`.
   - `NEXT_PUBLIC_ADMIN_DEMO_ENABLED=false` is documented in `.env.example`.
   - `ADMIN_TOKEN` is server-only in the Next.js proxy and is not read from browser JavaScript.

5. RAG and document governance show real safety thinking.
   - Staff Ask requires staff visibility, source-grounded-answer approval, embedding approval, governance reviewer metadata, indexed embeddings and role match.
   - Sensitive or escalation-required documents are excluded from staff visibility and staff Ask.
   - Upload defaults new documents to not reviewed, dummy, not approved for embedding, not approved for staff visibility and not approved for source-grounded answers.
   - Citation validation now checks for visible source labels before marking an answer as `source_grounded`.

## Top 5 technical weaknesses or gaps

1. There is still no real authentication or RBAC.
   - Staff identity is still pilot environment context, not a verified user session.
   - Admin API access is protected by bearer token and a proxy kill-switch, but not by an admin user session.
   - This blocks real staff, real documents and any public deployment where admin proxy access is enabled.

2. The admin proxy is safe only while disabled.
   - `frontend/app/api/admin/[...path]/route.ts` forwards arbitrary admin paths to the backend when `ADMIN_PROXY_ENABLED=true`.
   - It has no session check, CSRF check, path allowlist, method allowlist beyond GET/POST/PATCH exports, or per-route policy.
   - If enabled on a public frontend, any visitor who can reach `/api/admin/...` can trigger admin operations through the server token.

3. Frontend and backend Ask contracts are out of sync.
   - Backend `AskRequest` accepts only `question`.
   - `frontend/lib/api.ts` still sends `organisation_id`, `user_id` and `user_role`.
   - Pydantic currently ignores extra fields by default, so this is not necessarily breaking at runtime, but it is a stale contract that can mislead future contributors and reviewers.
   - `frontend/lib/types.ts` also lacks backend risk categories such as `policy`, `compliance` and `vertical_sensitive`.

4. Upload safety is not strong enough for real documents.
   - Upload accepts PDFs, checks extension, magic bytes and 10 MB size, and rejects prohibited filename/title patterns.
   - Personal-data scanning is pattern-based and uses the 2,000 character preview, not the whole extracted text.
   - Extraction and storage errors can return exception text to admin clients.
   - Upload responses include `storage_key` and `extracted_text_preview`; this is acceptable only behind real admin auth.

5. Operational readiness is thin.
   - Rate limiting is in-memory only and resets on process restart.
   - No backend tests were found.
   - The backend remains a large single-file service containing config, models, routing, upload, governance, RAG and audit logic.
   - Logging is mostly silent fail-safe behaviour and audit events; there is no structured application logging, trace ID, alerting or operational runbook in the repo.
   - `openai` is unpinned in backend/requirements.txt.

## Single highest-risk technical issue

The highest-risk issue is the lack of real authentication and RBAC, especially around admin operations.

The current admin story is acceptable only if admin pages and the proxy stay disabled in public deployments. The bearer token is hidden from the browser, which is good, but the proxy itself becomes a privileged backend-to-backend tunnel when enabled. Without an authenticated admin session and a route allowlist, the proxy can turn any public frontend visitor into an admin API caller.

For staff routes, the current pilot context is server-derived, which is safer than browser-supplied identity. It is still not a real identity model. It cannot distinguish staff members, enforce organisation membership, revoke users, or prove that the person asking is an authorised Thumhara staff member.

This blocks any real pilot.

## Quickest improvement available

The quickest high-value improvement is to align the frontend Ask API contract with the backend:

1. Remove `organisation_id`, `user_id` and `user_role` from the frontend `AskRequest` type and payload.
2. Add backend risk categories to the frontend `RiskCategory` type.
3. Keep staff identity explicitly documented as server-derived pilot context until auth is built.

This is small, low-risk and removes a misleading trust signal. It does not solve auth, but it stops future work from accidentally reintroducing browser-controlled identity.

The quickest security improvement before any public admin access is to keep `ADMIN_PROXY_ENABLED=false` and add a hard path allowlist before turning it on anywhere outside a developer-controlled environment.

## Must-fix before a real pilot

1. Add real staff authentication.
   - Use a verified session, not request body or environment-only identity.
   - Derive organisation ID, user ID and role server-side from the session.
   - Block `/ask` and `/policies` for unauthenticated users in a real pilot environment.

2. Add real admin authentication and RBAC.
   - The Next.js admin proxy must validate an authenticated admin session before forwarding.
   - Admin roles must be enforced server-side, not only hidden by UI.
   - Add path and method allowlists for the proxy.
   - Add CSRF protection or same-site session controls before accepting state-changing admin requests.

3. Keep admin routes and debug routes disabled by default in public deployments.
   - `AdminDemoDisabled` and `ADMIN_PROXY_ENABLED=false` are good defaults.
   - Do not enable the proxy on a public URL until admin auth exists.

4. Harden CORS for deployment.
   - `ALLOWED_ORIGINS` must be explicit per environment.
   - `allow_credentials=True`, `allow_methods=["*"]` and `allow_headers=["*"]` are too broad for a real pilot.
   - The repository documents production origin config, but this must be enforced in deployment.

5. Harden upload before real documents.
   - Scan full extracted text, not only preview text.
   - Treat DLP as advisory; require human review before any document can become real, embedded, staff-visible or answerable.
   - Avoid returning raw storage or extraction exception text.
   - Consider virus/malware scanning, encrypted/scanned PDF handling and stricter metadata stripping.

6. Fix unsourced answer fallback behaviour.
   - backend/app/main.py now validates visible citations, which is good.
   - However, if citation validation fails, the endpoint still returns the generated `answer_text` with `allowed_to_answer=false` and `requires_escalation=true`.
   - Safer behaviour is to discard the generated text and return the standard fallback when confidence is not `source_grounded`.

7. Add backend tests for safety gates.
   - Test high-risk short-circuit before retrieval.
   - Test staff source response minimisation.
   - Test `/policies` organisation scoping and role filtering.
   - Test staff Ask eligibility gates.
   - Test upload defaults and governance update blocking.

8. Replace in-memory rate limiting for pilot use.
   - Current buckets are process-local.
   - Restarts reset limits.
   - Multiple backend instances would not share limits.
   - Use Redis, database-backed counters or platform rate limiting for a real pilot.

9. Pin OpenAI dependency and set model/cost budgets.
   - backend/requirements.txt pins FastAPI, Uvicorn, Pydantic, python-multipart, Supabase, pypdf and httpx.
   - `openai` is unpinned.
   - The code caps answer output and source context, but there is no deployment-level budget, per-user daily cap, model allowlist or alerting.

10. Bring documentation into line with code.
   - README.md, backend/README.md and docs/external-review-pack.md still contain statements that staff-facing `/ask` is placeholder-only or that staff-facing RAG is not enabled.
   - Current backend code implements staff Ask RAG when OpenAI and DB are configured and a document passes all gates.
   - If deployment still has no qualifying document or env is off, document that as deployment state, not code state.

## What should not be built yet

1. Do not build conversation history persistence.
   - Persisting named staff questions would create a high-risk private transcript store.
   - It should not be built until the privacy model, retention model and access model are formally designed.

2. Do not build manager access to staff questions.
   - This would violate the product rules and undermine staff trust.

3. Do not build productivity, performance, sentiment or behaviour scoring.
   - These are explicitly out of scope and would create surveillance risk.

4. Do not build richer employer analytics until privacy thresholds are specified.
   - Aggregated insight wording is fine as a concept.
   - Do not store or display individual-level usage, topic counts or query timelines.

5. Do not enable RAG over safeguarding, medication, HR, legal, payroll, wellbeing or complaints documents.
   - These should continue to trigger human escalation unless a very specific source-grounded, human-approved safe-answer mode is designed.

6. Do not expand upload formats yet.
   - DOCX, TXT and scanned PDFs need metadata, tracked-changes, OCR and DLP work before they are safe.

7. Do not build multi-organisation production SaaS yet.
   - The schema has organisation IDs, but real multi-tenancy needs auth, database policy design, tenant isolation tests and operational monitoring.

8. Do not add native mobile apps.
   - The responsive web app is enough for the current controlled demo and pilot-hardening phase.

## Prioritised next steps

1. Define the pilot security boundary.
   - Decide the minimum viable auth provider, user roles, admin roles and pilot organisation model.
   - Write down what staff, managers, admins and developers can each access.

2. Harden the admin proxy.
   - Keep `ADMIN_PROXY_ENABLED=false` by default.
   - Add admin session validation.
   - Add route and method allowlists.
   - Add CSRF or same-site session protection for state-changing routes.

3. Align Ask API contracts.
   - Remove stale browser-sent identity fields from frontend types and payloads.
   - Update frontend risk category types.
   - Document server-derived identity until real auth lands.

4. Make non-grounded staff Ask fail closed.
   - If `_validate_grounded_answer_result` returns `insufficient_sources`, discard the model answer and return the standard safe fallback.

5. Add safety tests before more features.
   - Start with backend tests for escalation short-circuit, source minimisation, `/policies` scoping and staff Ask gates.
   - Keep frontend smoke tests, but do not rely on them as the only safety net.

6. Harden upload and document governance.
   - Scan full extracted text.
   - Keep default upload governance locked down.
   - Remove raw exception text from client-facing upload failures.
   - Require human review before embedding, source-grounded answers or staff visibility.

7. Replace process-local rate limiting.
   - Use a shared store or platform control.
   - Keep raw questions and raw answers out of rate-limit storage.

8. Pin dependencies and add dependency review.
   - Pin `openai`.
   - Review caret ranges in frontend dependencies and rely on lockfile discipline.
   - Run a separate dependency audit in a controlled follow-up, since this review did not run npm or network checks.

9. Add operational observability without surveillance.
   - Structured logs should include request IDs, endpoint, status, latency and safe event metadata.
   - Do not log raw staff queries, answer text, names or transcripts.
   - Add alerting for upload failures, embedding failures, LLM failures and rate-limit spikes.

10. Update stale documentation.
   - Make docs distinguish code capability from deployment state.
   - Current code contains staff Ask RAG capability; current public demo may still be configured or governed so that staff RAG is effectively unavailable.

## RAG and governance readiness

The RAG governance model is one of the strongest parts of the system. The staff path is intentionally stricter than admin answer-debug. It requires staff visibility, real document status, non-dummy status, non-sensitive status, no escalation requirement, embedding approval, source-grounded-answer approval, governance reviewer metadata, indexed embeddings and role access.

The biggest RAG safety issue is the non-grounded answer return path. The code correctly detects missing visible citations, but it still returns the generated answer body. For a regulated care setting, `allowed_to_answer=false` should not merely change UI state. The backend should not send the model-generated answer to the staff client at all unless it is source-grounded.

The second RAG issue is product/documentation drift. Several docs still describe staff `/ask` as placeholder-only. That used to be true, but the current backend has a staff RAG path. Reviewers and future contributors need the docs to say exactly which state is code capability, governance state and deployment state.

## Security posture

Current positive controls:

- Admin bearer token is backend-only.
- Admin proxy is disabled unless explicitly enabled.
- Admin screens render a disabled page by default.
- Staff Ask question length is capped at 500 characters.
- Public staff source responses are minimised.
- High-risk topics short-circuit before retrieval or LLM calls.
- `/debug/storage-config` is admin-protected and hidden unless `DEBUG_ENDPOINTS_ENABLED=true`.
- SQL migrations enable RLS and revoke public execution of `match_document_chunks`.

Current security gaps:

- No real staff authentication.
- No real admin authentication.
- No proxy path allowlist.
- No CSRF protection for admin proxy state-changing requests.
- CORS is permissive in methods and headers.
- Rate limiting is process-local.
- Some admin error responses can expose exception text.
- Admin debug endpoints can return query text, source previews, document IDs, chunk IDs and similarity scores if proxy access is enabled.
- Backend service role bypasses RLS by design, so all tenant isolation depends on application logic.

## Data privacy and leakage paths

Staff-facing leakage risk is much lower than in earlier milestones. `/ask` strips raw source previews and internal IDs. `/policies` uses a minimised DTO. The frontend staff pages no longer need admin metadata for normal use.

The main leakage paths are admin-only:

- `/documents/upload` returns `storage_key` and `extracted_text_preview`.
- `/documents/search-vector` and `/documents/answer-debug` expose debug metadata and source previews.
- `/documents` returns full admin `DocumentRecord` objects including storage and governance fields.

These are acceptable for developer/admin tooling only. They are not acceptable behind a public proxy without real admin auth.

## Dependency and version risk

Verified from backend/requirements.txt:

- fastapi==0.115.6
- uvicorn==0.34.0
- pydantic==2.10.4
- python-multipart==0.0.20
- supabase==2.5.0
- pypdf==4.3.1
- httpx==0.27.2
- openai is unpinned

Verified from frontend/package.json:

- next is pinned to 14.2.5
- lucide-react uses ^0.390.0
- react uses ^18
- react-dom uses ^18
- TypeScript and Playwright dev dependencies use caret ranges

No CVE audit was run. The concrete version risk visible from the repo is the unpinned OpenAI SDK, because backend code uses OpenAI Responses API when available and falls back to Chat Completions. A fresh deployment could resolve a different SDK version.

## Observability and logging

The audit-event model is useful for governance, but it is not operational observability. The app still needs:

- Structured backend logs.
- Request IDs.
- Safe error categories.
- Metrics for request volume, latency, rate-limit events, OpenAI failures and Supabase failures.
- Alerts for repeated upload, embedding or RAG failures.

Do not add raw query logging. Observability must remain privacy-preserving.

## Staff-facing Ask readiness

Staff Ask is not ready for real staff because there is no real identity, no auth, process-local rate limiting and no production monitoring. The safety design is good enough for guided internal testing with dummy or approved safe documents.

Before real staff use:

- Authenticate users.
- Bind users to an organisation and role server-side.
- Keep high-risk short-circuiting.
- Discard non-grounded model answers server-side.
- Add tests proving no raw chunks, IDs, vectors, scores or storage keys are returned.
- Confirm there is a signed-off, clean, approved document that passes every staff Ask gate.

## Safe for real staff and real documents?

No.

The current codebase is safe enough for guided internal technical review using sample data and approved demo documents. It is not safe for real staff or real documents until authentication, admin RBAC, upload hardening, monitoring, persistent rate limiting, tests and documentation alignment are complete.

## Recommended next milestone

Recommended next milestone: 4S.77 - Pilot Security Boundary and Admin Proxy Hardening.

Goal: define and enforce the minimum security boundary for a controlled Thumhara pilot before adding more product surface. This should include staff authentication design, admin session/RBAC design, proxy path allowlisting, CSRF protection for admin mutations, and tests for staff Ask and Policy Library privacy guarantees.

## Final judgement

The codebase is moving in the right direction. The privacy principles are visible in the implementation, not just the copy. The current strongest technical decision is the strict staff Ask governance gate plus minimised staff response shape.

The current weakest technical area is access control. The app should not handle real staff or real documents until real identity and admin security exist. Do not build more RAG or document-management features before closing that boundary.
