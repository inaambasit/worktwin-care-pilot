# WorkTwin Care Pilot - Admin Proxy Real Session Guard Design

**Slice:** 4S.90N-A
**Date:** 2026-05-08
**Status:** Design and documentation only. No code changes. No database changes.

---

## 1. Summary

4S.90N is about replacing the admin proxy test-only session stub with a real
Supabase Auth and membership guard.

This design does not enable ADMIN_PROXY_ENABLED. This design does not make the
admin proxy production-ready. The public admin proxy remains disabled. No code or
database changes are made in this slice.

The goal is to record the agreed approach so that future implementation slices
(4S.90N-B onwards) can proceed without re-litigating architectural decisions.

---

## 2. Current State

### What the admin proxy route already has

`frontend/app/api/admin/[...path]/route.ts` already contains the following guards,
in order:

1. Disabled guard first -- returns 403 when ADMIN_PROXY_ENABLED is not set.
2. Path allowlist -- typed ADMIN_ALLOWLIST constant; unknown paths return 404.
3. Method guard -- returns 405 for methods not permitted on the matched path.
4. Test-only session seam -- getAdminProxySessionContext() returns a context
   object only when NODE_ENV=test or PLAYWRIGHT_TEST is set; returns null otherwise.
5. Role guard -- returns 401 if session context is null; returns 403 if role is
   not permitted.
6. Route-specific role allowlist -- debug paths restricted to worktwin_dev_admin.
7. CSRF test seam -- returns 403 for POST/PATCH in non-test mode (fail-closed
   stub, not a real CSRF implementation).
8. Upload content-type and size guards -- 415 for wrong content type, 413 for
   oversized body.
9. Audit logging -- structured log entry per proxied request.
10. Cache-Control: no-store on admin proxy responses.

### Session context in non-test mode

getAdminProxySessionContext() currently returns null outside NODE_ENV=test or
PLAYWRIGHT_TEST. In real/non-test mode, even with ADMIN_PROXY_ENABLED=true, the
proxy fails closed with 401 and does not forward. No session validation against
real Supabase Auth is performed.

### Backend admin endpoints

Backend admin endpoints still require ADMIN_TOKEN via _require_admin. The backend
staff auth path already has staff_context_from_header(), jwt_auth.py, and
membership.py available. These are reusable for a backend-side validation endpoint.

---

## 3. Decision

After the 4S.90M-B backend-gated RLS decision, the membership and role authority
remains the backend. The following decisions are confirmed for 4S.90N:

- Do not put SUPABASE_SERVICE_ROLE_KEY into the frontend/Vercel app.
- The Next.js admin proxy must not query organisation_memberships directly using
  a frontend-held service role key.
- Backend remains the membership and role authority.
- The proxy should validate a real Supabase user session server-side, then call a
  backend admin-session validation endpoint using the user's Supabase access token.
- The backend validation endpoint should reuse staff_context_from_header() /
  membership.py to validate JWT, active membership, organisation_id and role.
- The admin proxy should forward to backend admin endpoints with ADMIN_TOKEN only
  after the backend validation endpoint confirms the user is allowed.

This avoids introducing a service role key into the Vercel environment while
keeping all membership and role resolution on the backend where it already exists.

---

## 4. Proposed Request Chain

The following describes the intended request flow once 4S.90N is fully implemented:

1. Browser admin user has a Supabase session.
2. Next.js admin proxy verifies the user session server-side with getUser().
3. Next.js admin proxy obtains the user access token server-side from the
   Supabase SSR session.
4. Next.js admin proxy calls a future backend validation endpoint, for example
   GET /admin/session-check, with Authorization: Bearer <user_access_token>.
5. Backend validates the user token and resolves organisation_memberships.
6. Backend returns a minimal decision response only:
   - allowed: boolean
   - user_id
   - organisation_id
   - role
   - active
   - reason
7. Next.js admin proxy applies existing role and route allowlist checks against
   the returned role and organisation_id.
8. Only then does Next.js proxy forward the original admin request to the backend
   admin route using the server-held ADMIN_TOKEN.
9. Backend admin route still validates ADMIN_TOKEN with _require_admin.

The ADMIN_TOKEN is never exposed to the browser. The service role key is never
held in the frontend/Vercel environment. The browser access token is used only
for the session-check call; it is not forwarded to backend admin routes.

---

## 5. Minimal Backend Validation Endpoint Contract

Design only. No code is written in this slice.

**Proposed endpoint:** GET /admin/session-check

**Authentication:** Authorization: Bearer <Supabase access token>

