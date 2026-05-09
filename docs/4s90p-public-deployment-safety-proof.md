# 4S.90P - Public Deployment Safety Proof

**Date:** 2026-05-09
**Checkpoint:** 3513f2a
**App:** https://worktwin-care-pilot.vercel.app

---

## Repo Proof

- `git status --short` returned clean - no uncommitted changes
- Latest commit: `3513f2a Record admin response minimisation proof`
- Branch: `main`

---

## Admin Proxy Checks

Both admin and debug endpoints were tested against the public Vercel deployment.

| Endpoint | Method | Status | Response body |
|---|---|---|---|
| `/api/admin/documents` | GET | 403 | `{"detail":"Admin proxy is disabled for this deployment."}` |
| `/api/admin/debug/storage-config` | GET | 403 | `{"detail":"Admin proxy is disabled for this deployment."}` |

`ADMIN_PROXY_ENABLED` appears disabled in the public deployment based on runtime behaviour. Neither endpoint exposed admin data, storage configuration, environment details, document data, or backend debug data.

---

## Public Page Checks

| Route | Status |
|---|---|
| `/` | 200 |
| `/dashboard` | 200 |
| `/ask` | 200 |
| `/policies` | 200 |
| `/onboarding` | 200 |
| `/scenarios` | 200 |
| `/notes` | 200 |
| `/escalation` | 200 |
| `/login` | 200 |

All public demo pages loaded.

---

## What This Proof Confirms

- The public Vercel deployment returns 403 for admin and debug endpoints with a safe static message only.
- No admin data, storage configuration, environment details, document data, or backend debug data was exposed through the public deployment.
- All public demo pages loaded as expected.

---

## What This Proof Does Not Confirm

- This does not activate production authentication. Public auth (`PILOT_AUTH_MODE`) remains disabled.
- This does not make the product production-ready.
- Real staff use is not approved.
- The following remain outstanding before any controlled pilot sign-off:
  - DPA / data processing agreement with Thumhara Centre
  - QCS and third-party content permissions
  - Pilot governance sign-off
  - Final controlled pilot sign-off

---

## ADMIN_PROXY_ENABLED Rule

`ADMIN_PROXY_ENABLED` must not be enabled in any non-local environment until all production rollout controls are satisfied. See `docs/current-state.md` Section 11 (Do-Not-Touch List) and Section 6 (Current Blockers).
