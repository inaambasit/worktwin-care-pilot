# WorkTwin Care Pilot — Auth Readiness Review

**Milestone:** 4S.88A
**Status:** Review/planning only. No auth activation.

---

## Purpose

This review checks whether the existing auth scaffolding is structurally sound and ready for controlled activation planning — not for public activation. Its purpose is to establish a clear baseline of what exists, what gaps remain, and what steps are needed before any auth flag is turned on.

---

## Absolute Boundaries

The following actions must not occur as a result of or alongside this review:

- Do not enable `ADMIN_PROXY_ENABLED` publicly.
- Do not enable `PILOT_AUTH_MODE` publicly.
- Do not enable `NEXT_PUBLIC_PILOT_AUTH_MODE` publicly.
- Do not use real staff accounts yet.
- Do not upload real Thumhara documents.
- Do not approve AC32 for staff visibility.
- Do not change governance gates.
- Do not treat this as pilot-ready.

---

## Current Auth Scaffolding Found

### Frontend

| File | Role |
|---|---|
| `frontend/app/login/page.tsx` | Magic-link form using Supabase `signInWithOtp`; redirects to `/login/sent` on submission |
| `frontend/app/login/sent/page.tsx` | Confirmation page shown after magic-link is sent |
| `frontend/app/auth/callback/route.ts` | Exchanges callback code for a session and redirects to `/dashboard` |
| `frontend/app/logout/route.ts` | Attempts Supabase `signOut` and redirects to `/login` |
| `frontend/middleware.ts` | Protects `/ask` and `/policies` only when `NEXT_PUBLIC_PILOT_AUTH_MODE=true` |
| `frontend/lib/session.ts` | `getVerifiedSession` helper using `getUser` |
| `frontend/lib/supabase-server.ts` | Supabase SSR server client helper |

### Backend

| File | Role |
|---|---|
| `backend/app/jwt_auth.py` | Validates Supabase JWT using `SUPABASE_JWT_SECRET`; fails 503 if secret is not configured |
| `backend/app/membership.py` | Resolves `StaffContext` from `organisation_memberships` using JWT `sub`; role and `organisation_id` come from the membership row, not from JWT claims |
| `backend/app/staff_context.py` | Extracts Bearer token, validates JWT, resolves membership |
| `backend/app/main.py` | `/ask` and `/policies` switch to verified `StaffContext` when `PILOT_AUTH_MODE=true`; otherwise use demo env context |

---

## Existing Test Coverage Found

The following test files cover auth and identity behaviour:

- `test_jwt_auth.py`
- `test_membership.py`
- `test_staff_context.py`
- `test_ask_identity.py`
- `test_policies_identity.py`

**Coverage summary:**

- Demo mode is preserved when auth flags are off.
- Missing or empty auth headers return 401 in pilot-auth mode.
- Verified `StaffContext` is used in pilot-auth mode.
- Client-supplied identity is ignored; identity comes from the verified token and membership row only.
- JWT valid / expired / malformed / wrong-signature / unconfigured-secret behaviour is tested.
- Membership active / inactive / missing / empty-org / empty-role behaviour is tested.
- Role and organisation are confirmed to come from the membership row, not from JWT claims.
- `/policies` uses verified organisation and role for policy filtering.

---

## Safe Defaults Confirmed

| Variable | Default state |
|---|---|
| `ADMIN_PROXY_ENABLED` | `false` |
| `PILOT_AUTH_MODE` | `false` |
| `NEXT_PUBLIC_PILOT_AUTH_MODE` | `false` |
| `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` | `false` in `.env.example`; live demo may set it `true` for UI visibility only |
| `SUPABASE_JWT_SECRET` | Present as scaffolding; empty in example |
| `NEXT_PUBLIC_SUPABASE_URL` | Present as scaffolding; empty in example |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Present as scaffolding; empty in example |

No live credentials are present in version-controlled files.

---

## Main Readiness Gap

The most significant structural gap is that the backend and frontend auth paths are not yet connected.

- The backend `/ask` and `/policies` endpoints expect an `Authorization: Bearer <token>` header when `PILOT_AUTH_MODE=true`.
- The current frontend staff API helpers call `/ask` and `/policies` **without** an `Authorization` header.

Before any controlled activation can proceed, WorkTwin needs a deliberate design and proof for the following flow:

> Supabase session → access token → `Authorization: Bearer` header → FastAPI `/ask` and `/policies` → verified `StaffContext`

This must not be patched casually. It requires a controlled sub-milestone with explicit design, implementation, and test coverage before any auth flag is turned on.

---

## Other Readiness Gaps Before Controlled Activation

The following items must be confirmed before moving beyond planning:

- Confirm Supabase project configuration and magic-link settings.
- Confirm redirect URLs are correctly set for both localhost and Vercel environments.
- Confirm session cookie behaviour is appropriate for the deployment context.
- Confirm the frontend can retrieve the access token safely after authentication.
- Confirm the backend accepts only verified Bearer tokens in pilot-auth mode.
- Confirm no client-supplied `user_id`, `role`, or `organisation_id` is trusted at any point.
- Confirm the `organisation_memberships` table exists with the correct schema.
- Seed only safe test users before any end-to-end testing.
- Confirm `/ask` and `/policies` continue to work in demo mode when all auth flags are `false`.
- Confirm `/ask` and `/policies` reject unauthenticated requests when auth flags are `true`.
- Confirm logout clears the session and protected routes redirect correctly after logout.
- Confirm no real staff accounts or real Thumhara documents are used at any stage before governance sign-off.
- Confirm DPA, legal, and governance sign-off is required and obtained before any real staff data is introduced.

---

## Recommended Next Slices

| Milestone | Description |
|---|---|
| **4S.88B** | Supabase Auth configuration checklist — documentation only |
| **4S.88C** | Local/session flow proof — no public activation |
| **4S.88D** | Frontend route protection proof |
| **4S.88E** | Backend Bearer/session forwarding proof |
| **4S.88F** | `organisation_memberships` migration/readiness proof — no real staff |
| **4S.88G** | Controlled test-user auth end-to-end — no real staff data |

Each slice should be reviewed and signed off before the next is started.

---

## Decision Summary

- The auth scaffolding is structurally promising and backed by meaningful test coverage.
- It is **not ready** for public activation in its current state.
- The primary gap — the missing Bearer token forwarding from frontend to backend — must be addressed in a controlled sub-milestone, not patched in place.
- The next step should be configuration and readiness documentation (4S.88B), not switching flags on.
- The public demo must remain in demo mode until all readiness gaps are resolved and governance sign-off is obtained.
- `ADMIN_PROXY_ENABLED` must remain `false` publicly.
