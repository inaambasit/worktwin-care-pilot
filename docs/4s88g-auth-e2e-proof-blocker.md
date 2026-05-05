# 4S.88G — Auth E2E Proof Blocker

**Status:** Blocked - pending safe migration path  
**Date recorded:** 2026-05-05

---

## 1. Checkpoints reached

| Commit | Description |
|--------|-------------|
| `f1eccaa` | Forward Supabase token to staff API |
| `a61f9de` | Add organisation memberships migration |

---

## 2. What passed

- Frontend Bearer forwarding implemented for `askWorktwin()` and `fetchPolicies()`.
- Demo compatibility passed - existing demo path unaffected.
- Backend auth mode enforces presence of `Authorization` header.
- Missing `Authorization` header -> `401` returned correctly.
- Fake Bearer token with no backend auth config present -> `503` returned correctly.
- With local backend auth env vars present:
  - Authenticated browser request to `/policies` reached the backend.
  - Backend returned `401` rather than falling back to demo mode - confirms auth gating is active.
- `organisation_memberships` table check returned `404`, confirming the table is not currently available through PostgREST.

---

## 3. Current blocker

The full E2E auth chain cannot be completed because the `organisation_memberships` table does not exist in the available PostgREST surface.

The Supabase project/branch observed in the dashboard is:

> **worktwin-care-pilot / main / PRODUCTION**

Running `backend/sql/008_organisation_memberships.sql` against this environment has not been approved.

---

## 4. Decision

Do not run `backend/sql/008_organisation_memberships.sql` against the production-labelled Supabase environment until a safe target is confirmed and explicitly approved.

---

## 5. Required next options

Either of the following must be resolved before proceeding:

1. **Create or use a separate Supabase development branch/project** and run the migration there, then re-run the E2E proof against that environment.
2. **Explicitly approve the production-labelled project** (`worktwin-care-pilot / main / PRODUCTION`) as the controlled test environment, then run the migration under that approval.

No migration should proceed without one of these paths being confirmed.

---

## 6. Safety reminders

- No real Thumhara staff accounts in any test environment.
- No real Thumhara documents in any test environment.
- `PILOT_AUTH_MODE` / `NEXT_PUBLIC_PILOT_AUTH_MODE` must remain `false` — do not activate publicly.
- `ADMIN_PROXY_ENABLED` must remain `false` — do not activate.
- No secrets committed to the repository or shared in chat.
- Local frontend auth flag (`NEXT_PUBLIC_PILOT_AUTH_MODE`) must be reset to `false` after any local testing session.
