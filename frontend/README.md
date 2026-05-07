# WorkTwin Care Pilot - Frontend

Next.js 14 staff-facing and admin-demo frontend for the WorkTwin Care Pilot.

This is a working pilot/demo prototype, not a production-ready application.

---

## Current frontend status — 2026-05-07

> This section supersedes older milestone wording in the "Known frontend gaps" section below. Where there is a conflict, the status here is current.

The frontend is a **controlled prototype**, not production-ready and not approved for unsupervised real staff use.

- Staff-facing routes exist for dashboard, Ask WorkTwin, Policy Library, onboarding, scenarios, private notes and escalation.
- Login/magic-link scaffolding exists, including callback/logout/next destination preservation, but public pilot auth remains disabled (`NEXT_PUBLIC_PILOT_AUTH_MODE=false`).
- Bearer forwarding exists for `askWorktwin()` and `fetchPolicies()`.
- Browser token retrieval is partially hardened: `getSession()` obtains the local token, then `getUser(token)` validates it before forwarding.
- Middleware route protection is partial and currently covers `/ask` and `/policies` only.
- Staff sign out control exists (`/logout` route).
- Ask WorkTwin includes honesty/mode wording, safe fallback handling, timeout/warm-up improvements and source/citation framing.
- Private Notes are session-only and not a production privacy implementation.
- Book a Pilot has a basic enquiry flow / destination, but is not the final commercial onboarding workflow.
- Admin UI visibility is controlled by `NEXT_PUBLIC_ADMIN_DEMO_ENABLED`.
- Admin API/proxy remains disabled publicly unless `ADMIN_PROXY_ENABLED` is deliberately enabled; it must not be enabled before real auth/session/CSRF/RBAC.
- Admin proxy upload cap is 10 MB.
- No real staff, service-user, resident, care-plan, HR, safeguarding case-note or named complaint personal data should be used.

### Current blockers

- **4S.88G** — `organisation_memberships` not safely applied/proved; `PILOT_AUTH_MODE` cannot be activated until this is resolved.
- **Middleware expansion needed** — `/dashboard`, `/notes`, `/escalation`, `/onboarding`, `/scenarios` and all `/admin/*` routes are unprotected at the middleware layer even when auth mode is on.
- **Real admin proxy Supabase session validation and production CSRF/same-site controls needed** — both guards are test-only stubs; `ADMIN_PROXY_ENABLED` must not be set in any non-local environment until they are replaced.
- **DPA/legal and QCS AI/RAG confirmation required** before real pilot begins.
- **Mobile/private-notes/accessibility polish** still needed before wider demo confidence.

---

## Staff-facing pages

| Route | Description |
|---|---|
| `/` | Landing page with product overview, Book a Pilot CTA, and Staff sign in link |
| `/book-pilot` | Book a Pilot enquiry page |
| `/login` | Staff sign-in — preparation/demo page only; does not yet protect routes |
| `/login/sent` | Sign-in link confirmation — preparation/demo page only |
| `/dashboard` | Staff dashboard with quick-access cards |
| `/ask` | Ask WorkTwin - AI-assisted query interface |
| `/policies` | Policy reference browser |
| `/onboarding` | Onboarding guidance for new staff |
| `/scenarios` | Scenario library index |
| `/scenarios/access-refusal` | Step-by-step access refusal scenario |
| `/notes` | Private Notes - staff personal note-taking |
| `/escalation` | Escalation contacts and safe human hand-off guidance |

---

## Admin-demo pages

| Route | Description |
|---|---|
| `/admin` | Admin dashboard overview |
| `/admin/documents` | Document management |
| `/admin/insights` | Usage and engagement insights |
| `/admin/roles` | Role and permission management |
| `/admin/escalation` | Escalation review and audit |

Admin demo pages are controlled by `NEXT_PUBLIC_ADMIN_DEMO_ENABLED`. The live Vercel deployment currently has this set to `true`, so admin demo screens are visible. They are not intended for real end-user access.

`ADMIN_PROXY_ENABLED` is a separate server-side variable controlling whether the admin API proxy forwards requests to the backend. These are distinct controls and must not be conflated. The public admin API actions remain fail-closed. `ADMIN_PROXY_ENABLED` must not be set to `true` publicly until authentication, CSRF protection, and admin RBAC are deliberately implemented and reviewed.

The admin API proxy route has been partially hardened: disabled proxy guard, typed path allowlist, method guard, unauthenticated guard, role/membership guard placeholder, route-specific role allowlist, CSRF fail-closed guard for POST/PATCH, upload content-type/size guards, safe audit logging, and no-store caching are active. The proxy is not yet production-ready: real Supabase Auth session validation, real organisation_memberships lookup, and production CSRF/same-site controls remain outstanding.

---

## Key components

- **AppLayout** - root layout wrapper used across all staff-facing pages
- **Mobile drawer navigation** - slide-in nav drawer for small screens
- **Desktop sidebar** - persistent sidebar navigation for larger screens
- **Admin API proxy route** - server-side proxy at `frontend/app/api/admin/[...path]/route.ts` that forwards admin requests to the backend using `API_BASE_URL` and `ADMIN_TOKEN`, keeping credentials out of the browser

---

## Environment variables

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client (public) | Base URL for staff-facing backend API calls |
| `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` | Client (public) | Set to `true` to show admin demo UI; controls UI visibility only, not API access |
| `API_BASE_URL` | Server only | Base URL used by the admin API proxy route |
| `ADMIN_TOKEN` | Server only | Auth token used by the admin API proxy route; never exposed to the browser |
| `ADMIN_PROXY_ENABLED` | Server only | Set to `true` to enable the admin API proxy; must not be set publicly until auth/CSRF/RBAC are in place |
| `NEXT_PUBLIC_PILOT_AUTH_MODE` | Client (public) | Set to `false`; auth mode flag; real pilot auth is not yet active |
| `NEXT_PUBLIC_SUPABASE_URL` | Client (public) | Supabase project URL; in `.env.example` for future auth integration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (public) | Supabase anon key; in `.env.example` for future auth integration |
| `SUPABASE_JWT_SECRET` | Server only | JWT secret for Supabase session validation; in `.env.example`; not yet active |
| `PILOT_AUTH_MODE` | Server only | Set to `false`; server-side auth mode flag; real pilot auth is not yet active |

`NEXT_PUBLIC_ADMIN_TOKEN` is no longer used and must not be set. Admin credentials must not be exposed to the browser.

---

## Local development

```bash
cd frontend
npm install
npm run dev
```

Build check:

```bash
npm run build
```

Smoke tests:

```bash
npx playwright test tests/smoke.spec.ts
```

---

## Mobile responsiveness

- Staff pages use a drawer navigation pattern on mobile screens
- The desktop sidebar appears on larger screens via responsive breakpoints
- The landing page and core staff pages are designed with mobile demo use in mind

---

## Known frontend gaps

> The "Current frontend status — 2026-05-07" section above supersedes this section. The points below record earlier milestone wording and remain for historical context only.

- **Private Notes mobile layout** - the `/notes` page works on mobile but layout polish is incomplete
- **Authentication** - auth configuration scaffolding is in place (`PILOT_AUTH_MODE=false`, Supabase env vars in `.env.example`); `/login` and `/login/sent` exist as preparation and demo pages only; real Supabase Auth session validation and organisation membership lookup are not yet active; employee and admin routes remain accessible without an authenticated session
- **Staff-facing document-grounded RAG** - the `/ask` page uses the backend `/ask` endpoint; the backend has a governed RAG path but requires configured infrastructure and a qualifying governed document to return source-grounded answers; the product is not pilot-ready without authentication and RBAC
