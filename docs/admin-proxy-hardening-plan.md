# WorkTwin Care Pilot - Admin Proxy Hardening Plan

**Milestone:** 4S.84
**Date:** 2026-05-03
**Status:** Design document only. No code implemented by this milestone.

---

## 1. Purpose

The admin proxy at `frontend/app/api/admin/[...path]/route.ts` was introduced in
milestone 4S.2A to keep the backend bearer token server-side. While
`ADMIN_PROXY_ENABLED=false`, this goal is met: all requests to `/api/admin/...`
return a 403 response before any forwarding logic runs.

The proxy is safe only while it is disabled. The moment `ADMIN_PROXY_ENABLED=true`
is set on a public deployment, the proxy becomes a privileged backend-to-backend
tunnel. In that state, any HTTP client that can reach the public Next.js URL can
forward arbitrary requests to the backend, authenticated as the server-held
`ADMIN_TOKEN`, without providing any user credential. There is no admin session
validation, no path allowlist, no method restriction, and no CSRF protection
standing between an unauthenticated visitor and a full-permission admin operation
on the Thumhara Centre document registry.

The consolidated roadmap (4S.78) and the Codex strict review (4S.76) both identify
this as a critical gap. The pilot security boundary design (4S.83) commits to
designing the hardening controls in 4S.84 and implementing them in 4S.85.

This document is that design. It defines the specific controls that must be
implemented before the proxy can be safely enabled on any deployment where real
Thumhara Centre documents or real admin accounts exist. It is a design prerequisite
for 4S.85 implementation.

---

## 2. Non-Goals for Milestone 4S.84

The following are explicitly out of scope for this milestone.

- **No proxy implementation.** The route at
  `frontend/app/api/admin/[...path]/route.ts` is not to be modified in 4S.84.
- **No auth implementation.** No Supabase Auth integration, session middleware,
  JWT validation, or login screens are to be created in 4S.84.
- **No admin upload access.** No real Thumhara Centre documents are to be uploaded.
- **No enabling `ADMIN_PROXY_ENABLED`.** The flag remains false on all public
  deployments.
- **No changes to admin UI.** No admin screens are to be enabled or modified.
- **No backend route changes.** The FastAPI backend is not to be altered in 4S.84.
- **No real documents.** No service-user records, MAR charts, care plans, HR files,
  payroll data, or private case files are to enter the system.

---

## 3. Current Proxy Behaviour

### Route and exported methods

`frontend/app/api/admin/[...path]/route.ts` exports three handlers:

- `GET` - calls `proxyHandler`
- `POST` - calls `proxyHandler`
- `PATCH` - calls `proxyHandler`

The route catches any path under `/api/admin/` via the `[...path]` catch-all
segment. Every matched request goes through the single `proxyHandler` function.

### What the current route does

1. Checks `ADMIN_PROXY_ENABLED`. If false, returns 403.
2. Checks that `ADMIN_TOKEN` and `BACKEND_URL` are set. If not, returns 503.
3. Builds `backendPath` from `params.path.join('/')` with no validation or
   filtering. Any path the caller supplies is forwarded.
4. Appends the original query string.
5. Attaches `Authorization: Bearer <ADMIN_TOKEN>` from the server-side environment.
6. Forwards the `Content-Type` header verbatim (to preserve multipart boundaries
   for upload).
7. For non-GET requests, reads the full request body as a blob and forwards it
   unchanged.
8. Returns the upstream response blob and status code.

`BACKEND_URL` is resolved from `API_BASE_URL` first, then `NEXT_PUBLIC_API_URL`.

### Current risks

The following risks exist if `ADMIN_PROXY_ENABLED` were set to true on a public
deployment without further changes.

**Unauthenticated admin access.** There is no admin session validation. Any visitor
to the public URL who constructs a request to `/api/admin/<any-path>` is forwarded
to the backend as the bearer-token holder. The proxy grants full backend admin
access to the general public.

**No path allowlist.** `backendPath` is constructed directly from the URL path
segments with no validation. An attacker can target any backend endpoint, not only
intended admin endpoints.