**Backend implementation approach:**
- Uses staff_context_from_header() to extract and validate the user JWT.
- Requires ctx.organisation_id in _ALLOWED_ORGANISATION_IDS.
- Requires ctx.role in organisation_admin or worktwin_dev_admin.
- Inactive membership already fails through membership.py before role check.

**Response contract:**
- The response must contain no document data, no tokens, no secrets, and no
  private data.
- The response carries only the minimal decision fields needed by the proxy.

**Response examples:**

| Scenario | Response |
|---|---|
| organisation_admin, active membership, demo-org | 200 with allowed: true, role: organisation_admin |
| worktwin_dev_admin, active membership, demo-org | 200 with allowed: true, role: worktwin_dev_admin |
| Missing or invalid token | 401 |
| staff role | 403 with allowed: false |
| registered_manager role | 403 with allowed: false |
| Inactive membership | 403 with allowed: false |
| Wrong organisation | 403 with allowed: false |

The endpoint does not issue new tokens. It does not write any state. It does not
return membership rows, document records, or audit data. Its only purpose is to
confirm whether the caller is an active admin for an allowed organisation.

---

## 6. Frontend Proxy Implementation Direction

Design only. No code is written in this slice.

The following changes are required to getAdminProxySessionContext() and the
surrounding proxy logic in a future implementation slice:

- Replace the test-only behaviour in real mode with server-side Supabase session
  validation using getUser().
- Keep the test seam only for Playwright test mode (NODE_ENV=test or
  PLAYWRIGHT_TEST). Do not widen the test seam.
- Do not trust any role or identity header from the browser in real mode.
- Do not expose ADMIN_TOKEN to any client-side code or response.
- Do not expose service_role key in the frontend environment.
- Do not forward any request to a backend admin route until the backend
  session-check endpoint has returned allowed: true.
- Preserve all existing guards: path allowlist, method guard, role guard,
  route-specific role allowlist, CSRF test seam, upload content-type guard,
  upload size guard, audit logging, Cache-Control: no-store.
- Keep ADMIN_PROXY_ENABLED=false publicly until all tests pass and production
  CSRF is solved.

---

## 7. Test Plan for Future Code Slices

Implementation is broken into small slices to keep each step testable in isolation.

**4S.90N-B:** Backend /admin/session-check unit tests and implementation.

**4S.90N-C:** Frontend admin proxy real session-check integration tests, using
mocked backend validation response.

**4S.90N-D:** Local sandbox E2E with ADMIN_PROXY_ENABLED=true locally only.
This slice must prove:
- No session -> 401
- Staff role -> 403
- registered_manager role -> 403
- Inactive admin -> 403
- Wrong-org admin -> 403
- organisation_admin -> can pass safe document routes only
- organisation_admin -> blocked from debug routes
- worktwin_dev_admin -> can pass debug route guard
- POST/PATCH without real CSRF still blocked

**4S.90N-E:** Production CSRF/same-site design and implementation.

**4S.90N-F:** Response minimisation for admin/debug endpoints.

No implementation slice may set ADMIN_PROXY_ENABLED=true in any public or shared
environment before 4S.90N-D local E2E is complete and 4S.90N-E CSRF is resolved.

---

## 8. Non-Goals

The following are explicitly out of scope for the 4S.90N track:

- Do not enable ADMIN_PROXY_ENABLED in any public or shared environment.
- Do not enable public auth.
- Do not expose service_role key in the frontend or Vercel environment.
- Do not remove ADMIN_TOKEN from backend admin endpoints.
- Do not allow direct browser Supabase table access.
- Do not upload real documents.
- Do not approve real staff or admin pilot activation.
- Do not approve QCS AI/RAG use.

---

## 9. Current Status

- 4S.90N-A design: documented only.
- Admin proxy remains disabled publicly (ADMIN_PROXY_ENABLED not set).
- Admin proxy real session guard is not implemented yet.
- Next code slice should be backend /admin/session-check tests first (4S.90N-B).

---

## 10. Relationship to Previous Docs

This design refines admin-proxy-hardening-plan.md after the 4S.90M-B backend-gated
RLS decision. It does not contradict the older plan. It clarifies that real
membership validation should be backend-mediated rather than adding
SUPABASE_SERVICE_ROLE_KEY to the frontend app.

The older hardening plan (Section 7) described deriving identity by looking up
organisation_memberships from the Next.js route directly. The 4S.90M-B decision
established that the backend remains the membership authority for the controlled
pilot. This document updates the session validation approach accordingly: the proxy
calls a backend session-check endpoint rather than querying the membership table
from the frontend.

All other hardening controls from admin-proxy-hardening-plan.md (path allowlist,
method guard, CSRF, upload guards, audit logging, response minimisation) remain
required and unchanged.
