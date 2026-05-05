# WorkTwin Care Pilot — Supabase Auth Configuration Checklist

**Milestone:** 4S.88B
**Status:** Documentation-only checklist. No dashboard changes made by this milestone.

---

## Purpose

This checklist documents the exact Supabase Auth dashboard and configuration checks required before any controlled auth activation. It is not an implementation step and it is not a public activation step.

The purpose is to give a clear, ordered plan of what must be confirmed in the Supabase project before any end-to-end auth flow is exercised — even in a controlled local or staging test. Nothing in this document turns auth on. Everything here must be verified before auth is turned on.

---

## Absolute Boundaries

The following actions must not occur at this milestone or as a result of it:

- Do not enable `ADMIN_PROXY_ENABLED` publicly.
- Do not enable `PILOT_AUTH_MODE` publicly.
- Do not enable `NEXT_PUBLIC_PILOT_AUTH_MODE` publicly.
- Do not create real Thumhara staff accounts yet.
- Do not use real staff email addresses yet.
- Do not upload real Thumhara documents.
- Do not approve AC32 for staff visibility.
- Do not change governance gates.
- Do not treat this as pilot-ready.

---

## Current Dependency and Configuration State

Auth scaffolding is in place but auth is not active. The state as of this milestone is:

- `@supabase/ssr` and `@supabase/supabase-js` are already present in `frontend/package.json`.
- `supabase==2.5.0` and `PyJWT>=2.8.0` are already present in `backend/requirements.txt`.
- `.env.example` contains the required auth variables with safe defaults or empty placeholders:
  - `SUPABASE_JWT_SECRET=`
  - `NEXT_PUBLIC_SUPABASE_URL=`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
  - `PILOT_AUTH_MODE=false`
  - `NEXT_PUBLIC_PILOT_AUTH_MODE=false`
- Login, callback, logout, and session scaffolding exists in the frontend.
- Backend JWT validation, membership lookup, and staff-context scaffolding exists.
- Auth is not active. All auth flags remain false.

**Known gap (identified in 4S.88A):** Frontend staff API helpers do not yet forward `Authorization: Bearer <token>` to the FastAPI `/ask` and `/policies` endpoints. This is a required implementation step in a later milestone before backend auth enforcement is meaningful.

---

## 1. Supabase Project Checks Before Controlled Activation

Confirm the following before any controlled auth test:

- [ ] Confirm the correct Supabase project is being used for this pilot.
- [ ] Confirm and record the project URL.
- [ ] Confirm and record the anon public key.
- [ ] Confirm the service role key is present on server-side environments only.
- [ ] Confirm the JWT secret source in the Supabase dashboard (Settings → API → JWT Secret).
- [ ] Confirm no service role key is placed in any `NEXT_PUBLIC_` variable.
- [ ] Confirm no JWT secret is placed in any `NEXT_PUBLIC_` variable.
- [ ] Confirm the project region and data processing location are acceptable for UK care-sector pilot planning.
- [ ] Confirm access to the Supabase dashboard is restricted to trusted WorkTwin operators only.

---

## 2. Auth Provider Configuration

- [ ] Email magic link / email OTP enabled.
- [ ] Password login not required for the first pilot phase.
- [ ] Social login providers disabled unless explicitly approved at a later stage.
- [ ] SMS OTP disabled unless explicitly approved at a later stage.
- [ ] SAML/SSO deferred unless Thumhara specifically requests it at a later stage.
- [ ] Email confirmation behaviour understood and documented for the test flow.
- [ ] Magic-link expiry duration understood and recorded.
- [ ] Rate limits and anti-abuse settings reviewed in the Supabase dashboard.

---

## 3. URL and Redirect Configuration

- [ ] Local callback URL added in Supabase Auth settings: `http://localhost:3000/auth/callback`
- [ ] Live Vercel callback URL added: `https://worktwin-care-pilot.vercel.app/auth/callback`
- [ ] Any Vercel preview URLs handled deliberately — not broadly wildcarded unless reviewed and accepted.
- [ ] Site URL set correctly in Supabase Auth settings.
- [ ] Redirect after callback currently goes to `/dashboard` — this is the current scaffolded behaviour.

**Known gap:** The callback route does not yet preserve the original `next` destination from middleware. A user who is redirected to `/login` from a protected route will land at `/dashboard` after authentication rather than returning to the original URL. This is a known limitation to address in a later milestone.

---

## 4. Environment Variable Placement