**No method/path pair restriction.** The same function handles GET, POST, and
PATCH for every path. A path that should only accept GET can also be called with
a state-changing PATCH or POST request.

**No CSRF protection.** There are no same-site session controls, CSRF tokens, or
origin checks on state-changing methods. A malicious page could trigger a
cross-origin admin request if the proxy were enabled.

**No request size limits.** There is no cap on the request body size forwarded to
the backend. A large POST or multipart upload is forwarded without restriction.

**No content-type restriction.** Any content type is forwarded. An upload route
intended only for multipart/form-data can receive JSON or arbitrary binary.

**No audit logging.** No record is made of which paths are called, which methods
are used, who called them, or what happened.

**No response minimisation.** Debug responses containing chunk IDs, similarity
scores, storage keys, or internal document metadata are returned in full to whoever
calls the proxy.

---

## 4. Required Hardening Controls

The following controls must be implemented before `ADMIN_PROXY_ENABLED` is set
to true on any deployment handling real Thumhara Centre data.

### 4.1 Admin session validation before forwarding

Every request must be validated against a server-side Supabase Auth session before
any forwarding logic runs. Checking that `ADMIN_PROXY_ENABLED=true` is not a
session check. A valid, non-expired session must exist, and the session must
identify a user with an admin or developer role in the Thumhara Centre organisation.
A missing session, an expired session, or a session held by a staff-role user must
all result in a 401 response, with no forwarding.

### 4.2 Server-side role check

After session validation, the route must perform a role lookup against the
`organisation_memberships` table using the `user_id` from the verified session.
The role must be read from the database; it must not be accepted from a request
header, query parameter, or body field.

Two admin roles are recognised:

- **Organisation Admin (Thumhara Centre):** Can access document management paths
  scoped to their organisation. Cannot access debug or developer tooling endpoints.
- **WorkTwin Developer / Admin:** Can access all permitted paths, including debug
  endpoints, vector search, and answer-debug tooling.

An inactive membership (`active=false`) must fail closed with a 403 response.

### 4.3 Path allowlist

Only paths explicitly listed in the allowlist may be forwarded. Any path not in
the allowlist must return a 404 response. This denies access to any backend
endpoint not deliberately opened, including any internal routes, configuration
paths, or future endpoints added to the backend.

The allowlist is a defined constant in the route implementation, not a runtime
configuration value. Changes to the allowlist require a code change and deployment.

### 4.4 Method/path pair allowlist

For each allowed path, the permitted HTTP methods are defined explicitly. A request
to an allowed path using a method not listed for that path must return a 405
response. For example, a path that may only be fetched with GET must not be
reachable with POST or PATCH.

### 4.5 CSRF protection and same-site session controls for state-changing methods

State-changing methods (POST and PATCH) must require same-site session controls
and/or a CSRF token. This prevents cross-origin requests from exploiting an admin
session. Checking that `ADMIN_TOKEN` is server-side does not protect against CSRF
because the token is applied automatically by the proxy itself; it is the session
cookie that could be replayed cross-origin.

### 4.6 Origin and Referer checks

Where it adds meaningful defence, the proxy should validate the `Origin` or
`Referer` header on state-changing requests. These checks should reject requests
originating from outside the expected deployment domain. They should be treated
as a supplementary layer, not the primary CSRF defence.

### 4.7 Request size limits

The proxy must enforce a maximum request body size per path. Upload routes need a
practical limit (for example, 10 MB for the pilot scope). Non-upload routes should
have a much smaller limit (for example, 64 KB). Requests exceeding the limit must
be rejected before forwarding.

### 4.8 Content-type restrictions for upload routes

The upload route (`POST /documents/upload`) must only accept `multipart/form-data`
requests. Requests with any other content type must be rejected with a 415 response.
Other routes should accept only the content types they legitimately require (for
example, `application/json` for PATCH governance updates).

### 4.9 Response minimisation for debug and admin routes

