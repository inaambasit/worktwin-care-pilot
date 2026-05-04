# WorkTwin Care Pilot - Pilot Security Boundary

**Milestone:** 4S.83  
**Date:** 2026-05-03  
**Status:** Design document only. No code implemented by this milestone.

---

> **Current state note (post-4S.83):** This document was written as a design-only
> milestone. Since then, `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` has been set to `true` on
> the live Vercel demo, so admin demo screens are now visible there. This is a UI
> visibility change only. `ADMIN_PROXY_ENABLED` remains `false` on all public
> deployments; the proxy continues to fail closed. Visible admin demo screens do
> not equal admin API access.

---

## 1. Purpose

This document defines the minimum viable authentication and role-based access model
required before any real staff, real policy documents, or real staff questions are
introduced into the WorkTwin Care Pilot for Thumhara Centre.

The current public demo is not pilot-ready. It has no verified identity, no
role-based access control, and no admin session protection. As the consolidated
10/10 roadmap (4S.78) states plainly: the product's privacy guarantees - individual
conversations private from managers, staff identity not shared - are aspirations,
not technical facts, until an authentication layer exists. Any HTTP client can
currently submit a question as any user, in any role, for any organisation.

At the time this document was written, enabling the admin proxy without
further controls would have allowed public visitors to trigger admin
operations using the server-held bearer token. Since then, fail-closed
proxy hardening has been partially implemented, but real Supabase Auth
session validation, real organisation_memberships lookup and production
CSRF remain outstanding, so ADMIN_PROXY_ENABLED must remain false
publicly.

This document answers three questions:

1. What is the minimum identity model for a controlled Thumhara Centre pilot?
2. What can each role access?
3. What must not happen until this boundary is in place?

The implementation steps that follow from this design are deferred to 4S.85. The
admin proxy hardening that follows from this design is deferred to 4S.84.

---

## 2. Non-Goals for Milestone 4S.83

The following are explicitly out of scope for this milestone.

- **No auth implementation.** This document describes the design only. No
  authentication code, session middleware, JWT validation, or login screens are to
  be created as part of 4S.83.

- **No admin proxy implementation.** The admin proxy at
  `frontend/app/api/admin/[...path]/route.ts` remains unchanged.
  `ADMIN_PROXY_ENABLED` remains false.

- **No real document upload.** No Thumhara Centre policy documents are to be
  uploaded to the system under this milestone. The safe test document (Visitor
  Sign-In and Identification Procedure) remains the only approved staff-visible
  document.

- **No staff-facing expansion.** No new staff-facing pages, features, or
  role-gating UI are to be added.

- **No manager analytics expansion.** The anonymous insights page is not to be
  expanded in scope or access model.

- **No AI inside Private Notes.** Private Notes remain session-only, client-side,
  and outside any AI processing path.

- **`ADMIN_PROXY_ENABLED` remains false on all public deployments.** No admin proxy
  changes are made in this milestone. `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` controls
  admin UI visibility only; it has since been enabled on the live Vercel demo for
  managed walkthroughs (UI visibility only, no API access). See current state note
  above.

---

## 3. Recommended Pilot Auth Provider

### Recommendation: Supabase Auth

Supabase Auth is the recommended authentication provider for the Thumhara Centre
controlled pilot.

The project already uses Supabase for PostgreSQL, pgvector embeddings, and private
document storage. Adding Supabase Auth to the same Supabase project means:

- One organisation account, one billing relationship, one set of access keys.
- User accounts live in the same Supabase project as the document registry, which
  makes organisation membership binding straightforward.
- Supabase Auth issues JWTs that can be consumed by the Next.js server and the
  FastAPI backend using the same Supabase service role or anon key already in use.
- Row-level security (RLS) policies, when added in a later milestone, can use the
  JWT `sub` claim and custom metadata (organisation_id, role) directly - no
  additional token exchange is needed.
- Magic link email authentication (passwordless) requires no password management
  and is a realistic option for frontline care workers who may not have work-issued
  passwords.
- Fewer moving parts: no additional third-party service to configure, monitor, or
  pay for separately.

### Later Alternatives

If the Thumhara Centre pilot succeeds and a wider rollout requires it, the following
providers are viable alternatives or additions:

- **Clerk** - strong UI components, good organisation management primitives, easy
  Next.js integration. Adds a third-party dependency.
- **Auth0** - established enterprise provider, extensive SSO options. Adds overhead
  for a small pilot.
- **Microsoft Entra ID (Azure AD)** - required if any care provider using the
  product operates exclusively with Microsoft 365 accounts and mandates SSO through
  their existing identity provider. Not required for the Thumhara pilot unless they
  specify this.

The recommendation stands: use Supabase Auth for the controlled pilot. Revisit
provider choice when multi-organisation requirements and SSO requirements are
confirmed.

---

## 4. Minimum Identity Model

The following entities must be defined and persisted before any pilot staff access
is possible.

### 4.1 Organisation

An organisation represents a single care provider. For the pilot, this is Thumhara
Centre. Every user, every document, every audit event, and every AI answer must be
scoped to an organisation. There is no cross-organisation access.

Fields: `organisation_id`, `name`, `created_at`.

### 4.2 User

A user is a verified person who has authenticated via Supabase Auth. A user has an
identity (email address, verified), a membership in exactly one organisation for the
pilot, and an assigned role within that organisation.

Fields: `user_id` (from Supabase Auth), `email`, `display_name`, `created_at`.

Note: `user_id` must come from the verified server-side session only. It must never
be trusted from the request body, a query parameter, or any client-supplied value.

### 4.3 Organisation Membership

An organisation membership binds a user to an organisation and assigns a role.

Fields: `user_id`, `organisation_id`, `role`, `created_at`, `active` (boolean).

A deactivated membership blocks access immediately without deleting the user record.

### 4.4 Role

A role defines what a user is permitted to do within an organisation. Roles are
assigned at membership creation and enforced server-side. The role value must be
read from the verified session or from the membership record on the server; it must
not be accepted from the client.

### 4.5 Staff Profile

A staff profile extends a user for the staff-facing experience. It records the
user's team or department (if applicable), their onboarding status, and any
role-specific metadata needed to scope content delivery. It does not record
question history, session duration, or any derived activity data.

### 4.6 Admin Profile

An admin profile extends a user with admin-specific permissions. An admin profile
is distinct from a staff profile: being an organisation admin does not automatically
grant WorkTwin developer access, and being a registered manager does not
automatically grant document upload rights. Admin capabilities are enumerated in the
access matrix below.

### 4.7 Verified Session

A verified session is a server-side session established by Supabase Auth after a
user completes a successful authentication flow (magic link or SSO). The session
token is stored in an httpOnly cookie or equivalent secure server-side store and
is never exposed to browser JavaScript. Every request to a protected endpoint must
validate the session server-side before deriving `user_id`, `organisation_id`, and
`role`. A session that has expired or been revoked must be rejected.

---

## 5. Roles

The following roles are defined for the Thumhara Centre pilot. The list is
intentionally minimal. It may be extended in later milestones once the pilot has
validated which distinctions matter in practice.

### 5.1 Staff User / Care Worker

A frontline care worker employed at Thumhara Centre. This role has access to
the standard staff-facing experience: Ask WorkTwin, the Policy Library, the
Onboarding Hub, Practice Scenarios, Private Notes, and Escalation Contacts. They
cannot access admin functions, upload documents, or see any other staff member's
activity.

### 5.2 Senior Care Staff / Team Lead

A senior care worker or team lead with responsibility for a team of staff. For the
initial pilot, this role has the same access as a Staff User. If the pilot identifies
a need for differentiated access (for example, team-level escalation contacts or
policy subsets), it can be introduced in a later milestone after the open questions
in Section 14 are resolved.

### 5.3 Registered Manager / Safeguarding Lead

The registered manager or the nominated safeguarding lead at Thumhara Centre.
This role has read access to the anonymous insights dashboard. They can view which
policy topics are generating questions (in aggregate, anonymised form only) and
which topics are generating escalations. They cannot see individual staff questions,
individual session activity, or Private Notes. They have read access to the document
registry to review which policies are currently approved for staff visibility.

### 5.4 Organisation Admin

