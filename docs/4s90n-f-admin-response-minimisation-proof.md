# 4S.90N-F - Admin Response Minimisation Proof Record

**Slice:** 4S.90N-F
**Date:** 2026-05-09
**Status:** PASSED

> Three commits landed across two tracks (backend, frontend). No migration, environment, package,
> SQL, governance, or production enablement files were changed. No code changes are made in this
> record.

---

## 1. Summary

4S.90N-F reviewed and minimised admin and debug endpoint responses across the backend upload paths,
the answer-debug endpoint, and the admin proxy response pipeline.

Three commits implement the minimisation:

- **6416c37** - Sanitise upload error responses: raw exception text no longer leaks from backend
  upload paths; error messages are replaced with safe, controlled strings before reaching the proxy
  caller.

- **80e9124** - Minimise answer debug response fields: the answer-debug endpoint no longer returns
  the real ANSWER_MODEL value or estimated_cost_note; those fields are suppressed before the
  response leaves the backend.

- **02f64ea** - Strip admin proxy responses by role: a new strip helper applies per-role field
  stripping to all admin proxy responses; organisation_admin responses have internal document
  fields, upload internals, registry_warning, and embedding model/token/cost fields removed;
  worktwin_dev_admin responses pass through unchanged.

The admin proxy remains disabled publicly. No production admin rollout is active.

---

## 2. Commits and Scope

| Commit | Message | Track |
|---|---|---|
| `6416c37` | Sanitise upload error responses | Backend (F1A) |
| `80e9124` | Minimise answer debug response fields | Backend (F1B) |
| `02f64ea` | Strip admin proxy responses by role | Frontend (F2) |

### Files changed

#### F1A - 6416c37 Sanitise upload error responses

| File | Role |
|---|---|
| `backend/app/main.py` | Upload error handling hardened; raw exception text replaced with safe error strings |
| `backend/tests/test_upload_error_responses.py` | Tests verifying sanitised error responses from upload paths |

#### F1B - 80e9124 Minimise answer debug response fields

| File | Role |
|---|---|
| `backend/app/main.py` | answer-debug response field suppression; ANSWER_MODEL and estimated_cost_note removed from response |
| `backend/tests/test_answer_debug_response_minimisation.py` | Tests verifying minimised answer-debug response fields |

#### F2 - 02f64ea Strip admin proxy responses by role

| File | Role |
|---|---|
| `frontend/app/api/admin/[...path]/route.ts` | Strip helper wired into the proxy response pipeline |
| `frontend/lib/admin-proxy-response-strip.ts` | Per-role response strip helper implementation |
| `frontend/tests/admin-proxy-response-strip.spec.ts` | Tests verifying strip behaviour by role and field |

No migration, environment, package, SQL, governance, or production enablement files were changed.

---

## 3. Implementation Behaviour

### 3.1 Upload error sanitisation (F1A)

Raw exception text from pypdf, Supabase storage, or other internal libraries is no longer forwarded
to the proxy caller. Upload error paths return a safe, controlled error message. Internal stack
traces, file paths, and library-specific exception wording are suppressed before the response
leaves the backend.

### 3.2 Answer-debug field minimisation (F1B)

The answer-debug endpoint no longer includes:

| Field | Before | After |
|---|---|---|
| `model` | Real model ID (e.g. gpt-4o-mini) | Suppressed - not returned |
| `estimated_cost_note` | Cost estimation string | Suppressed - not returned |

Other answer-debug fields are unaffected. The endpoint remains admin-only and proxy-gated.

### 3.3 Admin proxy per-role response stripping (F2)

A strip helper (`frontend/lib/admin-proxy-response-strip.ts`) is called on every admin proxy
response before it is forwarded to the caller. Strip behaviour is determined by the caller role.

| Role | Strip behaviour |
|---|---|
| `organisation_admin` | Internal document fields, upload internals, registry_warning, and embedding model/token/cost fields are removed |
| `worktwin_dev_admin` | Pass-through - no fields are stripped |

Fields stripped for organisation_admin include:

- Internal document metadata fields not required for admin review
- Upload internal path and storage detail fields
- `registry_warning` field
- Embedding model name, token count, and cost fields

The helper is called for every JSON admin proxy response. worktwin_dev_admin responses return
unchanged. organisation_admin responses are stripped for the configured minimised route keys;
unrelated or default route keys return the response unchanged.

---

## 4. Pass Condition

### 4.1 Test results

| Suite | Result |
|---|---|
| Backend pytest F1A (upload error responses) | 138 passed |
| Backend pytest F1B (answer-debug minimisation) | 150 passed |
| Frontend build (F2) | Passed |
| Admin proxy spec (grep tests) | 21 passed, 31 skipped, 0 failed |
| Strip helper unit tests | 29 passed |

Status: **PASSED**

---

## 5. Safety Boundaries

- Raw upload exception text is no longer forwarded to the proxy caller. Upload errors return safe,
  controlled strings only.
- The answer-debug endpoint does not return the real ANSWER_MODEL identifier or estimated_cost_note.
- The admin proxy strip helper is called for every JSON admin proxy response before forwarding.
  worktwin_dev_admin responses return unchanged. organisation_admin responses are stripped for the
  configured minimised route keys; unrelated or default route keys return the response unchanged.
- organisation_admin callers receive a minimised response. Internal field leakage via the admin
  proxy is removed for this role.
- worktwin_dev_admin passthrough is deliberate. This role is an internal development role and
  receives the full backend response.
- ADMIN_PROXY_ENABLED remains unset in any deployed environment. This slice does not change that.
- No production admin rollout is active. No real staff or admin accounts have been onboarded via
  the proxy.
- This slice does not introduce any production readiness claim. Production rollout controls, public
  environment safety, DPA/content permissions, pilot governance, and final deployment proof all
  remain outstanding.

---

## 6. Current Status

| Item | State |
|---|---|
| 4S.90N-F | **PASSED** |
| Public admin proxy | Disabled - ADMIN_PROXY_ENABLED not set publicly |
| Admin proxy real session guard | Real - proven in 4S.90N-D |
| CSRF guard | Real same-origin / fetch-metadata guard - 4S.90N-E |
| Admin response minimisation | Complete - this slice |
| Production admin access | **Not ready** - see Section 7 |

---

## 7. Remaining Blockers Before Non-Local Admin Proxy Enablement

The following must be completed before the admin proxy can be enabled in any non-local environment:

- **Production rollout controls** - No production auth is active. No real staff or admin accounts
  have been onboarded. All items in docs/current-state.md Section 6 remain in force.
- **Public environment safety** - ADMIN_PROXY_ENABLED must not be set in any public or deployed
  environment without a full production readiness sign-off.
- **DPA and content permissions** - No data processing agreement is in place. QCS content
  restriction remains in force. Written permission required before any QCS-licensed content is
  expanded in scope.
- **Pilot governance** - Governance sign-off from Thumhara Centre or a designated approver is
  required before any real admin or staff use.
- **Final deployment proof** - A full end-to-end deployment proof under real auth, real org
  context, and a confirmed clean corpus must be completed before production is claimed.

---

## 8. Next Recommended Slice

| Slice | Description |
|---|---|
| Production rollout | Controlled rollout gates, deployment proof, pilot governance sign-off |
