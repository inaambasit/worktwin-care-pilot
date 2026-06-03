# WorkTwin Care Pilot

A privacy-first AI staff support and policy assistant prototype for regulated care settings.

This is a working pilot and demo prototype. It is not production-ready.

## What it is

WorkTwin Care Pilot lets care staff ask questions about workplace policies, use Scenario Guidance to think through realistic care situations, and access onboarding guidance through a private AI assistant. Staff conversations are not visible to employers. The system is designed to use approved, source-cited documents as its knowledge base.

The first test client is Thumhara Centre (sample data only -- no real staff or service-user data).

## Current controlled preview status

WorkTwin Care Pilot is currently in **controlled preview** — a supervised prototype stage for evaluation in regulated adult social care settings. It is not live operational software and is not currently approved for unsupervised staff use.

**This system must not be used with real confidential information**, including real staff records, service-user data, medication details, safeguarding cases, complaints, care plans, HR records, or incident reports.

### What is live in the controlled preview

- Five approved pilot documents are loaded and staff-queryable (see policy boundary below)
- Ask WorkTwin has been verified on controlled test questions: visitor arrival guidance, gift acceptance (answered from Professional Boundaries), and medication error (correctly escalated — no AI medication advice returned)
- Mobile polish improvements are in place: landing navigation, staff sign-in escape link, access-refusal emergency visibility, escalation tap targets, policy modal close button, dashboard walkthrough strip, and private notes layout
- Shagufta reviewed the controlled preview; Ask WorkTwin and Policy Library positively received; product direction confirmed as guidance-led scenario support for realistic care situations
- Scenarios are guidance-led examples (what to do next, when to escalate, what not to do); fictional Shagufta-inspired scenarios and fictional service-user guidance card pattern added
- Staff journey aligned through Dashboard, Ask WorkTwin, Policy Library, Scenario Guidance, Onboarding, and Escalation Contacts
- Safety, trust, and UI polish sequence 4S.101A–4S.101K complete: clearer landing preview boundaries, Dashboard journey, Ask WorkTwin trust/source wording, Policy Library governance wording, Scenario Guidance naming and fictional profile clarity, Access Refusal recording boundary cleanup, Escalation demo contact safety, Private Notes and Book-a-Pilot session-only wording, Privacy Model easier to find
- Playwright smoke tests 33/33; mobile safety smoke coverage expanded (4S.101J; latest proven app checkpoint: `41761ba`)
- Auth hardening complete: ES256/JWKS-only JWT validation (HS256 fallback removed), no-store headers on /policies and /ask; ADMIN_TOKEN and OPENAI_API_KEY rotated (old OPENAI key revoked); Supabase service-role/JWT credential rotation completed (4S.106E — service-role key, JWT secret and anon key rotated; post-rotation ES256 membership proof passed)
- Rehearsal operator cockpit at /rehearsal: operator-only page showing NO-GO status, hard gates, approved Q1–Q8, stop conditions, and artefact links; not staff-facing; live on Vercel; local dry run and live smoke check passed; mobile demo polish complete
- Rehearsal feedback capture at /rehearsal/feedback: per-question observation log, stop condition checkboxes, outcome recording, clipboard copy; no data saved or transmitted; live on Vercel; dry run and live smoke check passed
- Trusted-staff monitoring and rollback runbook, one-user rehearsal plan, session record, and rehearsal readiness gate all present on main (docs/runbooks/)

### What is not live / not enabled

- Staff route authentication is wired and proven end-to-end: ES256/JWKS JWT validation, organisation membership check, and /staff/session-check; staff paths (dashboard, ask, policies, onboarding, scenarios, notes, escalation) are protected by Next.js middleware when NEXT_PUBLIC_PILOT_AUTH_MODE=true; the system is not approved for general or unsupervised staff use
- Staff visibility remains OFF; Staff Ask remains OFF; no Thumhara staff member has access; no real care data is in the system
- One hard gate remains before any trusted staff-style test: Thumhara Centre written sign-off (sign-off pack sent 31 May 2026; return-by 14 June 2026). Supabase service-role/JWT credential rotation was completed (4S.106E) and the post-rotation membership proof passed
- Admin proxy is disabled in the public deployment (ADMIN_PROXY_ENABLED not set); admin proxy real session guard, CSRF guard, and response minimisation are complete locally but production rollout controls remain outstanding
- No real staff, service-user, or confidential data is loaded or permitted
- QCS licence / AI-RAG use for wider rollout is not yet confirmed
- The system is not approved for use outside of supervised controlled testing

### Current testing gate

The auth-hardening and rehearsal apparatus track (4S.103D–4S.106F) is complete. Staff JWT validation is ES256/JWKS only (HS256 fallback removed). A full one-user rehearsal apparatus is in place: monitoring runbook, rehearsal plan, session record, readiness gate, operator cockpit (/rehearsal), and feedback capture (/rehearsal/feedback). A Shagufta demo walkthrough was prepared (4S.105J). The confidentiality sign-off pack was sent to Shagufta Akhtar on 31 May 2026 (return-by 14 June 2026). Supabase service-role/JWT credential rotation was completed and proven (4S.106E).