The person or persons at Thumhara Centre who are responsible for managing the
WorkTwin system for their organisation. This role can upload policy documents,
approve documents through the governance gates, manage staff accounts and
memberships, and access admin settings. The organisation admin does not have
access to debug endpoints, vector search tools, or answer-debug tools. They are a
care organisation administrator, not a system developer.

### 5.5 WorkTwin Developer / Admin

A WorkTwin technical team member with full system access, including debug
endpoints, vector search, answer-debug tools, and admin settings. This role exists
for deployment, testing, and support purposes. It must not be assigned to any
Thumhara Centre staff member. Access at this level is internal to the WorkTwin team.

### 5.6 Read-Only Reviewer (Optional)

A read-only reviewer role for an external auditor, nominated governance reviewer,
or care inspector. This role can view the document registry (approved documents
and their governance metadata) and the anonymous insights dashboard. It cannot
ask questions, access Private Notes, upload documents, change settings, or approve
governance gates. Whether this role is needed for the Thumhara pilot is an open
question (see Section 14).

---

## 6. Access Matrix

The table below defines what each role can access in the WorkTwin Care Pilot. A
dash (-) means no access. "Own only" means access is restricted to the user's own
data and cannot be used to observe other users.

| Feature / Area                              | Staff User | Senior Care Staff | Reg. Manager / Safeguarding Lead | Org Admin | WorkTwin Dev / Admin | Read-Only Reviewer |
|---------------------------------------------|:----------:|:-----------------:|:--------------------------------:|:---------:|:--------------------:|:------------------:|
| Landing page                                | Yes        | Yes               | Yes                              | Yes       | Yes                  | Yes                |
| Dashboard                                   | Yes        | Yes               | Yes                              | Yes       | Yes                  | -                  |
| Ask WorkTwin                                | Yes        | Yes               | -                                | -         | Yes                  | -                  |
| Policy Library (staff view)                 | Yes        | Yes               | Yes (read)                       | Yes       | Yes                  | -                  |
| Onboarding Hub                              | Yes        | Yes               | -                                | -         | Yes                  | -                  |
| Practice Scenarios                          | Yes        | Yes               | -                                | -         | Yes                  | -                  |
| Private Notes                               | Own only   | Own only          | -                                | -         | -                    | -                  |
| Escalation Contacts                         | Yes        | Yes               | Yes                              | Yes       | Yes                  | -                  |
| Anonymous Insights dashboard                | -          | -                 | Yes                              | Yes       | Yes                  | Yes                |
| Admin Document Registry (view)              | -          | -                 | Yes (read)                       | Yes       | Yes                  | Yes (read)         |
| Upload documents                            | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Approve documents for embedding             | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Approve documents for staff visibility      | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Approve documents for source-grounded Ask   | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Mark document as governance-reviewed        | -          | -                 | Yes (nominated reviewer only)    | Yes       | Yes                  | -                  |
| Admin Settings                              | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Manage staff accounts and memberships       | -          | -                 | -                                | Yes       | Yes                  | -                  |
| Debug / vector search / answer-debug tools  | -          | -                 | -                                | -         | Yes                  | -                  |

Notes on the matrix:

- **Ask WorkTwin** is not appropriate for the Registered Manager or Organisation
  Admin roles in a staff-facing capacity. If a manager needs to test the system,
  they should use a test account with a Staff User role. The intent is that
  managers use the insights dashboard, not the staff Ask interface.
- **Private Notes** are explicitly excluded from all admin and manager roles.
  No admin, manager, or developer should be able to read another user's Private
  Notes under any circumstances.
- **Governance reviewer** for the "Mark document as governance-reviewed" action
  should be a named individual. For the Thumhara pilot, this person must be agreed
  before any real documents are uploaded (see Open Questions, Section 14).
- **Debug tools** include `/documents/search-vector`, `/documents/answer-debug`,
  and any endpoint protected by `DEBUG_ENDPOINTS_ENABLED`. These are WorkTwin
  developer tooling and must not be exposed to organisation users.

---

## 7. Session Model

### 7.1 Staff must authenticate before accessing protected routes

In a real pilot, `/ask`, `/policies`, the dashboard, and all authenticated pages
must reject unauthenticated requests. The current demo behaviour - falling back to
placeholder content for unauthenticated visitors - is acceptable for internal demo
purposes but must not be carried into a real pilot environment.

