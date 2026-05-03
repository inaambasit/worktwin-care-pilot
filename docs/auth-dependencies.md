# WorkTwin Care Pilot - Auth Dependencies and Environment Plan

**Milestone:** 4S.85B
**Date:** 2026-05-03
**Status:** Documentation only. No packages installed. No environment files changed.
**Depends on:** 4S.85A (auth-implementation-checklist.md), 4S.83 (pilot-security-boundary.md), 4S.84 (admin-proxy-hardening-plan.md)

---

## 1. Purpose

This document is the dependency and environment planning step for Supabase Auth integration
in the WorkTwin Care Pilot. It must exist and be reviewed before any package is installed,
any lock file is updated, or any environment file is edited.

The reason this step is separate from implementation is that dependency changes are hard to
reverse cleanly. A package installed into package.json or requirements.txt sets a version
constraint that interacts with every other pinned dependency in the project. An environment
variable added prematurely to .env.example sets an expectation about naming and ownership
before the design is confirmed. Both changes can introduce subtle compatibility problems or
scope confusion that are easier to prevent than to fix.

This document answers three questions before any code is written:

1. Which packages are needed, and why?
2. Which environment variables are needed, who owns them, and what are the safe defaults?
3. What are the risks of getting either wrong?

Codex reviews this document before 4S.85C begins. No code is written in 4S.85B.

---

## 2. Non-Goals

The following are explicitly out of scope for milestone 4S.85B. Any action in this list
must not be taken, directly or indirectly, as part of this milestone.

- No package installation. No changes to frontend/package.json, frontend/package-lock.json,
  or backend/requirements.txt.
- No .env.example changes. The environment file is not edited, appended, or reformatted.
- No application code changes. No frontend files, no backend files, no API routes, no
  middleware, no session helpers, no login pages.
- No SQL migrations. No new tables, no schema changes, no files in backend/sql/.
- No Supabase dashboard changes. No Auth configuration, no project settings, no redirect
  URLs, no email templates, no RLS policies.
- No authentication implementation of any kind.
- No enabling of pilot-auth mode. NEXT_PUBLIC_PILOT_AUTH_MODE and PILOT_AUTH_MODE remain
  absent from all environment files.
- No enabling of admin demo screens. NEXT_PUBLIC_ADMIN_DEMO_ENABLED and ADMIN_PROXY_ENABLED
  remain false.
- No real Thumhara Centre staff accounts. No real Thumhara Centre policy documents.

---

## 3. Current Stack Baseline

### Frontend

- Framework: Next.js 14.2.5, App Router, TypeScript, Tailwind CSS.
- Deployment: Vercel.
- Production runtime dependencies (from frontend/package.json): next 14.2.5, react ^18,
  react-dom ^18, lucide-react ^0.390.0.
- No Supabase client package is present in frontend/package.json.
- No session middleware, no cookie helpers, no auth context exist in the frontend.

### Backend

- Framework: FastAPI 0.115.6, Python, Uvicorn 0.34.0, Pydantic 2.10.4.
- Deployment: Render.
- Dependencies (from backend/requirements.txt): fastapi==0.115.6, uvicorn==0.34.0,
  pydantic==2.10.4, python-multipart==0.0.20, supabase==2.5.0, pypdf==4.3.1,
  httpx==0.27.2, openai (unpinned).
- The supabase Python client (supabase==2.5.0) is already installed. It provides
  Supabase database, storage, and admin operations. It does not currently perform JWT
  validation in the backend.

### Data and storage

- Supabase Postgres with pgvector for document embeddings.
- Supabase private storage bucket for uploaded documents.
- Supabase Auth is not yet enabled on the project. No auth tables, no users, no JWT
  issuance, no session management.

### Current demo state

- The existing admin proxy (frontend/app/api/admin/[...path]/route.ts) remains disabled
  publicly. ADMIN_PROXY_ENABLED=false is the current state and must remain so throughout
  4S.85B.
- The public demo shows placeholder responses on /ask and five sample documents on
  /policies. This must continue to work unchanged after 4S.85B.
- Staff identity is currently derived from PILOT_USER_ID and PILOT_USER_ROLE environment
  variables via _get_pilot_staff_context in backend/app/main.py. This approach remains
  in place for the demo path and is not removed until 4S.85F.

---

## 4. Frontend Auth Dependencies

The following packages are expected to be needed for Supabase Auth in the Next.js 14
App Router frontend. None are installed in 4S.85B. Exact versions must be checked against
the current frontend/package.json and the Supabase release notes before any installation
in a later milestone.

