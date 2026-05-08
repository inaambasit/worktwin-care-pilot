# 4S.90M-B - RLS Strategy Decision

> Recorded: 2026-05-08. Documentation only. No code changes. No migrations. No database changes.

---

## 1. Decision Summary

For the controlled pilot phase, WorkTwin will remain backend-gated.

- No direct authenticated Supabase table access will be introduced yet.
- Browser and frontend users must access WorkTwin data through the backend API only.
- The backend remains the enforcement point for JWT validation, membership lookup, active status, organisation boundary, role checks, and governance gates.
- The backend uses `service_role` to query Supabase.

This decision preserves the current safe posture demonstrated in 4S.90M and defers any RLS policy design to a future slice when direct client access is deliberately scoped and reviewed.

---

## 2. Why This Decision Was Made

4S.90M proved the current sandbox posture:

| Check | Result |
|---|---|
| `anon` REST direct access | 401 blocked |
| Authenticated REST direct access (sandbox staff JWT) | 403 blocked |
| `service_role` REST access | 200 allowed |
| RLS enabled on all six WorkTwin public tables | Confirmed (`rls_enabled=true`) |
| RLS policies on any of the six tables | None (`policy_count=0`) |

This posture is suitable for the current backend-gated architecture. The absence of RLS policies is not a gap for this architecture because:

- The backend is the only caller that accesses tables, and it uses `service_role`.
- `anon` and authenticated direct access are already blocked at the database level.
- No frontend or browser code has a path to call Supabase tables directly.

Introducing direct authenticated table access now would increase risk and require:

- Detailed RLS policy design for each table and each role combination.
- Column exposure review to determine which columns are safe to surface directly.
- Storage policy review (Supabase Storage buckets, if used).
- Cross-organisation isolation tests (active, inactive, wrong-org, no-session users).
- Separate review of embeddings, chunks, audit events, and membership table exposure.

None of these reviews have been done. Starting that work in this slice would be premature and out of scope for the controlled pilot phase.

---

## 3. Tables Covered by This Decision

The following six tables are subject to this decision:

| Table | Notes |
|---|---|
| `document_registry` | Document metadata and governance flags |
| `document_chunks` | Text chunks extracted from documents |
| `document_extractions` | Raw extraction records |
| `document_embeddings` | Vector embeddings (pgvector) |
| `document_audit_events` | Audit log for governance and document events |
| `organisation_memberships` | Staff membership and role records |

All six tables have `rls_enabled=true` and `policy_count=0` in the sandbox, as confirmed by 4S.90M.

---

## 4. Explicit Non-Goals

The following are explicitly out of scope for this decision and for any slice implementing it:

- Do not create RLS policies on any WorkTwin table.
- Do not grant `authenticated` SELECT, INSERT, UPDATE, or DELETE on WorkTwin tables.
- Do not expose `document_embeddings`, `document_chunks`, `document_extractions`, `document_audit_events`, or `organisation_memberships` directly to the browser.
- Do not enable public auth.
- Do not enable the admin proxy.
- Do not approve real staff pilot activation.
- Do not approve QCS AI/RAG use.

---

## 5. Future RLS Policy Direction (If Direct Client Access Is Ever Introduced)

This section documents future design direction only. None of the following is approved, planned, or scheduled for the controlled pilot phase. It is recorded here so the reasoning is not lost if the architecture is revisited.

If direct authenticated client access to Supabase tables is ever introduced, the following principles should guide RLS policy design:

- Staff may only self-read their own active membership row if a direct membership lookup is required.
- Staff may only see staff-visible document metadata for their own organisation.
- Staff must not directly read `document_chunks`, `document_embeddings`, `document_extractions`, or `document_audit_events`.
- Admin access should remain backend-mediated unless deliberately redesigned with a separate security review.
- All policies must enforce `organisation_id` boundaries so that a user from one organisation cannot read rows belonging to another.
- All policies must be tested with active, inactive, wrong-org, and no-session users before being considered safe.
- Storage policies (Supabase Storage buckets) must be reviewed separately from table-level RLS policies.

---

## 6. Security Interpretation

Backend-gated does not mean weak. It means the backend is the trusted policy enforcement point.

- The database is protected from browser bypass because `anon` and authenticated direct table access are blocked.
- The backend enforces JWT validation, membership lookup, active status, organisation boundary, role checks, and governance gates before any Supabase query is made.
- The main risk in a backend-gated architecture is backend mistakes, not database exposure. This is why backend tests and proof slices (4S.90A, 4S.90L, 4S.90M) remain critical.
- The `/policies` wrong-org finding from 4S.90L is a concrete example of why backend boundary tests are required. A missing `_ALLOWED_ORGANISATION_IDS` guard would have allowed cross-organisation data access through the backend, even though the database itself was not directly accessible.

---

## 7. Current Status

| Item | Status |
|---|---|
| 4S.90M-B decision | Backend-gated for the controlled pilot phase |
| RLS policies | None created; none planned for this phase |
| Direct authenticated table access | Not granted; not planned for this phase |
| Public auth | Disabled |
| Admin proxy | Disabled |
| Production readiness | Not production-ready; demo-safe posture maintained |

This decision keeps the current safe posture. It does not make WorkTwin production-ready. Public deployment remains demo-safe.

---

## 8. Next Recommended Slices

| Slice | Description |
|---|---|
| 4S.90N | Admin proxy real session guard tests |
| 4S.90O | Document and admin debug endpoint response minimisation |
| 4S.90P | Auth and RLS proof docs alignment |
| Clean corpus E2E | Staff-visible RAG E2E proof using a clean-corpus document |
| Pilot readiness | Controlled pilot readiness checklist |