One hard gate remains before a one-user staff rehearsal can take place: Thumhara Centre written sign-off (pending return). Supabase service-role/JWT credential rotation was completed (4S.106E) and the post-rotation membership proof passed. The current rehearsal readiness gate records NO-GO. No trusted staff-style test can proceed until this gate is cleared and a joint GO is recorded in docs/runbooks/one-user-rehearsal-readiness-gate.md Section 10.

### Current policy boundary

The following five documents are the only approved staff-queryable policies in the current controlled preview:

1. Thumhara Centre Professional Boundaries Policy
2. Thumhara Centre Infection Prevention and Basic Hygiene Policy
3. Thumhara Centre Confidentiality and Information Handling Policy
4. Thumhara Centre Mobile Phone and Portable Device Use Policy
5. Visitor Sign-In and Identification Procedure

No additional policies are live. No real policy documents are uploaded.

### Controlled testing documents

- [docs/4s98e-controlled-testing-master-index.md](docs/4s98e-controlled-testing-master-index.md) — master index for all controlled testing materials
- [docs/4s98b-shagufta-review-script-and-feedback-log.md](docs/4s98b-shagufta-review-script-and-feedback-log.md) — reviewer walkthrough script and feedback log
- [docs/4s98c-controlled-ask-quality-scorecard.md](docs/4s98c-controlled-ask-quality-scorecard.md) — Ask WorkTwin quality scorecard
- [docs/4s98d-trusted-tester-onboarding-message-pack.md](docs/4s98d-trusted-tester-onboarding-message-pack.md) — tester onboarding messages
- [docs/4s98a-trusted-care-worker-testing-readiness-pack.md](docs/4s98a-trusted-care-worker-testing-readiness-pack.md) — care worker testing readiness pack

### Safety boundaries

- High-risk topics (safeguarding, medication, HR, payroll, legal) always escalate to human contacts — no AI answer is returned
- No surveillance, sentiment tracking, or productivity monitoring
- Private notes are not visible to employers
- Staff-facing answers are document-grounded and require a qualifying governed document, OpenAI, and a configured database — the system falls back safely when any of these are unavailable

---

## Live demo

- Staff-facing app: https://worktwin-care-pilot.vercel.app (Vercel)
- Backend API: https://worktwin-care-pilot-api.onrender.com (Render)
- `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` controls admin UI visibility; the live demo currently has this set to `true`, so admin demo screens are visible in the deployed app
- `ADMIN_PROXY_ENABLED` is a separate server-side control governing whether the admin API proxy forwards requests to the backend; these are distinct — do not conflate them; public admin API actions remain fail-closed; `ADMIN_PROXY_ENABLED` must not be set to `true` publicly until authentication, CSRF protection, and admin RBAC are deliberately implemented and reviewed

The staff app is mobile-responsive with drawer navigation on mobile and a fixed sidebar on desktop.

## Staff-facing features

- Landing page
- Book a Pilot enquiry page (/book-pilot — controlled demo enquiry page only; session-only and does not submit to a backend, CRM, email workflow or database)
- Employee dashboard
- Ask WorkTwin (governed staff /ask path -- source-grounded answers require OpenAI, a configured database, and a qualifying governed document; falls back safely when infrastructure is unavailable, no qualifying source exists, or a topic is high risk)
- Policy library
- Onboarding hub
- Scenario Guidance
- Access-refusal scenario
- Private notes
- Escalation contacts

## Backend and governance

- Admin-only vector search and answer-debug endpoints exist for governed documents
- The backend contains a governed staff /ask RAG path with strict document gates; it falls back safely when OpenAI, the database, or a qualifying governed document is unavailable, or when a topic is high risk
- High-risk topics (safeguarding, medication, HR, payroll, legal) always short-circuit to human escalation -- no AI answer is returned
- AC32 is approved only for controlled internal Thumhara Centre staff-style testing; QCS licence/AI-RAG use is not confirmed before wider rollout
- Visitor Sign-In and Identification Procedure was the first clean Lane A proof in /policies; AC32, CC34, and QQ03 have also been through controlled governance and testing states (AC32 controlled internal staff-visible; CC34 and QQ03 admin answer-debug only)
- A real staff pilot must not proceed until authentication, RBAC, admin session protection, full safety tests, and pilot governance are in place
- Partial admin proxy hardening is in place (disabled proxy guard, typed path allowlist, method guard, unauthenticated guard, role/membership guard placeholder, route-specific role allowlist, CSRF fail-closed guard for POST/PATCH, upload content-type/size guards, safe audit logging, no-store caching); production rollout controls remain outstanding — admin proxy is disabled publicly

## Tech stack

- Next.js 14, TypeScript, Tailwind CSS
- FastAPI, Python
- Supabase / PostgreSQL / pgvector
- OpenAI embeddings and source-grounded admin answer testing
- Vercel (frontend)
- Render (backend API)