### @supabase/supabase-js

**Why needed:** This is the core Supabase JavaScript client library. It provides the
Supabase Auth API methods used on the server and client sides: signInWithOtp (magic link
request), exchangeCodeForSession (callback handler), signOut (logout), and getUser
(session retrieval). Without this package, no Supabase Auth method is callable from
the Next.js application.

**Likely version range:** The current Supabase Python client is v2.5.0, which corresponds
to the v2 generation of the Supabase SDKs. The JavaScript client equivalent is v2.x.
The exact version must be confirmed at installation time against the latest stable release
and checked for compatibility with Next.js 14.2.5.

**Risk if wrong version:** Supabase v1 and v2 have incompatible APIs. Installing v1 of
@supabase/supabase-js would require a different authentication call pattern and would not
be compatible with the @supabase/ssr helpers (see below). The version must be v2.

### @supabase/ssr

**Why needed:** This package provides the Next.js App Router-specific session cookie
helpers. It wraps @supabase/supabase-js and exposes createServerClient and
createBrowserClient functions that correctly handle httpOnly session cookies in the
Next.js server context, including edge runtime compatibility for Next.js middleware. It
is the replacement for the older @supabase/auth-helpers-nextjs package for App Router
projects.

Without @supabase/ssr, there is no supported way to read and write Supabase Auth session
cookies from Next.js server components and route handlers using the patterns expected by
the session model in docs/pilot-security-boundary.md Section 7.

**Likely version range:** @supabase/ssr is a newer package. The version must be confirmed
at installation time. It must be compatible with the @supabase/supabase-js version
installed alongside it.

**Why not @supabase/auth-helpers-nextjs:** That package targets the Pages Router pattern.
This project uses the App Router. Using @supabase/ssr is the correct choice for Next.js
14 App Router.

**Risk if wrong version:** A version of @supabase/ssr that does not support the Next.js
14 App Router cookie model could cause the session cookie to be set incorrectly, making
session retrieval unreliable and silently breaking authentication without a clear error.

### No other auth packages are expected

The frontend dependency list for Supabase Auth is expected to be exactly these two packages.
No Clerk, no Auth0, no NextAuth, no passport, no iron-session. Adding any other
authentication library alongside Supabase Auth would introduce a competing session model
and increase the risk of a misconfiguration creating a bypass route.

The decision to use Supabase Auth only is confirmed in docs/pilot-security-boundary.md
Section 3 and docs/auth-implementation-checklist.md Section 5.

---

## 5. Backend Auth Dependencies

### supabase==2.5.0 (already installed)

The Supabase Python client is already present in backend/requirements.txt. It provides
access to the Supabase Admin API, which is needed for membership lookups and admin
operations. It does not by itself validate Supabase Auth JWTs in the backend.

### JWT validation approach

The backend must validate the Supabase Auth JWT on every request to a protected endpoint
in pilot-auth mode. Two approaches are available:

**Option A: Validate locally using SUPABASE_JWT_SECRET.**

Supabase Auth signs JWTs with a secret that is available in the Supabase project
dashboard (Settings > API > JWT Secret). The backend can validate the JWT signature
locally using a Python JWT library without making a network call to Supabase on each
request. This is faster, has no external dependency at validation time, and does not
fail if the Supabase API is temporarily unreachable.

The likely library needed is python-jose (with the cryptography extra) or PyJWT.
Neither is currently in backend/requirements.txt. The exact library and version must
be confirmed before installation. PyJWT is smaller and widely used. python-jose has
broader algorithm support but adds more transitive dependencies.

If python-jose is chosen, the dependency line would be approximately:
  python-jose[cryptography]==3.3.0
The exact version must be verified against the current Python environment on Render.

If PyJWT is chosen, the dependency line would be approximately:
  PyJWT==2.8.0
The exact version must be verified similarly.

**Option B: Validate via the Supabase Auth JWKS endpoint.**

Supabase Auth also exposes a JWKS (JSON Web Key Set) endpoint at the project URL. The
backend can fetch the current signing keys from this endpoint and use them to validate
the JWT. This avoids storing the JWT secret as an environment variable in the backend
environment. However, it requires a network call to Supabase on each cold request, adds
latency, and adds a failure mode if the JWKS endpoint is unreachable.

