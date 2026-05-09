# 4S.90N-E - Admin Proxy CSRF / Same-Origin Guard Proof Record

**Slice:** 4S.90N-E
**Date:** 2026-05-09
**Status:** PASSED

> Three frontend files changed. No backend, migration, environment, package, SQL, governance,
> or production enablement files were changed. No code changes are made in this record.

---

## 1. Summary

4S.90N-E replaced the test-only CSRF stub in the Next.js admin proxy with a real same-origin /
fetch-metadata CSRF guard.

The guard applies to state-mutating admin proxy requests (POST and PATCH) only. GET requests remain
CSRF-bypassed because they are read-only. DELETE requests are blocked by the method allowlist before
CSRF is ever checked.

The implementation inspects the `Sec-Fetch-Site` header (the fetch-metadata standard) as the primary
signal. If `Sec-Fetch-Site` is absent it falls back to comparing the `Origin` header against the
request origin. If neither header is present the request fails closed. Only `same-origin` is accepted.

13 targeted CSRF tests passed. The full E2E public-demo suite passed: 40 passed, 37 skipped, 0 failed.

The admin proxy remains disabled publicly. Admin response minimisation (4S.90N-F) remains the next
outstanding blocker before non-local admin proxy enablement.

---

## 2. Commit and Scope

| Item | Value |
|---|---|
| Commit | `185b07e` |
| Commit message | Add same-origin CSRF guard for admin proxy |
| Branch | `main` |

### Files changed

| File | Role |
|---|---|
| `frontend/app/api/admin/[...path]/route.ts` | Implemented the same-origin / fetch-metadata CSRF guard |
| `frontend/tests/admin-proxy.spec.ts` | Added 13 targeted CSRF tests covering the new guard |
| `frontend/tests/middleware-pilot-auth.spec.ts` | Stabilised the existing public-demo loop only — added `test.setTimeout(60_000)` and `waitUntil: 'domcontentloaded'`; no guard or application behaviour changed |

No backend, migration, environment, package, SQL, governance, or production enablement files changed.

---

## 3. Implementation Behaviour

### 3.1 Method scope

| Method | CSRF guard applied | Reason |
|---|---|---|
| POST | Yes | State-mutating |
| PATCH | Yes | State-mutating |
| GET | No - CSRF-bypassed | Read-only; safe method |
| DELETE | No - method-blocked by allowlist before CSRF | Blocked before CSRF check reaches it |

### 3.2 Sec-Fetch-Site header (primary signal)

| Sec-Fetch-Site value | Result |
|---|---|
| `same-origin` | Accepted |
| `same-site` | Rejected - 403 |
| `cross-site` | Rejected - 403 |
| `none` | Rejected - 403 |
| Any other value | Rejected - 403 |
| Header absent | Falls back to Origin check |

### 3.3 Origin header fallback (Sec-Fetch-Site absent)

| Origin value | Result |
|---|---|
| Matches `new URL(request.url).origin` exactly | Accepted |
| Does not match | Rejected - 403 |
| Header absent (and Sec-Fetch-Site also absent) | Rejected - 403 (fails closed) |

### 3.4 Test seam

The `x-worktwin-test-csrf: test` header bypasses the guard only when `NODE_ENV=test` or
`PLAYWRIGHT_TEST` is set. It is not active in any other environment.

### 3.5 Response and logging

- All rejected requests return `403 { "detail": "CSRF check failed." }`.
- No raw `Origin`, `Referer`, session tokens, or secret values are written to any log.

---

## 4. Pass Condition

### 4.1 CSRF behaviour matrix

| Scenario | Expected | Result |
|---|---|---|
| POST with Sec-Fetch-Site: same-origin | Accepted - passes to next guard | PASSED |
| POST with Sec-Fetch-Site: cross-site | Rejected - 403 | PASSED |
| POST with Sec-Fetch-Site: same-site | Rejected - 403 | PASSED |
| POST with Sec-Fetch-Site: none | Rejected - 403 | PASSED |
| POST with Sec-Fetch-Site absent and Origin matches | Accepted | PASSED |
| POST with Sec-Fetch-Site absent and Origin mismatch | Rejected - 403 | PASSED |
| POST with Sec-Fetch-Site absent and Origin absent | Rejected - 403 (fails closed) | PASSED |
| PATCH with Sec-Fetch-Site: same-origin | Accepted | PASSED |
| PATCH with Sec-Fetch-Site: cross-site | Rejected - 403 | PASSED |
| GET request | CSRF-bypassed | PASSED |
| Test seam active in NODE_ENV=test | Bypass accepted | PASSED |
| Test seam active outside test env | Bypass rejected | PASSED |
| Test seam header absent | Guard runs normally | PASSED |

### 4.2 Test results

| Suite | Result |
|---|---|
| Targeted CSRF tests | 13 / 13 passed |
| Full E2E public-demo suite | 40 passed, 37 skipped, 0 failed |

The `middleware-pilot-auth` public-demo loop was stabilised with `test.setTimeout(60_000)` and
`waitUntil: 'domcontentloaded'` during this slice. This was a test stability change only; it did not
alter any application or guard behaviour.

Status: **PASSED**

---

## 5. Safety Boundaries

- This is a same-origin / fetch-metadata guard. It is not a full synchronizer-token CSRF system.
- POST and PATCH are guarded. GET is explicitly CSRF-bypassed (read-only). DELETE is method-blocked
  by the allowlist before CSRF is checked.
- The guard fails closed: if neither `Sec-Fetch-Site` nor `Origin` is present, the request is
  rejected with 403.
- No raw `Origin`, `Referer`, session tokens, or secret values are written to any log in any
  guard path.
- The test seam (`x-worktwin-test-csrf: test`) is active only when `NODE_ENV=test` or
  `PLAYWRIGHT_TEST` is set. It is not reachable in production or staging.
- The admin proxy remains disabled publicly (`ADMIN_PROXY_ENABLED` not set in any deployed
  environment). This slice does not change that.
- This slice does not introduce any production readiness claim. Admin response minimisation and
  real production rollout controls remain outstanding.

---

## 6. Current Status

| Item | State |
|---|---|
| 4S.90N-E | **PASSED** |
| Public admin proxy | Disabled - `ADMIN_PROXY_ENABLED` not set publicly |
| Admin proxy real session guard | Real - proven in 4S.90N-D |
| CSRF guard | Real same-origin / fetch-metadata guard - implemented in this slice |
| Admin response minimisation | Outstanding - 4S.90N-F required |
| Production admin access | **Not ready** - see Section 7 |

---

## 7. Remaining Blockers Before Non-Local Admin Proxy Enablement

The following must be completed before the admin proxy can be enabled in any non-local environment:

- **Admin response minimisation (4S.90N-F)** - Admin and debug endpoint responses must be reviewed
  and minimised before production exposure. Response content, field scope, and error verbosity must
  be audited to ensure no internal detail leaks to the proxy caller.
- **Production auth and admin rollout controls** - No production auth is active. No real staff or
  admin accounts have been onboarded. No DPA is in place. All items in `docs/current-state.md`
  Section 6 remain in force.

---

## 8. Next Recommended Slice

| Slice | Description |
|---|---|
| 4S.90N-F | Admin and debug endpoint response minimisation |
| Later | Controlled pilot readiness checklist |