### 7.2 Identity must be derived server-side from the verified session

`user_id`, `role`, and `organisation_id` must be derived on the server from the
verified Supabase Auth session. They must not be read from the request body, a URL
parameter, a client-set cookie, or any client-controlled value.

The current backend derives pilot context from environment variables
(`PILOT_USER_ID`, `PILOT_USER_ROLE`) via `_get_pilot_staff_context`. This is
acceptable for a demo where all staff share a single hardcoded identity. It is not
acceptable for a real pilot where individual privacy must be technically enforced,
not just stated in policy.

### 7.3 Client request body must not be trusted for identity, role, or organisation

The current `AskRequest` model accepts only `question`. The consolidated roadmap
notes that the frontend still sends `organisation_id`, `user_id`, and `user_role`
in the payload (which Pydantic silently ignores). These fields must be removed from
the frontend payload before the real pilot, and the backend must never use
client-supplied values for identity, even as a fallback.

### 7.4 Session expiry and logout

Sessions should expire after a reasonable idle period (for example, 8 hours to
align with a care shift). A care worker finishing a shift must be able to log out
explicitly. After logout, the session token must be invalidated server-side. It is
not sufficient to clear the client-side cookie only.

### 7.5 Magic link as the first pilot-friendly option

Email magic link (passwordless) via Supabase Auth is the recommended authentication
method for the Thumhara Centre pilot. Care workers are not expected to manage
separate work passwords for a new system. A magic link sent to their verified work
or personal email address is the lowest friction option that still establishes
verified identity.

### 7.6 Future SSO option

If Thumhara Centre or a future pilot client mandates Microsoft 365 single sign-on,
Supabase Auth supports SAML and OAuth providers including Microsoft Entra ID. This
can be added without replacing the identity model described in this document. It is
not required for the initial Thumhara pilot unless explicitly requested.

---

## 8. Organisation Boundary

### 8.1 Every user belongs to exactly one organisation for the pilot

For the Thumhara Centre pilot, every staff and admin user must be a member of the
Thumhara Centre organisation record. There is no concept of a user floating without
an organisation or belonging to multiple organisations at this stage.

### 8.2 Every document belongs to an organisation

Every document uploaded to the system must be scoped to an organisation. The
`organisation_id` must be set at upload time from the server-side session of the
uploading admin, not from a request body field supplied by the client.

### 8.3 Every Ask answer must be scoped to the user's organisation

When a staff member submits a question, the backend must retrieve only document
chunks that belong to the same `organisation_id` as the verified user. There must
be no path - in the vector search, the policy listing, or the answer generation -
through which a document from one organisation can appear in an answer for a user
of a different organisation.

For the single-organisation Thumhara pilot, this boundary is straightforward to
enforce. It must be designed correctly now so that it holds when (and if) additional
organisations are added later.

### 8.4 `organisation_id` must be enforced server-side

The backend must filter every query to the document registry, every vector search
call, and every policy listing by the `organisation_id` derived from the server-side
session. It must not rely on the database service role returning only the correct
records; it must actively pass and enforce the organisation_id filter in application
code.

### 8.5 Future Postgres RLS should enforce this at database level

The Codex review notes that the backend service role bypasses RLS by design, and
that all tenant isolation currently depends on application logic. For a production
multi-organisation deployment, Postgres row-level security policies should enforce
organisation boundaries at the database level, so that a bug in application code
cannot expose cross-organisation data. Designing and implementing RLS is deferred
to a later milestone, after the single-organisation pilot is validated.

---

## 9. Document Governance Boundary

### 9.1 Upload is admin-only

Only users with the Organisation Admin or WorkTwin Developer / Admin role may upload
documents. Staff Users, Senior Care Staff, and Registered Managers have no upload
access.

### 9.2 New documents default to not staff-visible and not answer-approved

Every document uploaded to the system must default to the locked-down state that
the current upload pipeline establishes: `is_real_document=false`,
`is_dummy_document=true`, `status=pending`, `approved_for_embedding=false`,
`approved_for_staff_visibility=false`, `approved_for_ai_answers=false`. No document
may be surfaced to staff or used in an AI answer without an explicit, deliberate
action by an authorised admin to unlock each gate.

