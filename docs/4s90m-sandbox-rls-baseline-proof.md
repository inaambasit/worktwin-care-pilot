# 4S.90M - Sandbox RLS Baseline Proof

> Documentation only. No database changes were made. No code changes were made.

---

## 1. Summary

4S.90M inspected and proved the current sandbox database RLS/grants posture.

- This was inspection and proof only.
- No database changes were made.
- No code changes were made.
- No real Thumhara staff data, service-user data, or QCS documents were used.
- Public auth remains disabled.
- Admin proxy remains disabled.

---

## 2. Environment

| Item | Value |
|---|---|
| Starting checkpoint | `2506e6c` Record sandbox auth E2E proof |
| Sandbox Supabase project | worktwin-sandbox-dev |
| Sandbox hostname | sgrbkhubjwsjakdegeqr.supabase.co |
| Env files | Local ignored env files were used only to read sandbox URL, anon key, and service-role key values |
| Secrets handling | No secrets or tokens were printed or committed |

---

## 3. Tables Inspected

- `document_registry`
- `document_chunks`
- `document_extractions`
- `document_embeddings`
- `document_audit_events`
- `organisation_memberships`

---

## 4. Local Migration Inspection Result

- RLS is enabled in migrations for all six tables.
- No `CREATE POLICY` statements exist in the current migrations.
- `008_organisation_memberships.sql` explicitly states that RLS is enabled with no policies, and that policies are deferred to a later milestone.

---

## 5. Sandbox SQL Inspection Result

All six tables were queried via the service-role SQL API.

| Table | rls_enabled | force_rls | policy_count |
|---|---|---|---|
| document_registry | true | false | 0 |
| document_chunks | true | false | 0 |
| document_extractions | true | false | 0 |
| document_embeddings | true | false | 0 |
| document_audit_events | true | false | 0 |
| organisation_memberships | true | false | 0 |

`pg_policies` returned no rows for all six tables.

---

## 6. Grant Inspection Result

A targeted SQL query was run to return any `SELECT`, `INSERT`, `UPDATE`, or `DELETE` grants for `anon` or `authenticated` on the six tables.

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | none | none | none | none |
| authenticated | none | none | none | none |
| service_role | granted | granted | granted | granted |

The query for `anon`/`authenticated` `SELECT`/`INSERT`/`UPDATE`/`DELETE` returned no rows.

---

## 7. Direct REST Proof Result

REST access was tested against all six tables for the three credential types.

| Role | Tables tested | Result |
|---|---|---|
| anon | all six | 401 blocked |
| authenticated (sandbox staff) | all six | 403 blocked |
| service_role | all six | 200 allowed |

**Note:** An earlier test run produced 404 results for all tables. Those results were discarded because the PowerShell URL interpolation used `$table?select`, which caused the table name variable to be consumed as part of the query string rather than the path. The corrected proof used `$($table)?select=...` to force proper variable interpolation. Only the corrected results are recorded above.

---

## 8. Security Interpretation

The current posture means:

- **Browser and client users cannot directly bypass the backend to read WorkTwin Supabase tables.** `anon` and `authenticated` REST calls are blocked at the database level - `anon` by the absence of grants (401), `authenticated` by RLS with no permitting policies (403).
- **The current architecture intentionally uses the backend with the service-role key as the controlled gatekeeper.** All legitimate data access flows through the FastAPI backend, which enforces JWT validation, membership resolution, organisation boundary checks, role checks, and governance gates before any query reaches the database.
- **The backend must continue enforcing these controls.** The database-level posture does not reduce the responsibility of the backend to validate every request. Bypassing any backend check - for example by calling the service-role SQL API directly - would bypass all application-layer controls.
- **Database RLS policies have not yet been designed for direct authenticated client access.** The current `rls_enabled=true` / `policy_count=0` state means any `authenticated` request that reaches the database is denied by default, not by a deliberate allow-listed policy.
- **This is acceptable for the current backend-gated architecture.** The absence of RLS policies is not a gap in the current design; it is consistent with the architecture intent. However, this posture is not a substitute for future RLS policy design if direct client table access is ever introduced. If Supabase client-side queries were ever added (e.g. from the frontend), a full RLS policy design pass would be required before that change could be considered safe.

---

## 9. Current Status

| Item | Status |
|---|---|
| 4S.90M baseline proof | **PASSED** |
| Public auth activation approved | No |
| Real staff pilot activation approved | No |
| Admin proxy enablement approved | No |
| QCS AI/RAG use approved | No |

---

## 10. Next Recommended Slices

| Slice | Description |
|---|---|
| 4S.90M-B | RLS policy design decision: keep backend-gated only vs introduce narrow authenticated policies |
| 4S.90N | Admin proxy real session guard tests |
| 4S.90O | Document/admin debug endpoint response minimisation |
| 4S.90P | Auth/RLS proof docs alignment |
| Later | Controlled pilot readiness checklist |