The httpx==0.27.2 library already installed in the backend can handle the JWKS fetch.
Whether a dedicated JWT validation library is needed alongside httpx depends on which
library is used for JWKS parsing and RS256 signature verification. python-jose or PyJWT
with JWKS support may still be needed.

**Recommended approach for the Thumhara pilot:** Option A (local validation with
SUPABASE_JWT_SECRET). Fewer moving parts, no extra latency, no network failure mode on
every authenticated request. The JWT secret must be kept server-side and must never be
exposed to the browser or logged.

The rollback/stop condition in docs/auth-implementation-checklist.md Section 4 (4S.85F)
states: if the Supabase JWT secret is not available in the backend deployment environment,
stop and confirm the secret is correctly set before validating JWTs in application code.
This must be checked as a precondition before 4S.85F begins.

### No other Python packages are expected for auth

The backend auth dependency list is expected to be one JWT validation library (to be
confirmed as either python-jose[cryptography] or PyJWT) in addition to the already
installed supabase client. No OAuth libraries, no SAML libraries, no Clerk SDK, no Auth0
SDK, no additional Supabase packages beyond what supabase==2.5.0 already provides.

---

## 6. Environment Variables Needed Later

The following table lists every environment variable that will be required for Supabase
Auth integration in subsequent milestones. None of these variables are added to .env.example
in 4S.85B. They are listed here so that naming, ownership, and defaults can be reviewed
before any code or configuration change is made.

| Variable                        | Context               | Purpose                                                                                      | Default for public demo            | Default for pilot-auth mode                             | Risk if misconfigured                                                                             |
|---------------------------------|-----------------------|----------------------------------------------------------------------------------------------|------------------------------------|---------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL        | Frontend (public)     | The Supabase project URL, required by @supabase/supabase-js to know which project to call.  | Not set (auth not active)          | Set to the Supabase project URL                         | Wrong URL causes all auth calls to fail silently or target the wrong project.                    |
| NEXT_PUBLIC_SUPABASE_ANON_KEY   | Frontend (public)     | The Supabase anon key, used for unauthenticated client-side calls (magic link request).      | Not set (auth not active)          | Set to the project anon key                             | Exposing a service role key here instead of the anon key gives public users admin-level access.  |
| SUPABASE_SERVICE_ROLE_KEY       | Backend (server-only) | The Supabase service role key, used by the backend for membership lookups and admin queries. | Present (already used for storage) | Present, same key                                       | Exposing this in NEXT_PUBLIC_ or in a log file gives anyone full database access.                |
| NEXT_PUBLIC_PILOT_AUTH_MODE     | Frontend (public)     | Feature flag enabling route protection on /ask and /policies. False by default.              | false                              | true                                                    | Setting true before auth is working locks out the public demo. Setting false in pilot breaks auth.|
| PILOT_AUTH_MODE                 | Backend (server-only) | Backend feature flag enabling JWT validation path. False by default.                         | false (or absent)                  | true                                                    | Mismatch with frontend flag means frontend protects routes but backend still accepts any request. |
| NEXT_PUBLIC_ADMIN_DEMO_ENABLED  | Frontend (public)     | Controls whether admin demo screens are visible. Must remain false publicly.                 | false                              | false (unchanged)                                       | Setting true on a public deployment exposes admin UI without session protection.                  |
| ADMIN_PROXY_ENABLED             | Backend (server-only) | Controls whether the admin proxy forwards requests to the backend. Must remain false.        | false                              | false until 4S.85G is complete                          | Setting true without hardening from 4S.84/4S.85G gives public visitors full admin API access.    |
| ADMIN_TOKEN                     | Backend (server-only) | Bearer token used by the admin proxy to authenticate to the FastAPI backend.                 | Present (already in use)           | Present, same token                                     | Exposing in browser JavaScript or logs gives anyone admin API access.                             |
| API_BASE_URL                    | Backend (server-only) | The primary backend URL used by the Next.js server to reach the FastAPI service.             | Present (already in use)           | Present, same value                                     | Wrong value causes all backend calls from the Next.js server to fail.                             |
| NEXT_PUBLIC_API_URL             | Frontend (public)     | The backend URL used by the Next.js server as fallback when API_BASE_URL is not set.         | Present (already in use)           | Present, same value                                     | Exposing the internal backend URL publicly is acceptable only if the backend has its own auth.    |
| SUPABASE_JWT_SECRET             | Backend (server-only) | The Supabase Auth JWT signing secret, used to validate staff session tokens server-side.     | Not set (auth not active)          | Set to the project JWT secret from Supabase dashboard   | If not set, JWT validation cannot proceed. If logged or exposed, anyone can forge valid tokens.   |

