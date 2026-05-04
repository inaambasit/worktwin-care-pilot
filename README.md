# WorkTwin Care Pilot

A privacy-first AI staff support and policy assistant prototype for regulated care settings.

This is a working pilot and demo prototype. It is not production-ready.

## What it is

WorkTwin Care Pilot lets care staff ask questions about workplace policies, practise scenarios, and access onboarding guidance through a private AI assistant. Staff conversations are not visible to employers. The system is designed to use approved, source-cited documents as its knowledge base.

The first test client is Thumhara Centre (sample data only -- no real staff or service-user data).

## Live demo

- Staff-facing app: https://worktwin-care-pilot.vercel.app (Vercel)
- Backend API: https://worktwin-care-pilot-api.onrender.com (Render)
- `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` controls admin UI visibility; the live demo currently has this set to `true`, so admin demo screens are visible in the deployed app
- `ADMIN_PROXY_ENABLED` is a separate server-side control governing whether the admin API proxy forwards requests to the backend; these are distinct — do not conflate them; public admin API actions remain fail-closed; `ADMIN_PROXY_ENABLED` must not be set to `true` publicly until authentication, CSRF protection, and admin RBAC are deliberately implemented and reviewed

The staff app is mobile-responsive with drawer navigation on mobile and a fixed sidebar on desktop.

## Staff-facing features

- Landing page
- Employee dashboard
- Ask WorkTwin (governed staff /ask path -- source-grounded answers require OpenAI, a configured database, and a qualifying governed document; falls back safely when infrastructure is unavailable, no qualifying source exists, or a topic is high risk)
- Policy library
- Onboarding hub
- Practice scenarios
- Access-refusal scenario
- Private notes
- Escalation contacts

## Backend and governance

- Admin-only vector search and answer-debug endpoints exist for governed documents
- The backend contains a governed staff /ask RAG path with strict document gates; it falls back safely when OpenAI, the database, or a qualifying governed document is unavailable, or when a topic is high risk
- High-risk topics (safeguarding, medication, HR, payroll, legal) always short-circuit to human escalation -- no AI answer is returned
- AC32 is excluded from staff visibility
- Visitor Sign-In and Identification Procedure is the first safe staff-visible test policy in /policies
- A real staff pilot must not proceed until authentication, RBAC, admin session protection, full safety tests, and pilot governance are in place

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
- [docs/staff-demo-walkthrough.md](docs/staff-demo-walkthrough.md) -- staff demo guide
- [docs/documentation-maintenance-plan.md](docs/documentation-maintenance-plan.md) -- documentation maintenance plan

## Known gaps

- Authentication: `/login` and `/login/sent` exist as preparation and demo pages, and Staff sign in is linked from the landing page — but these do not yet protect employee or admin routes; all pages remain accessible without a real authenticated session
- Private Notes mobile layout needs improvement
- Staff-facing document-grounded answers require a qualifying governed document, configured infrastructure, authentication, and RBAC before real staff use
- A real pilot still requires authentication, RBAC, admin session protection, full safety tests, governance sign-off, DPA/legal review, persistent rate limiting, and upload hardening
