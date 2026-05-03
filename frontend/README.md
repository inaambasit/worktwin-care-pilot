# WorkTwin Care Pilot - Frontend

Next.js 14 staff-facing and admin-demo frontend for the WorkTwin Care Pilot.

This is a working pilot/demo prototype, not a production-ready application.

---

## Staff-facing pages

| Route | Description |
|---|---|
| `/` | Landing page with product overview and Book a Pilot CTA |
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

Admin demo pages are disabled publicly by default. They must be explicitly enabled for a given demo environment. They are not intended for end-user access.

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
| `API_BASE_URL` | Server only | Base URL used by the admin API proxy route |
| `ADMIN_TOKEN` | Server only | Auth token used by the admin API proxy route |

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

- **Book a Pilot CTA** - the call-to-action on the landing page has no destination or form action yet
- **Private Notes mobile layout** - the `/notes` page works on mobile but layout polish is incomplete
- **Authentication** - auth is not implemented; all pages are accessible without login
- **Staff-facing document-grounded RAG** - the `/ask` page uses the backend `/ask` endpoint; the backend has a governed RAG path but requires configured infrastructure and a qualifying governed document to return source-grounded answers; the product is not pilot-ready without authentication and RBAC