No real values should be committed to Git. The following table records the intended placement and exposure level for each auth-related variable.

| Variable | Placement | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel — frontend public | Safe to expose as the project URL is non-secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel — frontend public | Safe to expose as the anon key only; carries no server privileges |
| `SUPABASE_JWT_SECRET` | Render — backend server-only | Never public; used to verify JWT signatures server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | Render — backend server-only | Already in use; never public; carries full database access |
| `PILOT_AUTH_MODE` | Render — backend server-only | Remains `false` publicly |
| `NEXT_PUBLIC_PILOT_AUTH_MODE` | Vercel — frontend public | Remains `false` publicly |
| `ADMIN_PROXY_ENABLED` | Vercel / server-side admin proxy env | Remains `false` publicly |
| `ADMIN_TOKEN` | Vercel / Render — server-only | Never public |

---

## 5. Controlled Test-User Preparation

- [ ] Use test accounts only at this stage.
- [ ] Do not use real Thumhara staff email addresses yet.
- [ ] Decide and record test email addresses to be used.
- [ ] Confirm test email addresses are accessible to the tester.
- [ ] Create users only after DPA/legal/governance timing is agreed for any non-test use.
- [ ] No real staff questions to be submitted during testing.
- [ ] No real policy documents to be loaded during testing.
- [ ] No service-user data to be used at any point during testing.

---

## 6. `organisation_memberships` Dependency

The backend membership lookup depends on an `organisation_memberships` table in the Supabase database. Confirm the following before any controlled end-to-end auth test:

- [ ] Confirm the `organisation_memberships` table exists in the correct Supabase project.
- [ ] Confirm `user_id` references the Supabase Auth user ID (equivalent to the JWT `sub` claim).
- [ ] Confirm `organisation_id` matches the demo organisation or the agreed pilot organisation ID.
- [ ] Confirm role values match the agreed role model: `staff`, `senior_care_staff`, `registered_manager`, `organisation_admin`, `worktwin_dev_admin`, `read_only_reviewer`. `worktwin_dev_admin` is internal to the WorkTwin team and must not be assigned to Thumhara Centre staff.
- [ ] Confirm that `active=false` correctly blocks access in the backend membership check.
- [ ] Seed only safe test users first.
- [ ] Do not seed real staff until appropriate sign-off has been obtained.

---

## 7. Required Proof Sequence Before Activation

The following sequence must be demonstrated in a controlled environment before any auth flag is set to true in a live environment:

- [ ] Frontend can request a magic link.
- [ ] `/auth/callback` exchanges the authorisation code for a session successfully.
- [ ] `/logout` clears the session correctly.
- [ ] Middleware redirects unauthenticated requests to `/ask` and `/policies` only when `NEXT_PUBLIC_PILOT_AUTH_MODE=true`.
- [ ] Demo mode still functions correctly when all auth flags are false.
- [ ] Frontend can safely obtain an access token from the session.
- [ ] `Authorization: Bearer <token>` header forwarding is implemented and tested — this is a subsequent milestone (the known gap from 4S.88A).
- [ ] Backend validates the JWT and resolves membership correctly.
- [ ] `/ask` and `/policies` reject unauthenticated requests when operating in pilot-auth mode.
- [ ] No client-supplied identity is trusted; all identity is derived from the server-validated JWT.

---

## 8. Stop Conditions

Work on any auth activation must stop if any of the following conditions apply:

- The JWT secret is unavailable or cannot be stored server-side only.
- The frontend cannot safely obtain and send a valid access token to the backend.
- The `organisation_memberships` table is missing or its schema differs from the expected structure.
- Route protection breaks the public demo while auth flags are false.
- Any real staff data is required to complete the test.
- `ADMIN_PROXY_ENABLED` would need to be set to true publicly to proceed.
- DPA, legal, or governance sign-off is missing for any step that involves real staff data or real organisational information.

---

## 9. Recommended Next Slice

**4S.88C** — Local/session flow proof, no public activation.

This slice would execute the proof sequence above in a controlled local environment, confirm the session flow works end to end with test accounts, and document the outcome — without enabling any auth flag publicly.

---

## Decision Summary

- Supabase Auth remains the chosen auth provider for the controlled pilot path.
- The current dependency and configuration scaffold is in place.
- No auth flags should be turned on yet.
- This checklist must be completed and each item confirmed before any controlled auth activation proceeds.
- The public demo remains in demo mode.
