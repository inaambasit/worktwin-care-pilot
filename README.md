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
- Playwright smoke tests 24/24; mobile journey coverage added for dashboard, onboarding, scenario guidance, and access-refusal safety

### What is not live / not enabled

- Real authentication and RBAC are not active; all routes remain accessible without a session
- Admin proxy real session validation is outstanding
- No real staff, service-user, or confidential data is loaded or permitted
- QCS licence / AI-RAG use for wider rollout is not yet confirmed
- The system is not approved for use outside of supervised controlled testing

### Current testing gate

Shagufta's controlled mobile preview is complete (4S.100A). She reviewed Ask WorkTwin and the Policy Library; both were positively received. Her feedback was implemented across 4S.100B–4S.100G: scenarios redesigned as guidance-led support, fictional Shagufta-inspired scenarios and fictional service-user guidance card pattern added, staff journey aligned, mobile journey smoke coverage added (24/24), and a controlled-preview evidence log committed.

The next gate before any wider tester access is a design review and UI polish pass (4S.101A–4S.101C).

A 3–5 trusted care worker test phase is prepared (onboarding pack and review scripts are ready in the controlled testing documents below) but has not started.

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
- Partial admin proxy hardening is in place (disabled proxy guard, typed path allowlist, method guard, unauthenticated guard, role/membership guard placeholder, route-specific role allowlist, CSRF fail-closed guard for POST/PATCH, upload content-type/size guards, safe audit logging, no-store caching); real Supabase Auth session validation, real organisation_memberships lookup, and production CSRF/same-site controls remain outstanding

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

## Recent changes (checkpoint c278725)

- 4S.100A — Shagufta controlled preview feedback captured; guidance-led scenario direction recorded
- 4S.100B — Scenarios redesigned as guidance-led support; docs and frontend aligned
- 4S.100C — Fictional Shagufta-inspired scenarios added
- 4S.100D — Fictional service-user guidance card pattern added
- 4S.100E — Dashboard and onboarding staff journey aligned
- 4S.100F — Mobile journey smoke coverage added; Playwright smoke 24/24; dashboard, onboarding, scenario guidance, and access-refusal safety covered
- 4S.100G — Shagufta controlled-preview evidence log committed
- 4S.100H — README and documentation alignment (this slice)

## Known gaps

- Authentication: `/login` and `/login/sent` exist as preparation and demo pages, and Staff sign in is linked from the landing page — but these do not yet protect employee or admin routes; all pages remain accessible without a real authenticated session
- Auth configuration scaffolding is in place: PILOT_AUTH_MODE, NEXT_PUBLIC_PILOT_AUTH_MODE, SUPABASE_JWT_SECRET, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY are represented in .env.example, but real Supabase Auth and organisation membership lookup are not yet active
- Book a Pilot (/book-pilot) is a controlled demo enquiry page only; it is session-only and does not yet submit to a backend, CRM, email workflow or database
- Private Notes mobile layout needs improvement
- Staff-facing document-grounded answers require a qualifying governed document, configured infrastructure, authentication, and RBAC before real staff use
- A real pilot still requires authentication, RBAC, admin session protection, full safety tests, governance sign-off, DPA/legal review, persistent rate limiting, and upload hardening