Debug endpoints return source previews, chunk IDs, similarity scores, storage
configuration keys, and other internal metadata. The proxy must not return these
verbatim to Organisation Admin users. Responses from debug paths must be stripped
of fields that are only useful to developer tooling before being returned. Where
minimisation is not practical, the route must be restricted to WorkTwin Developer /
Admin only, so that Organisation Admin users cannot reach it.

### 4.10 Audit logging without sensitive content

Every request through the hardened proxy must produce a structured audit log entry.
The entry must include the request ID, the resolved route key (from the allowlist,
not the raw path), the method, the response status, the latency, the actor role,
and the `organisation_id`. It must not include raw query text, source previews,
document content, private notes, or personal data.

---

## 5. Proposed Path Allowlist

The following table defines the intended proxy paths. All other paths are denied.
Debug and developer tooling paths are restricted to the WorkTwin Developer / Admin
role only. Organisation Admins have no access to these paths.

| Allowed Path                         | Methods         | Role Allowed                        | Purpose                                                           | Risk Notes                                                                              |
|--------------------------------------|-----------------|-------------------------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `documents`                          | GET             | Org Admin, WorkTwin Dev / Admin     | List documents in the registry for this organisation              | Must be filtered by organisation_id from session. No cross-organisation access.         |
| `documents/upload`                   | POST            | Org Admin, WorkTwin Dev / Admin     | Upload a new policy document for governance review                | Multipart/form-data only. Size limit enforced. New documents default to locked-down state. |
| `documents/{id}`                     | GET, PATCH      | Org Admin, WorkTwin Dev / Admin     | Fetch or update document metadata and governance flags            | PATCH requires CSRF/same-site control. organisation_id must match session.              |
| `documents/{id}/governance`          | PATCH           | Org Admin, WorkTwin Dev / Admin     | Update governance gate fields (visibility, AI answers, embedding) | CSRF/same-site control required. Must not unlock gates without human review recorded.   |
| `documents/{id}/generate-embeddings` | POST            | Org Admin, WorkTwin Dev / Admin     | Trigger embedding generation for an approved document             | Only permitted when approved_for_embedding is already true. Rate-limit per document.    |
| `documents/search-vector`            | POST            | WorkTwin Dev / Admin only           | Developer vector search tool for testing retrieval quality        | Exposes chunk IDs, similarity scores, source previews. Must not reach Org Admin.        |
| `documents/answer-debug`             | POST            | WorkTwin Dev / Admin only           | Developer answer-debug tool showing retrieval and prompt details  | Exposes full source chunks, scoring metadata, and prompt details. Developer use only.   |
| `debug/storage-config`               | GET             | WorkTwin Dev / Admin only           | Read storage configuration and bucket status for debugging        | Exposes storage keys, bucket names, configuration. Must never reach Org Admin.          |

Notes:

- `{id}` in the table means a document identifier. The proxy must validate that the
  provided identifier is a valid format before forwarding (for example, a UUID or
  positive integer; no path traversal characters).
- The Organisation Admin role must not reach `search-vector`, `answer-debug`, or
  `debug/storage-config` under any circumstances.
- `documents/upload` must be restricted to `multipart/form-data` with an enforced
  size limit and must only operate within the admin's own organisation.

---

## 6. Deny-by-Default Rule

Once hardened, the proxy must operate on a deny-by-default basis.

- Any request to a path not explicitly listed in the allowlist must return a 404
  response. The proxy must not forward the request, must not return a 403 with path
  details that could confirm the path exists, and must not log the caller-supplied
  path in any user-visible response.
- Any request to an allowed path using a method not permitted for that path must
  return a 405 response.
- No catch-all forwarding is permitted. The existing `params.path.join('/')` logic,
  which forwards any path the caller supplies, must be replaced with a strict lookup
  against the allowlist before any forwarding occurs.

This is the opposite of the current behaviour, which forwards anything. Every
forwarding decision must be a deliberate, explicit permission, not a default.

---

## 7. Admin Session Validation Design

This design builds on the Supabase Auth decision made in milestone 4S.83.

### Deriving identity from the verified session

On every request to the proxy, the Next.js route handler must:

1. Extract the session token from the `httpOnly` session cookie (or equivalent
   secure server-side store set by Supabase Auth).