Notes on the table:

- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are intentionally public.
  They are used by the browser and Next.js server alike. They are safe to expose because
  the anon key has limited permissions enforced by Supabase RLS. The service role key
  is entirely different and must never appear in a NEXT_PUBLIC_ variable.

- SUPABASE_JWT_SECRET is the most sensitive new variable. It allows the backend to verify
  any JWT signed by the Supabase project. It must be treated with the same care as the
  service role key: never logged, never exposed in responses, never set in a NEXT_PUBLIC_
  variable.

- SUPABASE_SERVICE_ROLE_KEY is already used in the backend for storage and database
  operations. It does not need to be added; it needs to remain server-only, which is
  the current state.

- NEXT_PUBLIC_PILOT_AUTH_MODE and PILOT_AUTH_MODE are new variables introduced as part
  of the feature flag design confirmed in docs/auth-implementation-checklist.md Section 6.
  They are added to .env.example in milestone 4S.85E, not before.

- If the JWKS endpoint approach is chosen for JWT validation instead of SUPABASE_JWT_SECRET,
  the SUPABASE_JWT_SECRET variable is not needed, but the Supabase project URL must be
  reachable from the Render deployment at request time. The SUPABASE_JWT_SECRET approach
  is recommended for reliability.

---

## 7. Public vs Server-Only Variable Rules

These rules apply to all environment variables in the WorkTwin Care Pilot, both existing
and new. They are not advisory; they are structural constraints.

**Public variables (NEXT_PUBLIC_ prefix):**
Variables prefixed NEXT_PUBLIC_ are embedded in the browser bundle at build time. Any
value set in a NEXT_PUBLIC_ variable is visible to anyone who loads the site. The only
variables safe to expose in NEXT_PUBLIC_ are those that are designed to be public:
SUPABASE_URL, SUPABASE_ANON_KEY, API_URL (where acceptable), and feature flags.

**Server-only variables (no NEXT_PUBLIC_ prefix):**
Variables without the NEXT_PUBLIC_ prefix are available only to the Next.js server
process and the backend process. They are not embedded in the browser bundle and are
not accessible from browser JavaScript. All secrets must be server-only.

The following variable names must never exist in this codebase under any circumstances:

- NEXT_PUBLIC_ADMIN_TOKEN (would expose the admin bearer token to every browser visitor)
- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (would give every browser visitor admin database
  access)
- NEXT_PUBLIC_SUPABASE_JWT_SECRET (would allow anyone to forge valid session tokens)

**No client-supplied identity:**
The rules in docs/pilot-security-boundary.md Section 7.2 and Section 7.3 apply across
all environment variables. user_id, role, and organisation_id must never be read from
a request body, a URL parameter, a query string, or any client-controlled value. They
must come from the verified server-side session or the organisation_memberships table only.
This principle is not affected by which environment variables are chosen; it is a design
constraint on how the variables are used.

---

## 8. Feature Flag Decision

Two feature flags control the transition from demo mode to pilot-auth mode. Both default
to false (or absent) in every deployment until explicitly enabled as part of a controlled,
auditable infrastructure change.

**NEXT_PUBLIC_PILOT_AUTH_MODE**

- Default: false (absent from .env.example until 4S.85E)
- When false: /ask and /policies serve the public demo experience. Unauthenticated visitors
  see placeholder responses. No login is required. No session is checked.
- When true: /ask and /policies require a valid Supabase Auth session. Unauthenticated
  requests receive a 302 redirect to /login (browser) or a 401 response (API). There is
  no fallback to demo content.
- Added to .env.example in milestone 4S.85E with a default of false and a comment
  explaining the pilot-auth mode transition.

**PILOT_AUTH_MODE**

- Default: false (absent from .env.example until agreed)
- When false: the backend uses _get_pilot_staff_context to derive staff identity from
  PILOT_USER_ID and PILOT_USER_ROLE environment variables. This supports the public demo.
- When true: the backend uses get_verified_staff_context (introduced in 4S.85F) to derive
  identity from the validated JWT and the organisation_memberships table. The environment
  variable approach is not on the active code path in this mode.
- Must not be set to true until the login, session, and backend context tests defined in
  4S.85D, 4S.85E, and 4S.85F are passing.