This default is a structural safety guarantee. It must not be weakened.

### 9.3 Human review is required before embedding, staff visibility, or source-grounded answering

The personal-data risk scan in the upload endpoint is pattern-based and uses a
2,000 character preview. It will produce false negatives. It is a safeguard against
accidental inclusion, not a replacement for human review.

Before any document is approved for embedding, staff visibility, or use in
source-grounded AI answers, a named person at Thumhara Centre must review it
manually. This review must check that:

- The document is a genuine organisational policy, not a sensitive personal record.
- It does not contain service-user information, personal care records, MAR charts,
  staff HR records, payroll data, or private case notes.
- It is appropriate to surface to all staff members in the assigned role groups.
- The content is accurate and current.

This human review step must be recorded in the `governance_reviewed_by` and
`governance_reviewed_at` fields of the document registry. No document should pass
the staff visibility or AI answer gates without these fields being populated by a
named, authorised reviewer.

### 9.4 Prohibited document types

The following document types must not be uploaded to the WorkTwin Care Pilot under
any circumstances, regardless of governance gate settings:

- Service-user records, care plans, risk assessments, or support plans
- MAR (Medicine Administration Record) charts or controlled drug records
- Staff HR files, appraisal records, sickness records, or employment contracts
- Payroll or financial records
- Private correspondence between staff and management
- Disciplinary investigation notes or grievance records
- Safeguarding referrals, incident reports, or serious concern documentation
- Any document containing names, addresses, dates of birth, NHS numbers, or
  National Insurance numbers of service users or staff

---

## 10. Admin Boundary

### 10.1 Admin demo visibility is separate from admin API access

`NEXT_PUBLIC_ADMIN_DEMO_ENABLED` controls whether admin demo screens are shown in
the UI. It has since been set to `true` on the live Vercel demo for managed
walkthroughs. This is a UI visibility change only; it does not grant API access.
`ADMIN_PROXY_ENABLED` remains `false` on all public deployments. No admin operation
can be triggered via the public URL.

### 10.2 Admin proxy remains disabled until real auth controls are complete

`ADMIN_PROXY_ENABLED=false` must remain the default on all public deployments.
Fail-closed hardening controls have since been partially implemented in 4S.85G
slices (path allowlist, method guard, CSRF fail-closed guard, upload guards, and
audit logging), but the proxy session context remains stub/test-mode based. Real
Supabase Auth session validation, real `organisation_memberships` lookup, and
production CSRF are not yet in place. Until those controls are complete
and verified, ADMIN_PROXY_ENABLED must not be enabled on any public
deployment. The current fail-closed guards reduce
accidental forwarding risk, but they are not a production access-control model
because real Supabase Auth session validation, real organisation_memberships
lookup and production CSRF are still missing.

### 10.3 Admin proxy must later validate admin session before forwarding

When the admin proxy is eventually enabled (post-4S.85), every request it receives
must be validated against a server-side admin session before it is forwarded to the
backend. Checking that `ADMIN_PROXY_ENABLED=true` is not a session check. The proxy
must verify that the calling user holds a valid, active session with an admin role
before forwarding any request.

### 10.4 Admin actions must be role-gated server-side

Admin roles must be enforced at the backend endpoint level, not only by the
presence or absence of UI elements. A staff-role session must not be able to call
admin endpoints, even if it can construct the correct HTTP request. The backend
must check the role derived from the server-side session on every admin route
before executing the operation.

### 10.5 Debug tools are developer/admin-only

The `/documents/search-vector`, `/documents/answer-debug`, and
`/debug/storage-config` endpoints, and any endpoint gated behind
`DEBUG_ENDPOINTS_ENABLED`, must be accessible only to users with the WorkTwin
Developer / Admin role. These endpoints expose document IDs, chunk IDs, similarity
scores, storage keys, and source previews that must not be visible to organisation
users.

---

## 11. Privacy Boundary

### 11.1 Managers must not see individual staff questions or Private Notes

This is a product principle and a technical requirement. The registered manager and
organisation admin roles must have no access to individual staff question history,
session content, or Private Notes - not through any UI, API endpoint, or admin view.
Private Notes are session-only by design: they are not persisted to the database,
and no admin path exists to retrieve them. This must remain true.