2. Validate the session with Supabase Auth server-side. An expired or revoked
   session must fail the request with a 401 response.
3. Derive `user_id` from the verified session JWT `sub` claim.
4. Look up the active `organisation_memberships` record for this `user_id` to
   derive `organisation_id` and `role`.
5. Check that the membership is active (`active=true`). An inactive membership
   must fail with a 403 response.

The proxy must not accept `user_id`, `organisation_id`, or `role` from any
client-supplied source: not from the request body, not from a query parameter,
not from a request header set by the browser. These values must come from the
server-side session only.

### Role-based forwarding decision

After deriving role and organisation_id, the proxy looks up the requested path
in the allowlist. It then checks whether the verified role permits access to that
path. If the role is not permitted for that path, the proxy returns a 403 response
without forwarding.

Organisation Admin users may only act within their own `organisation_id`. The proxy
must verify that the `organisation_id` derived from the session matches the
organisation implied by the document ID or path being accessed before forwarding.
No cross-organisation proxy request is permitted.

WorkTwin Developer / Admin users may access developer tooling paths that are
unavailable to Organisation Admin users. This role must not be assigned to any
Thumhara Centre staff or admin user. It is internal to the WorkTwin team.

---

## 8. CSRF and Browser-Safety Design

### Why ADMIN_TOKEN alone is not enough

The server-held `ADMIN_TOKEN` protects the backend from direct public access.
It does not protect against CSRF. If an admin user has a valid session cookie and
a malicious cross-origin page causes their browser to make a request to
`/api/admin/documents/<id>/governance`, the proxy will receive the cookie, validate
the session, and forward the request - because the token is applied by the proxy
itself and is not something the attacker needs to know. The attacker only needs the
admin's browser to make the request.

### State-changing method requirements

Every POST and PATCH request through the hardened proxy must satisfy at least one
of the following:

- A double-submit CSRF token: the admin UI sends a token in a custom header (for
  example, `X-CSRF-Token`) that matches a value stored in the session. The proxy
  validates the token before forwarding.
- SameSite=Strict or SameSite=Lax cookie attribute on the session cookie, combined
  with an origin check that rejects requests from domains other than the deployment
  origin.

In practice, both layers should be present. Neither alone is sufficient for a
deployment that may run on a shared domain or behind a CDN.

### GET requests must not mutate state

No state mutation (document creation, governance flag changes, embedding triggers)
may be accessible via a GET request through the proxy. This is enforced by the
method/path pair allowlist. GET routes must be implemented as read-only on the
backend as well.

### Uploads and governance PATCH

These are the highest-risk state-changing operations. A malicious PATCH to
`documents/{id}/governance` could approve an unapproved document for staff
visibility. A malicious POST to `documents/upload` could introduce a document
without human review. Both must require same-site controls and CSRF token
validation before forwarding.

---

## 9. Upload-Specific Controls

### Who can upload

Upload access is restricted to the Organisation Admin and WorkTwin Developer /
Admin roles. No staff-role user may reach the upload path through the hardened
proxy.

### Content-type enforcement

The upload route must only accept `multipart/form-data` requests. The `Content-Type`
header must begin with `multipart/form-data`. Any request with a different content
type must be rejected with a 415 response before the body is read or forwarded.

### Size limit

The proxy must enforce a maximum upload body size appropriate for pilot document
volumes. A 10 MB limit covers typical care policy PDFs. Requests exceeding this
limit must be rejected before forwarding. The backend may also enforce its own
limit; both limits should apply.

### Default governance state

New documents uploaded through the proxy must default to the locked-down state
established by the upload pipeline:
`is_real_document=false`, `is_dummy_document=true`, `status=pending`,
`approved_for_embedding=false`, `approved_for_staff_visibility=false`,
`approved_for_ai_answers=false`. This default is a structural safety guarantee
and must not be weakened by the proxy or the backend route.

No document may be surfaced to Thumhara Centre staff or used in a source-grounded
AI answer without an explicit, deliberate governance approval action by a named,
authorised reviewer.