**Why these flags must match:**
Setting NEXT_PUBLIC_PILOT_AUTH_MODE=true while PILOT_AUTH_MODE remains false would
cause the frontend to protect routes but the backend to continue accepting requests that
rely on environment variable identity. Staff would be forced to log in but the backend
would not actually verify their session. Setting PILOT_AUTH_MODE=true while
NEXT_PUBLIC_PILOT_AUTH_MODE remains false would cause the backend to require a JWT that
the frontend never provides. Both mismatches are bugs that could silently break either
security or usability. The flags are separate because frontend and backend deployments
(Vercel and Render) have independent environment variable stores; they must be set
deliberately and in the correct order.

**When not to enable:**
Neither flag may be set to true until all of the following are confirmed:
- The login page (4S.85D) can send a magic link and receive an httpOnly session cookie.
- The session helper (4S.85D) returns a verified user_id or null correctly.
- Next.js middleware (4S.85E) redirects unauthenticated /ask and /policies requests.
- The backend get_verified_staff_context function (4S.85F) validates the JWT and looks
  up the membership record.
- The test suite for 4S.85F is passing (valid JWT, expired JWT, malformed JWT, missing
  membership, inactive membership, organisation_id enforcement).

---

## 9. Supabase Project Configuration Needed Later

The following Supabase project configuration changes will be needed in subsequent
milestones. None of these changes are made in 4S.85B.

**Auth magic link enabled (4S.85D):**
Supabase Auth magic link (email OTP) must be enabled on the Supabase project under
Authentication > Providers > Email. This is a dashboard change made in 4S.85D before
any login page is tested.

**Allowed redirect URLs (4S.85D):**
The Supabase Auth callback URL must be added to the allowed redirect URLs list on the
Supabase dashboard under Authentication > URL Configuration. The callback route will be
at /auth/callback on the deployed Next.js URL. Both the Vercel preview URL and the
production URL must be allowed.

**Email templates (later, optional):**
The default Supabase magic link email template may be customised with Thumhara Centre
branding or a plain text format appropriate for care workers. This is not required for
the initial 4S.85D milestone and can be deferred until a later pilot readiness review.

**organisation_memberships table (4S.85C):**
The organisation_memberships table that binds user_id, organisation_id, role, and active
status will be designed in 4S.85C and migrated in the implementation milestone. The exact
SQL is the subject of 4S.85C and is not decided here.

**Row-level security (later milestone):**
RLS policies on document and membership tables are deferred as noted in
docs/pilot-security-boundary.md Section 8.5. The backend uses the service role key which
bypasses RLS; application-level organisation_id enforcement is the current control.
RLS is not configured in any milestone within 4S.85.

**No dashboard changes in 4S.85B:**
This milestone makes no Supabase dashboard changes of any kind.

---

## 10. Dependency Risk Review

### Lockfile changes must be reviewed carefully

When @supabase/supabase-js and @supabase/ssr are installed (in a later milestone), the
frontend/package-lock.json will be regenerated. The lockfile diff should be reviewed to
confirm:
- No existing dependency is silently upgraded.
- No conflicting version of an existing package is introduced (react, react-dom, next).
- The added transitive dependencies from @supabase/supabase-js are expected and do not
  include packages with known vulnerabilities at the installed version.

The same review applies to backend/requirements.txt when a JWT validation library is added.

### Avoid version conflicts

The Supabase Python client in the backend (supabase==2.5.0) was installed when the v2
SDK was current. The @supabase/supabase-js v2 JavaScript client must be compatible with
the same Supabase project API version. A version mismatch between the Python and JavaScript
clients can cause incompatible session models if the JWT format or auth flow changes
between SDK generations.

### Avoid unnecessary auth providers

The Supabase Auth configuration must enable only magic link (email OTP) as an auth
method for the Thumhara Centre pilot. No social login providers (Google, GitHub, Microsoft),
no SMS OTP, no SAML, and no OAuth flows other than what Supabase Auth requires for its
own callback handling should be enabled. Extra providers increase the attack surface and
the configuration surface.

### Supabase Auth only for the MVP pilot

The auth provider decision is confirmed as Supabase Auth in docs/pilot-security-boundary.md
Section 3 and docs/auth-implementation-checklist.md Section 5. Clerk, Auth0, and Microsoft
Entra ID are identified as later alternatives if multi-organisation or SSO requirements
change. No package from these providers is to be installed unless a requirement change is
confirmed and agreed with the WorkTwin team.

### The rollback condition from 4S.85A applies here

