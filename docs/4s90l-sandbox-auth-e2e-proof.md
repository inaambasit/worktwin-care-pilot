# 4S.90L - Sandbox Auth E2E Proof Record

> Status: **PASSED** (with one security fix committed in `23632a4`).
> Documentation only. No backend, frontend, test, or migration files were changed in this record.

---

## 1. Summary

4S.90L proved local Supabase Auth E2E using the separate sandbox Supabase project (`worktwin-sandbox-dev`). This moved WorkTwin from "safe because disabled" toward "safe because verified in sandbox."

- Production/public auth remains disabled.
- Admin proxy remains disabled.
- No real Thumhara staff data, no real service-user data, and no QCS documents were used.

---

## 2. Environment

| Item | Value |
|---|---|
| Git checkpoint (before and final) | `23632a4` - Enforce allowed organisation boundary on policies |
| Sandbox Supabase project | `worktwin-sandbox-dev` |
| Sandbox hostname | `sgrbkhubjwsjakdegeqr.supabase.co` |
| Local frontend | `http://localhost:3000` |
| Local backend | `http://localhost:8000` |

### Local-only flags active during proof

| Flag | Value |
|---|---|
| `NEXT_PUBLIC_PILOT_AUTH_MODE` | `true` |
| `PILOT_AUTH_MODE` | `true` |
| `PILOT_ORGANISATION_ID` | `demo-org` |
| `ALLOWED_ORGANISATION_IDS` | `demo-org` |

Env files remained ignored. No secrets were committed.

---

## 3. Prerequisites Completed

- Sandbox Auth redirect URL configured for `http://localhost:3000/auth/callback`.
- Migrations `001`-`008` applied to sandbox only (not to the Thumhara Centre project).
- `pgcrypto` and `vector` extensions confirmed present.
- `organisation_memberships` table confirmed to exist with RLS enabled.
- `service_role` grants applied to sandbox `public` schema because "Automatically expose new tables" was off in the sandbox dashboard.
- Sandbox users and memberships seeded. No real Thumhara staff email addresses, service-user data, or tokens were recorded. One tester-controlled personal inbox was used only for magic-link delivery fallback; the address is not recorded in this proof.
  - Active `demo-org` staff
  - Active `demo-org` organisation admin
  - Inactive `demo-org` staff
  - Active staff in a different (`wrong-org`) organisation

---

## 4. Positive Proof Results

| Test | Result |
|---|---|
| Active staff sign-in via Supabase magic link | Succeeded - session established, JWT issued |
| Active staff `GET /policies` | `200 OK` |
| Active staff `POST /ask` | `200 OK` |
| Frontend sent authenticated request to backend | Confirmed - `Authorization: Bearer <token>` header forwarded |
| Backend validated JWT and resolved `organisation_memberships` | Confirmed - staff context resolved, org boundary checked |

---

## 5. Negative Proof Results

| Test | Result |
|---|---|
| Unauthenticated `GET /policies` | `401 Missing Authorization header` |
| Unauthenticated `POST /ask` | `401 Missing Authorization header` |
| Inactive staff `GET /policies` | `403` |
| Invalid token `GET /policies` | `401 Invalid token` |
| Wrong-org staff `GET /policies` (before fix) | `200` - exposed a real `/policies` organisation-boundary gap |
| Wrong-org staff `GET /policies` (after fix, `23632a4`) | `403` |

---

## 6. Security Finding and Fix

### Finding

`/ask` already enforced the allowed organisation boundary via `_ALLOWED_ORGANISATION_IDS`. `/policies` resolved `StaffContext` (validating the JWT and membership) but did not apply the same `_ALLOWED_ORGANISATION_IDS` guard before returning policy data. A staff user from an organisation not in `_ALLOWED_ORGANISATION_IDS` could receive a `200` response with policies.

### Fix (`23632a4`)

A `403` guard was added to `/policies` before the DB or in-memory policy lookup, matching the pattern already used in `/ask`. The fix rejects any request whose resolved `organisation_id` is not in `_ALLOWED_ORGANISATION_IDS`.

### Tests

Regression tests added in `backend/tests/test_policies_identity.py` covering the wrong-org boundary case. Backend `pytest` passed `117/117` before the fix was committed.

---

## 7. Current Status

| Item | State |
|---|---|
| 4S.90L | **PASSED** with one security fix |
| Public/production auth | Disabled - sandbox proof only |
| Admin proxy | Disabled |
| Demo posture | Unchanged - remains demo-safe |
| Real pilot activation | **Not approved** - see remaining blockers below |

### Remaining blockers before real pilot activation

- No real DPA or governance/legal sign-off
- No production auth activation
- No real staff accounts
- No real Thumhara personal data
- No QCS AI/RAG use without written permission
- RLS policies still need further proof (4S.90M)
- Admin proxy real session guard still needs proof (4S.90N)

---

## 8. Next Recommended Slices

| Slice | Description |
|---|---|
| 4S.90M | RLS policy design and proof in sandbox |
| 4S.90N | Admin proxy real session guard tests |
| 4S.90O | Document/admin debug endpoint response minimisation |
| 4S.90P | Auth proof docs and `current-state.md` alignment |
| Later | Controlled pilot readiness checklist |