### Prohibited document types

The following must not be uploaded under any circumstances, regardless of the
governance gate state:

- Service-user care plans, risk assessments, or support plans.
- MAR (Medicine Administration Record) charts or controlled drug records.
- Staff HR files, appraisal records, sickness records, or employment contracts.
- Payroll or financial records.
- Private correspondence between staff and management.
- Disciplinary investigation notes or grievance records.
- Safeguarding referrals, incident reports, or serious concern documentation.
- Any document containing names, addresses, dates of birth, NHS numbers, or
  National Insurance numbers of service users or staff.

### Later hardening items

The pattern-based personal-data scan in the upload endpoint uses a 2,000 character
preview and will produce false negatives. The following hardening items are deferred
to later milestones but must be planned:

- Malware scanning at upload time (for example, using ClamAV or a cloud-hosted
  scanner) before the file is written to Supabase Storage.
- Full-text personal-data scanning across the whole document, not only the first
  2,000 characters, using a privacy-focused scanning service or structured PII
  detection model.

---

## 10. Debug and Tooling Controls

The following paths expose internal system metadata and must be restricted to the
WorkTwin Developer / Admin role. They must not be accessible to Thumhara Centre
Organisation Admins.

- **`documents/search-vector`:** Exposes chunk IDs, similarity scores, source
  previews, and embedding match details. This is developer tooling for testing
  retrieval quality. It must not be surfaced to care organisation users.
- **`documents/answer-debug`:** Exposes the full retrieval context, chunk content,
  prompt structure, and scoring metadata for a given query. This is developer
  tooling. It must not be surfaced to care organisation users.
- **`debug/storage-config`:** Exposes bucket names, storage keys, and configuration
  details. A care organisation admin has no legitimate use for this information.

These endpoints should additionally be disabled unless `DEBUG_ENDPOINTS_ENABLED`
is explicitly set in the deployment environment. They should not be reachable on
a Thumhara Centre production deployment. A WorkTwin developer accessing these
endpoints does so from a developer-controlled environment, not from the live
pilot URL.

---

## 11. Logging and Monitoring

### What to log

Every request processed by the hardened proxy must produce a structured audit log
entry containing:

- `request_id` - a correlation ID carried through the full request/response cycle.
- `route_key` - the matched key from the allowlist, not the raw caller-supplied path.
- `method` - the HTTP method.
- `status` - the HTTP response status returned.
- `latency_ms` - time from request entry to response.
- `actor_role` - the role derived from the verified session.
- `organisation_id` - the organisation derived from the verified session.

### What not to log

The following must not appear in any log output, log file, or monitoring service:

- Raw query text submitted by any user.
- Source preview text from document chunks.
- Document content, private notes, or personal data of any kind.
- The raw value of `ADMIN_TOKEN` or any session token.
- Individual document text from upload payloads.

### Alerting

Automated alerts should fire on the following conditions:

- Denied admin proxy attempts: repeated 401 or 403 responses on admin proxy routes,
  particularly for paths not in the allowlist.
- Repeated upload failures: multiple 400 or 415 responses on the upload path from
  the same session in a short window.
- Repeated 403/405 responses: may indicate scanning or probing of admin routes.
- Suspicious path attempts: requests for paths that are not in the allowlist and
  that match patterns associated with backend route traversal.

---

## 12. Implementation Sequence for 4S.85 or Later

The following tasks must be completed in order before `ADMIN_PROXY_ENABLED` is set
to true on any deployment handling real Thumhara Centre data.

1. **Add admin session extraction.** Read and validate the Supabase Auth session
   from the server-side `httpOnly` cookie on every request to the proxy route.
2. **Add role and membership lookup.** Look up the active `organisation_memberships`
   record for the session's `user_id`. Derive `organisation_id` and `role`.
3. **Define the allowlist object.** Implement the path/method/role allowlist as a
   typed constant in the route. Include all paths from Section 5.
4. **Reject unknown paths.** Replace `params.path.join('/')` catch-all forwarding
   with a strict allowlist lookup. Return 404 for any path not in the allowlist.
