# 4S.103C-2 — Frontend Middleware Staff Session-Check Gate: Proof of Implementation

## Slice

4S.103C-2

## What this slice does

Updates Next.js middleware so that when `NEXT_PUBLIC_PILOT_AUTH_MODE=true`, protected
staff routes require both a valid Supabase session and a successful backend
`/staff/session-check` response before access is granted.

The backend remains the sole authority for JWT validation, organisation membership
checks, allowed organisation enforcement, and staff role checks. The middleware acts
as a first-pass gate; no membership logic lives in the frontend.

---

## Protected staff routes (when auth mode is on)

| Route | Protected |
|---|---|
| `/dashboard` | Yes |
| `/ask` | Yes |
| `/policies` | Yes |
| `/onboarding` | Yes |
| `/scenarios` and nested paths | Yes |
| `/notes` | Yes |
| `/escalation` | Yes |

Admin routes (`/admin`, `/admin/*`) are **not** part of the staff gate. They have
their own auth layer in the API proxy route handler. Removing admin from the
middleware matcher ensures the staff session-check gate cannot be used as a path
into admin routes.

## Public routes (never redirected)

`/`, `/privacy-model`, `/book-pilot`, `/book-pilot/sent`, `/login`, `/login/sent`,
`/auth/callback`, `/logout` — these are outside the middleware matcher and remain
fully public regardless of `NEXT_PUBLIC_PILOT_AUTH_MODE`.

---

## Middleware logic (when auth mode is on)

1. If the request path is not a protected staff path → pass through.
2. Read the Supabase session from cookies (`getSession()`). If no session or no
   access token → redirect to `/login?next=<safe staff path>`.
3. Call `GET /staff/session-check` with `Authorization: Bearer <access token>`.
   - HTTP 200 + `{ "allowed": true }` → allow the request.
   - HTTP 200 but `allowed !== true` → redirect to `/login?error=access_denied`.
   - HTTP 4xx (401 or 403) → redirect to `/login?error=access_denied`.
   - HTTP 5xx (503 or other) → redirect to `/login?error=auth_unavailable`.
   - Fetch failure / timeout → redirect to `/login?error=auth_unavailable`.

The access token is sent only in the server-side `Authorization` header. It is never
placed in a URL parameter or exposed to the browser.

---

## Backend URL

Uses `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'` — the same
convention used by `frontend/lib/api.ts` and the admin proxy route handler.

No new secrets are introduced. No tokens are placed in URLs.

---

## Changes made

### `frontend/middleware.ts`

- `/admin` removed from `STAFF_ROOTS` and from the `config.matcher` — admin routes
  are not part of the staff gate.
- `getUser()` replaced with `getSession()` so the access token is available for the
  backend call without an extra Supabase network round-trip. The backend independently
  validates the JWT.
- Added `fetch` call to `${API_BASE}/staff/session-check` with
  `Authorization: Bearer <token>` and a 5 s timeout.
- Error routing: 4xx → `access_denied`, 5xx or fetch failure → `auth_unavailable`.

### `frontend/app/login/page.tsx`

- `safeNext` updated from an exact-match Set to a prefix check against `STAFF_ROOTS`,
  so nested paths such as `/scenarios/access-refusal` are preserved through the
  redirect chain.
- `errorMessage()` helper added: returns safe, specific user-facing strings for
  `access_denied` and `auth_unavailable`, a generic message for other error codes,
  and `null` when no error is present.
- Error banner now renders the specific message rather than a generic fallback.
- No membership detail, role name, organisation ID, or email existence information
  is revealed.

### `frontend/app/auth/callback/route.ts`

- `/admin` removed from `ALLOWED_NEXT_PATHS`.
- `if (raw.startsWith('/admin/')) return raw` clause removed.
- `safeNext` updated to prefix-match against `STAFF_ROOTS`, consistent with the
  login page, so nested staff paths are preserved after magic-link sign-in.
- Staff login can no longer redirect into any admin route.

### `frontend/tests/middleware-pilot-auth.spec.ts`

New and updated test coverage:

| Test | Section |
|---|---|
| All staff pages accessible in demo mode | Public demo (always runs) |
| `/admin` accessible in demo mode | Public demo (always runs) |
| `/dashboard` redirects unauthenticated (pilot-auth) | Pilot-auth (gated) |
| `/ask` redirects unauthenticated (pilot-auth) | Pilot-auth (gated) |
| `/policies` redirects unauthenticated (pilot-auth) | Pilot-auth (gated) |
| `/notes` redirects unauthenticated (pilot-auth) | Pilot-auth (gated) |
| `/scenarios/access-refusal` preserves nested next param | Pilot-auth (gated) |
| Admin routes not redirected by staff gate | Pilot-auth (gated) |
| `access_denied` renders safe wording | Error messages (always runs) |
| `auth_unavailable` renders safe wording | Error messages (always runs) |
| `access_denied` does not reveal membership/role/org | Error messages (always runs) |
| `auth_unavailable` does not reveal internal detail | Error messages (always runs) |

Error message tests do not require the server to be in pilot-auth mode — the login
page is always public and renders error params regardless of auth mode.

The pilot-auth gated tests still require both the dev server and the Playwright
runner to carry `NEXT_PUBLIC_PILOT_AUTH_MODE=true`, and require real backend
connectivity to validate the session-check flow end-to-end.

---

## What is NOT yet in place

- `NEXT_PUBLIC_PILOT_AUTH_MODE` is not enabled in any public or shared environment.
- `PILOT_AUTH_MODE` is not enabled.
- `ADMIN_PROXY_ENABLED` is not enabled.
- No real staff accounts have been created.
- No end-to-end auth-on proof with a real test user has been completed.
- This slice alone does not make trusted staff access ready for production or staging.

The pilot-auth gated Playwright tests cannot run in CI without a live backend and
a real Supabase session. A local/staging proof run is required before declaring
staff route protection production-ready.

---

## Next slice

4S.103C-3 — auth-on route protection tests and local proof with a real test user.