## Running locally

**Backend**

```
cd backend
uvicorn app.main:app --reload
```

Runs at http://localhost:8000

**Frontend**

```
cd frontend
npm install
npm run dev
```

Runs at http://localhost:3000

Create `frontend/.env.local` with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key safety principles

- No surveillance, sentiment tracking or productivity monitoring
- Private notes are not visible to employers
- High-risk topics (safeguarding, medication, HR, payroll, legal) escalate to humans -- no AI answers
- Staff-facing document-grounded answers are governed and require OpenAI, a configured database, and a qualifying governed document -- the public demo must be treated as non-production and fallback-safe unless its live configuration and qualifying source state have been explicitly verified
- No service-user records, MAR charts, care plans, HR/payroll files or private case files should be uploaded

## Documentation

- [docs/README.md](docs/README.md) -- documentation index
- [docs/current-state.md](docs/current-state.md) -- current checkpoint, blockers, and pilot-readiness status
- [docs/staff-demo-walkthrough.md](docs/staff-demo-walkthrough.md) -- staff demo guide
- [docs/documentation-maintenance-plan.md](docs/documentation-maintenance-plan.md) -- documentation maintenance plan

Controlled testing documents (see [Current controlled preview status](#current-controlled-preview-status) above):

- [docs/4s98e-controlled-testing-master-index.md](docs/4s98e-controlled-testing-master-index.md)
- [docs/4s98b-shagufta-review-script-and-feedback-log.md](docs/4s98b-shagufta-review-script-and-feedback-log.md)
- [docs/4s98c-controlled-ask-quality-scorecard.md](docs/4s98c-controlled-ask-quality-scorecard.md)
- [docs/4s98d-trusted-tester-onboarding-message-pack.md](docs/4s98d-trusted-tester-onboarding-message-pack.md)
- [docs/4s98a-trusted-care-worker-testing-readiness-pack.md](docs/4s98a-trusted-care-worker-testing-readiness-pack.md)

## Recent changes (checkpoint 9b0204f)

- 4S.101A–4S.101L — Safety, trust, and UI polish sequence; Playwright smoke 33/33; current-state alignment (through checkpoint `31bb281`)
- 4S.103D–4S.104E — Env-safety hold lifted; staff auth readiness PASS; confidentiality source policy and extract authored (dummy docs only, admin-only, not promoted); sign-off pack sent to Shagufta Akhtar 31 May 2026 (return-by 14 June 2026)
- 4S.104E-6d — Cache-Control: no-store on /policies and /ask (PR #1, commit `98135fc`)
- 4S.104E-6e–4S.105C — Trusted-staff monitoring and rollback runbook; one-user rehearsal plan; session record; rehearsal readiness gate (docs/runbooks/, PRs #2–5)
- 4S.105D — HS256 JWT fallback removed — staff auth now ES256/JWKS only (PR #6, commit `24260bf`)
- 4S.105E — Rehearsal operator cockpit at /rehearsal (PR #7, commit `9eefa43`)
- 4S.105F — Rehearsal feedback capture at /rehearsal/feedback (PR #8, commit `467e9a1`)
- 4S.105G–4S.106A — Rehearsal dry-run checklist; dry run PASS; Shagufta demo walkthrough (PR #10); live smoke check PASS
- 4S.106B–4S.106C — Pre-rehearsal readiness pass; doc fix (PR #11, commit `998a756`); mobile demo polish (PR #12, commit `19a090a`)
- 4S.106D — README and current-state aligned to rehearsal-readiness (PR #13, commit `c65ffa0`)
- 4S.106E — Supabase service-role/JWT credential rotation completed and proven; post-rotation ES256 membership proof passed; readiness gate updated to record the Supabase hard gate cleared (PR #14, commit `7ce06db`)
- 4S.106F-1 — Rehearsal cockpit and feedback page updated to reflect Supabase rotation cleared; live smoke check PASS (PR #15, commit `9b0204f`)

## Known gaps

- Authentication is wired and proven end-to-end for the staff path (ES256/JWKS JWT, organisation membership lookup, /staff/session-check, Next.js middleware); the system is not approved for general or unsupervised staff use; no real Thumhara staff accounts exist
- One hard gate remains before any trusted staff-style test: Thumhara Centre written sign-off (due 14 June 2026); Supabase service-role/JWT credential rotation was completed (4S.106E) with the post-rotation membership proof passing; current readiness gate records NO-GO
- Dummy policy documents (Confidentiality extract, Escalation extract) are indexed admin-only; staff visibility and Staff Ask remain OFF; promotion requires a separate recorded governance decision
- Book a Pilot (/book-pilot) is a controlled demo enquiry page only; it is session-only and does not yet submit to a backend, CRM, email workflow or database
- Staff-facing document-grounded answers require a qualifying governed document with all governance flags set and pilot-auth mode active before real staff use
- A real pilot requires governance sign-off, DPA/legal review, production deployment controls, and content permissions — not production-ready