5. **Reject disallowed methods.** Return 405 for any method not permitted for the
   matched path.
6. **Add CSRF and same-site checks.** Validate origin/referer and CSRF token on all
   POST and PATCH requests before forwarding.
7. **Add upload-specific guards.** Enforce `multipart/form-data` content type and
   request size limit on the upload route.
8. **Add response minimisation.** Strip debug metadata from responses before
   returning them to Organisation Admin users where applicable.
9. **Add structured audit logging.** Emit the log entry defined in Section 11 for
   every proxied request.
10. **Write tests.** Cover all scenarios in the test plan below.
11. **Enable in a controlled environment only.** Set `ADMIN_PROXY_ENABLED=true`
    first on a non-production developer environment. Validate all controls manually
    before any consideration of enabling on the Thumhara Centre pilot deployment.

No step may be skipped. Steps 1-5 are the minimum before any forwarding is safe.
Steps 6-10 are required before any state-changing admin operation is permitted.

---

## 13. Test Plan

The following tests must be written and passing before `ADMIN_PROXY_ENABLED` is
set to true on the Thumhara Centre pilot deployment.

| Test case                                           | Expected result                                                    |
|-----------------------------------------------------|--------------------------------------------------------------------|
| Proxy disabled (`ADMIN_PROXY_ENABLED=false`)        | All `/api/admin/*` requests return 403, no forwarding.             |
| Unauthenticated request (no session cookie)         | 401 response, no forwarding.                                       |
| Authenticated staff-role user                       | 403 response, no forwarding.                                       |
| Authenticated Registered Manager role               | 403 response, no forwarding.                                       |
| Inactive membership (`active=false`)                | 403 response, no forwarding.                                       |
| Org Admin requests `GET documents`                  | 200 response, forwarded, results scoped to their organisation_id.  |
| Org Admin requests `POST documents/search-vector`   | 403 response, not forwarded (debug path denied for Org Admin).     |
| Org Admin requests `GET debug/storage-config`       | 403 response, not forwarded.                                       |
| WorkTwin Dev/Admin requests `POST documents/search-vector` | 200 response, forwarded.                                    |
| Request for unknown path                            | 404 response, no forwarding.                                       |
| DELETE method on an allowed path                    | 405 response, no forwarding.                                       |
| POST `/documents/upload` with `application/json`    | 415 response, no forwarding (wrong content type).                  |
| POST `/documents/upload` with body over size limit  | 413 response, no forwarding.                                       |
| PATCH request without CSRF/same-site control        | 403 response, no forwarding.                                       |
| Org Admin attempts to access documents of another organisation | 403 response, no forwarding.                          |
| Session token expired                               | 401 response, no forwarding.                                       |

---

## 14. Current Code Hygiene Note

The comments in `frontend/app/api/admin/[...path]/route.ts` contain visible UTF-8
mojibake (encoding artefacts visible as garbled characters). These should be
corrected when the route file is next modified as part of the 4S.85 implementation.
This milestone must not edit the route file.

---

## 15. Decision Summary

The following decisions are confirmed by this design document.

**`ADMIN_PROXY_ENABLED` stays false.** No change to this flag is made in 4S.84.
It must remain false on all public deployments until every control in this plan
is implemented and tested.

**No public admin upload until hardening is implemented.** No Thumhara Centre
policy document upload via the admin proxy may occur until admin session
validation, the path allowlist, method restrictions, and CSRF controls are all
in place and verified.

**The proxy must become deny-by-default.** The current catch-all forwarding
behaviour (`params.path.join('/')`) must be replaced with explicit allowlist
lookup before any forwarding takes place.

**Debug routes are WorkTwin developer tooling only.** `documents/search-vector`,
`documents/answer-debug`, and `debug/storage-config` must not be accessible to
Thumhara Centre Organisation Admins under any circumstances.

**4S.85 implementation must follow this plan.** The implementation milestone must
build on the authentication foundation designed in 4S.83 and harden the proxy
according to the controls, allowlist, session model, and test plan defined here.
Any deviation during implementation must be agreed and documented before code
is written.
