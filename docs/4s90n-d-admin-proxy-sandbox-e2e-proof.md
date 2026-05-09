# 4S.90N-D - Admin Proxy Sandbox E2E Proof Record

**Slice:** 4S.90N-D
**Date:** 2026-05-09
**Status:** PASSED (expected condition - see Section 4)

> Documentation only. No backend, frontend, test, migration, or environment files were changed in this record.

---

## 1. Summary

4S.90N-D proved the local sandbox admin proxy session-check flow using a real Supabase sandbox
organisation_admin session from the `worktwin-sandbox-dev` sandbox Supabase project.

The proof confirms the full chain:

- The Next.js admin proxy reads the real Supabase server session server-side.
- The proxy calls the backend `/admin/session-check` endpoint with the user access token.
- The backend validates the JWT, resolves the active organisation membership, and confirms the
  organisation_admin role is allowed.
- The proxy receives `role: organisation_admin` and `active: true` from the backend.
- The proxy reaches the final ADMIN_TOKEN forwarding guard.
- With ADMIN_TOKEN intentionally empty, the proxy returns `503 not_configured` and no admin
  backend forwarding occurs.

The `503 not_configured` response is the expected pass condition for this isolation proof. This does
not make production admin access ready.

This was a local sandbox proof only. The Thumhara Centre Supabase project was not involved.

---

## 2. Environment

| Item | Value |
|---|---|
| Git checkpoint | `a740daa` - Support magic link token hash callback |
| Sandbox Supabase project | `worktwin-sandbox-dev` |
| Local frontend | `http://localhost:3000` |
| Local backend | `http://localhost:8000` |

### Local-only flags active during proof

| Flag | Value |
|---|---|
| `NEXT_PUBLIC_PILOT_AUTH_MODE` | `true` |
| `PILOT_AUTH_MODE` | `true` |
| `ADMIN_PROXY_ENABLED` | `true` (local only - not committed or deployed) |
| `ADMIN_TOKEN` | Intentionally empty - to isolate the session guard proof from the forwarding guard |

Env files remained ignored. No secrets were committed. `ADMIN_PROXY_ENABLED=true` was set locally
only during this proof session and was not pushed or deployed to any shared environment.

---

## 3. Proof Evidence

### 3.1 Backend `/admin/session-check` response

```
GET /admin/session-check HTTP/1.1" 200 OK
```

The backend accepted the organisation_admin access token, validated the JWT, resolved the active
organisation membership, and confirmed the role was permitted. The backend returned `200 OK`.

### 3.2 Frontend admin proxy response

```json
{
  "status": 503,
  "reason": "not_configured",
  "role": "organisation_admin",
  "active": true
}
```

The proxy confirmed the session was valid and the role was `organisation_admin` with `active: true`.
The proxy applied the existing role and allowlist checks. The proxy then reached the final ADMIN_TOKEN
forwarding guard. With ADMIN_TOKEN empty, the proxy returned `503 not_configured` rather than
forwarding the request to the backend admin route.

### 3.3 Browser response

```json
{"detail":"Admin proxy not configured."}
```

---

## 4. Pass Condition

The expected pass condition for 4S.90N-D is proof that the session-check chain works end to end and
that the ADMIN_TOKEN guard is the final gate. The expected outcome is `503 not_configured`, not
successful forwarding.

| Step | Expected | Result |
|---|---|---|
| organisation_admin session established in sandbox Supabase | Yes | Confirmed |
| Next.js admin proxy reads real Supabase server session | Yes | Confirmed |
| Proxy calls backend `/admin/session-check` with user access token | Yes | Confirmed |
| Backend validates JWT and resolves active organisation_admin membership | Yes | Confirmed - `200 OK` |
| Proxy receives `role: organisation_admin` and `active: true` | Yes | Confirmed |
| Proxy reaches ADMIN_TOKEN forwarding guard | Yes | Confirmed |
| No forwarding occurs (ADMIN_TOKEN intentionally empty) | Yes | Confirmed - `503 not_configured` |
| No admin backend forwarding happens | Yes | Confirmed |

Status: **PASSED**

---

## 5. Safety Notes

- This was a local sandbox proof only. The Thumhara Centre Supabase project was not involved.
- `ADMIN_PROXY_ENABLED=true` was set locally only during this proof. It was not committed, pushed,
  or deployed.
- Public `ADMIN_PROXY_ENABLED` must remain unset (false) until CSRF controls and response
  minimisation are complete.
- ADMIN_TOKEN was intentionally empty. No admin backend forwarding occurred.
- No emails, tokens, magic links, hashed tokens, cookies, service role keys, JWT secrets, or user
  IDs are recorded in this proof document.
- This proof does not make production admin access ready. Remaining blockers are listed in Section 7.

---

## 6. Current Status

| Item | State |
|---|---|
| 4S.90N-D | **PASSED** (expected condition) |
| Public admin proxy | Disabled - `ADMIN_PROXY_ENABLED` not set publicly |
| Admin proxy real session guard | Real - proven in this slice |
| CSRF guard | Test stub only - 4S.90N-E required |
| Admin response minimisation | Outstanding - 4S.90N-F required |
| Production admin access | **Not ready** - see Section 7 |

---

## 7. Remaining Blockers Before Production Admin Access

The following must be completed before the admin proxy can be enabled in any non-local environment:

- **Real CSRF / same-site protection (4S.90N-E)** - The CSRF guard is still a test-only stub.
  POST/PATCH through the proxy is blocked by the stub in non-test mode. Real same-site CSRF controls
  are required before production use.
- **Admin response minimisation (4S.90N-F)** - Admin and debug endpoint responses must be reviewed
  and minimised before production exposure.
- **Production auth and admin rollout controls** - No production auth is active. No real staff or
  admin accounts have been onboarded. No DPA is in place. All items in `docs/current-state.md`
  Section 6 remain in force.

---

## 8. Next Recommended Slices

| Slice | Description |
|---|---|
| 4S.90N-E | Real CSRF / same-site protection design and implementation |
| 4S.90N-F | Admin and debug endpoint response minimisation |
| Later | Controlled pilot readiness checklist |