The rollback condition in docs/auth-implementation-checklist.md Section 4 (4S.85B) states:
if the dependency list reveals that Supabase Auth requires a version of @supabase/ssr or
supabase-py that conflicts with any currently pinned package, stop and resolve the conflict
on paper before proceeding to 4S.85C.

This document is the dependency list that Codex reviews. If a conflict is identified during
that review, this is the stop point. No code proceeds until the conflict is resolved in
writing.

---

## 11. Proof Commands for 4S.85B

The following commands verify that 4S.85B contains only the new documentation file and
that no application file, dependency, or environment file was changed. No build or
Playwright run is required because this is a documentation-only milestone.

**Verify only the new documentation file is changed:**

```
git diff --stat
```

Expected output: only docs/auth-dependencies.md appears. No other file.

**Verify no application or dependency file was touched:**

```
git diff HEAD -- package.json frontend/package.json backend/requirements.txt .env.example
```

Expected output: no output. All four files are unchanged.

**Verify no encoding artefacts in the new file (PowerShell):**

```
Select-String -Path docs/auth-dependencies.md -Pattern "[^\x00-\x7F]"
```

Expected output: no output. The file uses plain ASCII punctuation only.

**Spot-check file content (PowerShell):**

```
Get-Content docs/auth-dependencies.md -TotalCount 5
```

Expected output: the title line and milestone header of this document.

No build command and no Playwright run are required for 4S.85B. The first build
confirmation is part of 4S.85C (docs only) and 4S.85D (first code changes). Running a
build in a documentation-only milestone would add noise without adding signal.

---

## 12. Stop Conditions Before 4S.85C

The following conditions must each be individually resolved before milestone 4S.85C may
begin. If any one of these conditions is unresolved, work stops at 4S.85B.

**Unresolved package version conflict.**
If Codex review of this document identifies that @supabase/ssr, @supabase/supabase-js,
or the JWT validation library requires a version of Next.js, React, or any other pinned
package that conflicts with the current lock file, the conflict must be resolved on paper
before any package is installed. No code proceeds until the compatible version is agreed
in writing.

**Unclear JWT validation approach.**
If the choice between SUPABASE_JWT_SECRET (local validation) and JWKS endpoint
(network validation) has not been agreed and documented before 4S.85C, the backend auth
design cannot proceed. The approach must be confirmed in this milestone so that 4S.85F
implementation is unambiguous.

**Unclear environment variable ownership.**
If any variable in the table in Section 6 has unclear ownership (which team member sets
it, on which deployment, and at which milestone), this must be resolved before 4S.85C.
Environment variable changes to Vercel and Render require access credentials and deliberate
action; they cannot be treated as incidental.

**Any dependency that forces a broad architecture change.**
If the Supabase SSR helpers require a version of Next.js higher than 14.2.5, or if the
JWT validation library requires a Python version not supported by the current Render
environment, this is a stop condition. The architecture change must be assessed and agreed
before implementation begins.

**Any proposal to expose service role key or admin token to the browser.**
If any implementation design proposed in or after this review suggests setting
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ADMIN_TOKEN, or any equivalent secret
in a public variable, that proposal must be rejected before 4S.85C begins. Exposing
either value would be a critical security regression.

---

## 13. Decision Summary

**Supabase Auth is confirmed as the chosen provider.**
This is agreed in docs/pilot-security-boundary.md Section 3 and
docs/auth-implementation-checklist.md Section 5. No alternative provider is under
consideration for the Thumhara Centre pilot.

**Dependencies are planned, not installed.**
@supabase/supabase-js (v2), @supabase/ssr, and one JWT validation library (python-jose
or PyJWT, to be confirmed) are the expected additions. No package is installed in 4S.85B.
Exact versions are confirmed at installation time in a later milestone.

**Environment variables are planned, not added.**
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET,
NEXT_PUBLIC_PILOT_AUTH_MODE, and PILOT_AUTH_MODE are the new variables required.
None are added to .env.example in 4S.85B. Each will be added at the milestone where it
is first used, with the correct default documented.

**The public demo remains safe.**
NEXT_PUBLIC_PILOT_AUTH_MODE and PILOT_AUTH_MODE default to false. The existing demo mode
on /ask and /policies is not affected by any action taken in 4S.85B.

**Implementation waits for Codex review.**
This document is submitted for Codex review before 4S.85C begins. Implementation of any
authentication code, session helper, login page, or environment variable requires Codex
sign-off on the dependency and environment plan documented here.