### 11.2 Employer-facing views must show anonymised trends only

The anonymous insights dashboard for managers and organisation admins must show only
aggregate, anonymised data: topic trend categories, escalation counts, usage volumes
at team or organisation level. It must not show question counts or topic breakdowns
per named individual, activity timelines, or anything that could identify which
staff member asked which type of question. The current implementation shows
anonymised trends only. That boundary must hold.

### 11.3 No performance scoring, sentiment tracking, or surveillance

No feature that associates a named individual with a question count, topic category,
activity period, or sentiment score is to be built. This is a hard product boundary,
not a deferred improvement. Frontline care workers are the people this product is
designed to help. Surveillance of their learning and questioning behaviour would
destroy the trust the product is designed to build.

### 11.4 Private Notes must not be processed by AI

Private Notes are explicitly excluded from any AI processing path. Notes are
session-only, held in client state, and not sent to the backend. No future feature
may introduce AI analysis, summarisation, categorisation, or any other model
processing of Private Notes content without a complete redesign of the consent,
privacy, and governance model for that feature.

---

## 12. Data and Logging Boundary

### 12.1 Do not log raw query text, answer text, names, or Private Notes

The backend must not write raw staff question text, raw AI answer text, staff
names, or Private Notes content to any log output, log file, or monitoring service.
Query text submitted by a care worker is likely to be personal data in the context
of regulated employment. Logging it creates a surveillance risk and a data
protection liability.

Structured logs should record: request ID, endpoint, HTTP status, latency,
risk category (if applicable), whether an answer was source-grounded, and safe
event metadata (document ID, not document content; escalation triggered yes/no).
The current audit event model records `query_length` and metadata, not raw query
text. This is the correct approach and must be maintained.

### 12.2 Logs should use request IDs and aggregate operational signals only

Once structured logging is introduced (deferred to a later milestone), every request
should carry a correlation ID (for example, `X-Request-ID`) that allows a request
to be traced through the system without exposing the content of that request.
Operational alerting should fire on failure counts, latency thresholds, and
rate-limit spikes - not on the content of individual queries.

### 12.3 Query text may be personal data under UK GDPR

In a regulated employment context, the questions a staff member asks an AI system
about workplace policies may identify that person's concerns, knowledge gaps, or
personal circumstances. Under UK GDPR, this is likely personal data. Any system
that receives, stores, or transmits this data must be covered by a Data Processing
Agreement.

### 12.4 DPA and legal review are required before real staff data goes through Supabase or OpenAI

Before any real staff queries are submitted to the live system, a Data Processing
Agreement must be in place between the WorkTwin team and Supabase, and between the
WorkTwin team and OpenAI. The care provider (Thumhara Centre) must also be informed
about and agree to the data processing model, including the fact that question text
is sent to the OpenAI API. Legal sign-off from Thumhara Centre's nominated reviewer
is required before the first real document is uploaded or the first real staff query
is submitted.

---

## 13. Implementation Implications for 4S.85

The following implementation tasks are implied by this design. They are listed here
for planning purposes. None of these are to be implemented in milestone 4S.83.

1. **Add Supabase Auth** to the existing Supabase project. Configure magic link
   email authentication as the first pilot method.

2. **Create the organisation membership and role model** in the database. At
   minimum: an `organisation_memberships` table with `user_id`, `organisation_id`,
   `role`, and `active` fields.

3. **Derive `user_id`, `organisation_id`, and `role` server-side** from the
   verified Supabase Auth session in the Next.js middleware and/or the FastAPI
   backend. Remove the `_get_pilot_staff_context` environment variable approach
   from the production path (it may remain available behind a feature flag for
   internal demo use only).

4. **Protect `/ask` and `/policies`** so that unauthenticated requests receive a
   401 response rather than placeholder content in a real pilot environment.

5. **Protect admin routes server-side** so that requests from non-admin sessions
   are rejected at the endpoint level, not only at the UI level.

6. **Add organisation_id enforcement** to every backend query: vector search,
   policy listing, document registry, and audit events must all be filtered by the
   `organisation_id` from the verified session.

7. **Remove stale identity fields from the frontend Ask payload.** The frontend
   `AskRequest` must not send `organisation_id`, `user_id`, or `user_role` in the
   request body.

8. **Add RLS or equivalent server-side tenant enforcement** to document and chunk
   queries to ensure that organisation boundary enforcement exists at the database
   level, not only in application code.

9. **Update tests** to cover the authentication paths, the organisation scoping
   logic, and the role-gating on admin endpoints.

---

## 14. Open Questions

The following questions must be resolved before 4S.85 implementation begins. They
are unresolved not because they are unimportant, but because they require input
from Thumhara Centre or the WorkTwin team that has not yet been confirmed.

1. **Exact pilot user list.** Who at Thumhara Centre will participate in the
   pilot? How many staff users, how many admin users, and who will be the
   organisation admin?

2. **Whether senior care staff need a separate role.** The access matrix currently
   gives Senior Care Staff the same permissions as Staff Users. Is there any
   specific access or capability that senior staff need that standard care workers
   do not? This should be confirmed with Thumhara Centre before implementation.

3. **Who can approve documents for embedding and staff visibility.** The access
   matrix assigns this to Organisation Admin. Should the Registered Manager also
   have this capability? Should approval require sign-off from both?

4. **Who is the named governance reviewer.** Every document approved for staff
   visibility and source-grounded answers must be reviewed by a named person.
   Thumhara Centre must nominate this person before any real document is uploaded.

5. **Whether staff use work email addresses or personal email addresses.** Magic
   link authentication sends a one-time link to the user's registered email. If
   Thumhara Centre staff do not have work email accounts, the link must go to
   personal addresses. This affects how accounts are provisioned and verified.

6. **DPA and legal sign-off timing.** When will Thumhara Centre be in a position
   to sign a Data Processing Agreement? This is a prerequisite for any real staff
   data (including query text) going through the system, and must be in place
   before the 4S.85 pilot goes live.

7. **Whether Microsoft SSO is required.** If Thumhara Centre operates on Microsoft
   365 and requires staff to authenticate through their existing Microsoft accounts,
   Supabase Auth can support this via Microsoft Entra ID as an OAuth provider. This
   needs to be confirmed before the auth implementation is built.

---

## 15. Decision Summary

The following decisions are confirmed by this design document.

**Supabase Auth is recommended for the MVP pilot.** The project already uses
Supabase for database, storage, and vector search. Adding Auth to the same project
minimises operational complexity, enables future RLS alignment, and supports magic
link authentication for care workers without work-issued passwords. Clerk, Auth0,
and Microsoft Entra ID remain valid options if requirements change, but are not
recommended for the initial Thumhara pilot.

**No real pilot without verified staff identity.** A real pilot - real Thumhara
Centre staff, real policy documents, real questions - must not proceed until every
staff user has been issued a verified Supabase Auth account, every account is bound
to the Thumhara Centre organisation, and every protected route derives identity
from the server-side session. The current environment-variable identity approach
is acceptable only for internal demos.

**No admin upload access publicly until real admin auth is complete.**
`ADMIN_PROXY_ENABLED=false` must remain the default on all public deployments.
Fail-closed proxy hardening controls have since been partially implemented in
4S.85G slices, but real Supabase Auth session validation, real organisation_memberships
lookup, and production CSRF remain outstanding. Uploading real Thumhara Centre
documents must not happen until admin authentication is fully enforced at both the
Next.js proxy and the backend endpoint level.

**No real documents before governance and legal checks.** Before any Thumhara
Centre policy document is uploaded, the nominated governance reviewer must be
confirmed, the document review process must be agreed, and the Data Processing
Agreement must be in place with Supabase and OpenAI.

**4S.84 designed admin proxy hardening.** The admin proxy at
`frontend/app/api/admin/[...path]/route.ts` required a path allowlist, method
allowlist, CSRF protection, and session validation. These controls were designed in
4S.84 and partially implemented in 4S.85G slices. Real session validation and real
membership lookup remain outstanding.

**4S.85 implements staff and admin authentication based on this boundary.** The
implementation milestone must follow the identity model, roles, access matrix, and
session model defined in this document. Any deviation from this design during
implementation should be documented and agreed before code is written.
