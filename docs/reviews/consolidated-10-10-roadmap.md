# WorkTwin Care Pilot -- Consolidated 10/10 Roadmap

**Produced:** 2026-05-03
**Milestone:** 4S.78 - Consolidate review feedback into 10/10 roadmap
**Reviews consolidated:**
- docs/reviews/claude-code-engineering-review.md (Claude Code, 6/10)
- docs/reviews/codex-strict-technical-review.md (Codex, 5/10)
- docs/reviews/claude-design-ux-mobile-review.md (Claude Design, 7/10)
- docs/external-review-pack.md

This is a planning and documentation document only. No application code, backend
code, frontend code, environment files, SQL files, README files, governance flags,
API behaviour, or RAG behaviour were changed.

---

## 1. Executive Summary

### Current state of the product

WorkTwin Care Pilot is a privacy-first AI onboarding, policy and learning assistant
for UK care providers. The current build is a working demo prototype deployed on
Vercel (Next.js 14 frontend) and Render (Python/FastAPI backend) with Supabase as
the document registry and storage layer. All staff-facing pages are functional. The
admin document registry, upload pipeline, governance gates, and admin-side RAG
pipeline are implemented and governed. The staff-facing Ask WorkTwin endpoint
currently returns placeholder responses for most configurations, though the backend
code contains a governed staff RAG path that activates when a qualifying document
passes all gates and OpenAI is configured.

### Overall honest judgement

This is a better-than-average prototype. The privacy-by-design decisions are
visible in the code, not just in the marketing copy. The three-gate governance
model, server-side secrets handling, deterministic safety escalation logic, and
minimised staff response shape are genuinely strong decisions. The UX tone is
calm, care-appropriate and consistently framed around escalation-first behaviour.

It is not ready for a real pilot. The single most important gap is the complete
absence of any authentication or role-based access control. Every other gap is
solvable in stages. This one is a prerequisite for everything else.

### Why the product is promising

The governance model is the strongest part of the codebase. Making it structurally
difficult to expose an unapproved document to a staff member is the right default
in a regulated care setting. The product direction -- staff get honest answers from
approved policies, with human escalation for anything sensitive -- is credible and
useful for frontline care workers. The decision not to build surveillance,
performance scoring, or conversation history into the product is not a gap; it is a
competitive principle that the target care sector will value. The visual language
is calm and appropriate. The access-refusal scenario is a standout artefact.

### Why it is not pilot-ready yet

A real pilot means real staff, real identity, and real policy documents uploaded by
Thumhara Centre. Under current conditions:

- Any HTTP client can submit a question as any user, in any role, for any
  organisation. There is no identity verification of any kind.
- The admin proxy, if enabled, would allow any visitor to the public URL to
  trigger admin operations using the server-held bearer token.
- Documentation still describes staff-facing RAG as placeholder-only, but the
  current backend code has a governed staff RAG path. Any person relying on the
  docs to understand the system's capabilities has an inaccurate picture.
- Ask WorkTwin does not show clearly enough whether answers are demo-only,
  source-grounded, or unavailable. In a care setting, ambiguity about the source
  of an answer is a trust and safety risk.
- No data processing agreements are in place with Supabase or OpenAI.

Until authentication exists, the product's privacy guarantees -- individual
conversations private from managers, staff identity not shared -- are aspirations,
not technical facts.

---

## 2. Review Score Summary

| Review                                 | Score | Reviewer        | Milestone reviewed |
|----------------------------------------|-------|-----------------|-------------------|
| Claude Code engineering review         | 6/10  | Claude Code     | 4S.74             |
| Codex strict technical review          | 5/10  | Codex           | 4S.76             |
| Claude Design UX/mobile review         | 7/10  | Claude Design   | 4S.77             |

### Overall combined judgement

**5.5 to 6/10 overall; pilot readiness is approximately 5/10.**

The product concept and governance design score higher than this. The current score
is held down by a single critical gap (absent authentication) and several serious
gaps that compound it (no tests, monolithic backend, no observability, documentation
drift). The UX score of 7/10 is the most honest reflection of the demo experience:
it is good enough for a friendly walkthrough with a care manager, but not ready for
an unsupervised frontline worker pilot.

The strictest technical reviewer gave 5/10 and that is the correct ceiling for
pilot readiness assessment. The product should not move to a real pilot until the
technical readiness score can be honestly argued to be at least 7/10.

---

## 3. Cross-Review Themes

All three reviews were conducted independently. The following themes appeared in
two or more reviews and represent the strongest signals for prioritisation.

### 3.1 Authentication and RBAC

All three reviews agree: this is the single highest-risk gap. There is no login,
no session management, and no role-based access control. Staff identity is a
server-set environment variable, not a verified user session. Admin proxy access
depends on a bearer token that is correctly hidden from the browser bundle, but the
proxy itself does no session check before forwarding to the backend. The Claude Code
and Codex reviews both call this a prerequisite, not a deferred improvement. The
Design review echoes this: authentication must exist before a real pilot.

### 3.2 Admin proxy hardening

Both technical reviews identify the admin proxy at
frontend/app/api/admin/[...path]/route.ts as safe only while disabled. When
ADMIN_PROXY_ENABLED=true, it forwards all matching paths to the backend with full
admin credentials, with no session check, no CSRF protection, no path allowlist, and
no method allowlist beyond what is exported. The Codex review describes it as a
privileged backend-to-backend tunnel. The risk is real but it is manageable: the
default is disabled, and the fix is well understood.

### 3.3 Ask WorkTwin honesty and source-grounding clarity

The Design review identifies this as the highest-risk UX issue. The Codex review
identifies a parallel technical issue: when citation validation fails, the backend
currently still returns the generated answer text with allowed_to_answer=false. In a
regulated care setting, returning a model-generated answer that is not source-grounded
creates a safety risk even if the frontend labels it as unavailable. Both issues need
to be fixed together: the backend should discard non-grounded answers server-side, and
the frontend should show clearly what mode Ask WorkTwin is in, whether the answer is
source-grounded, and what the fallback behaviour is.

### 3.4 Documentation and code-state alignment

The Codex review identifies a specific and material inconsistency: several documents,
including README.md and external-review-pack.md, still describe staff-facing Ask as
placeholder-only. The current backend code has a governed staff RAG path that
activates when a qualifying document passes all eleven gates and OpenAI is configured.
This drift misleads reviewers, contributors, and future pilots about what the system
can do. It needs to be corrected before any further stakeholder engagement.

### 3.5 Mobile trust and Private Notes polish

Both the Claude Code and Design reviews flag Private Notes mobile layout as a known
issue. The Design review goes further: the session-only persistence behaviour and the
privacy boundary of Private Notes are not explained clearly enough on the Notes page
itself. Staff need to know that their notes are private and that they are session-only
before they rely on them. The mobile navigation pattern (desktop sidebar vs mobile
drawer) also needs a pass for duplicate landmarks, focus behaviour, and screen-reader
clarity.

### 3.6 Book a Pilot flow

All three reviews note that the landing page Book a Pilot CTA is currently a mailto
link with no designed flow. The Design review flags it as a must-fix before wider
demo. For a product that is trying to attract a care sector pilot client, the
commercial entry point needs to be more deliberate than a bare email link.

### 3.7 Upload and document governance hardening

Both technical reviews identify gaps in the upload pipeline. The personal-data risk
scan uses a 2,000 character preview rather than the full extracted text. Some error
paths return raw exception text to admin clients. Upload responses expose storage
keys. These are acceptable behind real admin authentication; they are not acceptable
without it. Both reviews also note that the scan is pattern-based and will produce
false negatives. Human review before embedding or staff visibility is the correct
control and must remain mandatory.

### 3.8 Testing and observability

Both technical reviews found no backend tests. The only frontend test is a smoke
test placeholder. The governance gates (_can_embed_document, _can_use_document_for_
answer_debug, _can_show_document_to_staff) are the highest-value test targets in the
system: safety-critical boolean logic in a regulated setting. They should have
exhaustive branch coverage. The backend uses print() for all diagnostic output, has
no structured logging, no request correlation IDs, no error monitoring, and no
operational alerting. This is acceptable for a prototype; it is not acceptable for
a pilot.

### 3.9 Do-not-build-yet items

All three reviews agree independently on a set of features that must not be built
at this stage. These are enumerated in Section 7 below.

---

## 4. Must-Fix Before a Real Pilot

A real pilot is defined as real staff identities, real Thumhara Centre policy
documents, and real queries from care workers during or between shifts. The
following must be in place before that scenario is safe. These are ordered by
dependency: earlier items are prerequisites for later items.

**1. Define the pilot security boundary (design step, not a build step)**

Before building authentication, decide the minimum viable identity model: which
auth provider, what staff roles, what admin roles, how organisation membership is
enforced. Write this down as a design document. Every subsequent auth build
decision depends on having this agreed. This unblocks items 2, 3, and 4.

**2. Staff authentication**

A minimum viable authentication layer is required before any real staff use. At
minimum: email-based magic link via Supabase Auth, Auth0, Clerk, or equivalent.
Staff must verify identity before accessing /ask or /policies. The user_id, role,
and organisation_id must be derived server-side from the verified session, not
from request body parameters supplied by the client. Without this, the product's
privacy guarantee -- individual conversations private from managers -- is not
technically enforced.

**3. Admin authentication and RBAC**

The admin proxy must validate a server-side admin session before forwarding any
request to the backend. Admin roles must be enforced server-side, not hidden by UI
only. Add path and method allowlists to the proxy before enabling it on any public
URL. Add CSRF protection or same-site session controls for state-changing admin
requests.

**4. Admin proxy kept disabled until admin auth exists**

Keep ADMIN_PROXY_ENABLED=false by default on all public deployments until items 2
and 3 are complete. The current default is correct and must be maintained.

**5. CORS configured to production domain only**

ALLOWED_ORIGINS must be set explicitly to the production Vercel URL on the Render
instance. The allow_methods=["*"] and allow_headers=["*"] settings are too broad
for a real pilot and should be narrowed. Do not leave localhost in allowed origins
in any environment handling real data.

**6. Pin the OpenAI dependency**

Change "openai" to "openai==(current installed version)" in
backend/requirements.txt. Every fresh deployment currently resolves to the latest
published release. A redeploy triggered by an unrelated commit could silently pull
a breaking SDK change. All other backend dependencies are already pinned. This is
a five-minute change that eliminates silent breakage risk.

**7. Make non-grounded Ask answers fail closed server-side**

If citation validation fails and the answer is not source-grounded, the backend
should discard the generated answer text and return the standard safe fallback.
Currently it returns the generated text alongside allowed_to_answer=false. In a
regulated care setting, a non-grounded answer should not reach the staff client at
all, regardless of how the frontend labels it.

**8. Ask WorkTwin mode status and honesty UX**

Add a clearly visible status line above the Ask WorkTwin composer that states what
mode the assistant is currently in: demo-only, source-grounded from approved
documents, or escalation-only. Add a worked example with a visible citation card.
This is a must-fix before real pilot, not just a demo improvement: staff making
care decisions based on AI answers must be able to see whether the answer is
grounded in an approved policy.

**9. Persistent rate limiting**

The per-user and per-organisation rate-limit counters live in process memory and
reset on every service restart. A Render restart resets all counters. Replace with
a Supabase table or Redis-backed store before any real deployment.

**10. Tests for governance gates**

The _can_embed_document, _can_use_document_for_answer_debug, and
_can_show_document_to_staff functions must have exhaustive pytest coverage before
real documents are governed by them. These are safety-critical boolean paths. Add
tests for the high-risk short-circuit before retrieval, the staff source response
minimisation, the /policies organisation scoping, and the upload defaults.

**11. Data Processing Agreement and legal review**

Before any real staff data (including query text) is processed, a DPA must be in
place with Supabase and with OpenAI. Query text sent to the OpenAI API constitutes
personal data in a regulated employment context under UK GDPR. The care provider
must obtain sign-off from their nominated reviewer on the AI governance model
before any real document is uploaded.

**12. Human review of all uploaded documents**

The personal-data risk scan is pattern-based and will produce false negatives. No
real document should reach embedding, staff visibility, or AI answers without human
review. The scan is a safeguard against accidental inclusion, not a replacement
for deliberate review.

---

## 5. Should-Fix Before Wider Demo

These items would cause credibility loss or reduce trust in a broader demo context
even if they do not represent safety risks.

**1. Documentation and code-state alignment**

Remove the statement that staff-facing Ask is placeholder-only from README.md,
backend/README.md, and external-review-pack.md. Replace with an accurate
description: the backend code has a governed staff RAG path; whether it activates
depends on deployment configuration and document governance state. Distinguish
code capability, governance state, and deployment state clearly.

**2. Book a Pilot enquiry flow**

Replace the bare mailto: link with a deliberate enquiry journey. At minimum, a
short structured form (name, organisation, role, what they are looking for) with
a clear confirmation message. For a product seeking a care sector pilot client,
the commercial entry point must be more designed than a plain email link.

**3. Private Notes trust and session-only notice**

Add a clear notice on the Notes page explaining: notes are private and visible only
to the staff member who writes them; notes are session-only and are not persisted
between visits in the current build. Staff must not rely on notes to survive a
browser close. This notice is not a disclaimer; it is honest product communication.

**4. Mobile pass at 375px and 414px**

Run a full mobile review at 375px (iPhone SE) and 414px (standard iPhone) covering:
Private Notes layout, drawer open/close behaviour, focus trap on drawer open, Ask
WorkTwin at small width, and the landing page above the fold. Check for horizontal
scroll. Verify no duplicate navigation landmarks between the drawer and the sidebar.

**5. Landing page "what this is / what this is not" block**

Add a short, honest block above the fold that explains what is live, what is
demo-only, and what is not yet production-ready. This is particularly important
when showing the product to care home managers or CQC-aware stakeholders who will
ask directly.

**6. Frontend and backend Ask API contract alignment**

The frontend lib/api.ts currently sends organisation_id, user_id, and user_role in
the AskRequest payload. The backend AskRequest model now accepts only question.
Pydantic silently ignores the extra fields, but the contract is stale and misleading.
Remove the identity fields from the frontend payload and update the frontend
RiskCategory type to include the backend risk categories that are currently missing.

**7. Scenario polish: access-refusal first**

Do not add new practice scenarios until the existing access-refusal scenario is
polished to a production standard. It is the strongest artefact in the demo and
deserves to be completed before the set is extended.

**8. Upload error hardening**

Remove raw exception text and raw storage keys from upload error responses that
reach admin clients. These are acceptable in a developer-controlled environment;
they are not acceptable in a demo shown to a care home manager.

---

## 6. Later Roadmap

Important but not immediate. These should be planned but not started until the
must-fix and should-fix items above are complete.

**Backend modularisation**

backend/app/main.py is approximately 3,930 lines. Split into modules:
app/routes/admin.py, app/routes/staff.py, app/routes/health.py,
app/services/embedding.py, app/services/governance.py, app/services/chunking.py,
app/models.py, app/db.py. This does not change behaviour. It makes every component
independently testable and every contributor able to navigate the codebase. Do not
attempt this until authentication work is stable: a merge conflict in main.py
during parallel auth development would be destructive.

**Structured logging and observability**

Replace print() with Python's logging module configured to emit structured JSON.
Add a correlation ID header (X-Request-ID) in FastAPI middleware so a request can
be traced end to end. Add alerting for upload failures, embedding failures, LLM
failures, and rate-limit spikes. Do not log raw query text, answer text, names, or
transcripts: observability must remain privacy-preserving.

**Supabase row-level security**

The backend service role bypasses RLS by design. All tenant isolation currently
depends on application logic. For a future multi-organisation deployment, RLS
policies enforcing organisation boundaries at the database level would be required.
This should not be designed until the single-organisation pilot is validated.

**Cost controls and model budgets**

The backend caps answer output and source context but has no deployment-level
budget, per-user daily cap, model allowlist, or OpenAI cost alerting. Add these
before any deployment handling production volumes.

**Brand clearance**

The name WorkTwin has not been through trademark or brand clearance. This is not
a blocker for an internal pilot but must be resolved before any commercial launch
or public marketing.

**Care-sector domain review**

The external review pack includes a prompt for a care-sector domain review
(Section D, Shagufta). This review has not yet been completed. It should be
scheduled once the product-state alignment (4S.79) and Ask WorkTwin honesty pass
(4S.80) are done, so the reviewer sees an honest, accurate product rather than one
with known documentation drift.

**Full security review before any real data**

Before real documents or real staff identities are introduced: review the upload
endpoint for path traversal risk, review the PostgREST calls for injection surface,
confirm Supabase service role key scope is as narrow as operations require, and
review the catch-all proxy path for request smuggling risk. This is a dedicated
security review milestone, not a checklist item.

---

## 7. Do Not Build Yet

These items must not be started at this stage. They are listed here to make that
position firm, not tentative.

**Manager access to staff questions**

This is permanently out of scope. Any feature that allows a manager to see what
questions individual staff members asked, in any form, would violate the product's
core privacy guarantee and destroy staff trust.

**Performance, productivity, and sentiment dashboards**

Explicitly ruled out by the product direction. Any feature that associates a named
individual with a question count, topic category, activity period, or sentiment
score constitutes surveillance. The current admin insights page shows anonymised
trends only. That boundary must hold.

**Conversation history persistence**

Storing staff query history introduces a new category of sensitive data. It makes
it technically possible to retrieve and expose conversation content even if the
current UI does not. This should not be built at any stage unless the data can be
shown to be irretrievably private from managers and administrators, with a designed
retention and access model.

**Multi-organisation SaaS expansion**

The schema has organisation_id fields throughout. Real multi-tenancy requires
row-level security policies enforcing organisation boundaries at the database level,
auth that binds users to organisations, tenant isolation tests, and operational
monitoring. None of this should be designed until the single-organisation pilot is
validated.

**Native mobile application**

The responsive web app covers the mobile use case adequately at this stage. A
native iOS or Android application would require a separate security review, separate
auth token handling (device secure storage), and App Store review for a
healthcare-adjacent product. This is not warranted until the web pilot is validated.

**More scenarios before access-refusal is polished**

Do not extend the practice scenarios set until the access-refusal scenario is
complete and polished. Building more half-finished scenarios dilutes the strongest
artefact in the demo.

**AI features inside Private Notes**

Private Notes are private by design and session-only. Adding AI processing inside
Private Notes would require sending note content to an AI model, which raises
consent, privacy, and governance questions that have not been designed. Do not add
AI features to Private Notes.

**Staff-facing RAG as the headline product experience before the UI can prove
source-grounding clearly**

The staff RAG path exists in the backend code. It should not be promoted as the
headline staff experience until the UI can show clearly and verifiably that an
answer came from a named, approved, governance-reviewed document. Source-grounding
proof is a precondition for staff trust in a care setting.

---

## 8. Recommended Milestone Sequence

This sequence picks up from 4S.78 (this roadmap) and leads towards a state where
a real controlled pilot with Thumhara Centre is technically and organisationally
safe. It is ordered by: documentation integrity first, UX trust second, security
design and hardening third, testing and domain review fourth.

**4S.79 -- Documentation and product-state alignment**

Goal: make all documentation accurately describe what the code does, distinguishing
code capability, governance state, and deployment state. Remove the statement that
staff RAG is placeholder-only where the code no longer makes it so. Update
README.md, backend/README.md, and external-review-pack.md. This milestone is
low-cost, high-value, and unblocks honest conversations with all stakeholders.

**4S.80 -- Ask WorkTwin honesty and source-grounding UX pass**

Goal: add a clearly visible mode status line above the Ask composer; add a worked
example with a citation card; make the escalation wording consistent; implement the
backend fail-closed behaviour for non-grounded answers. This is the UX change with
the highest trust impact and the technical change with the highest safety impact.

**4S.81 -- Mobile trust and Private Notes polish**

Goal: full mobile pass at 375px and 414px; fix Private Notes layout on small
screens; add the session-only and privacy boundary notice to the Notes page; check
drawer focus trap and screen-reader landmark behaviour.

**4S.82 -- Book a Pilot enquiry flow**

Goal: replace the mailto Book a Pilot CTA with a deliberate enquiry journey: a
short form, a clear confirmation, and a defined follow-up path. This is a commercial
entry point and must be designed as one.

**4S.83 -- Pilot security boundary design**

Goal: write the design document that defines the minimum viable auth model for the
Thumhara pilot. Which provider, what staff roles, what admin roles, how organisation
membership is enforced, what each role can access, what the session model looks like.
This is a design and documentation milestone only -- no code changes.

**4S.84 -- Admin proxy hardening plan**

Goal: design and document the path allowlist, method allowlist, CSRF controls, and
admin session validation approach for the catch-all proxy. This is a design step
before the implementation step. Keep ADMIN_PROXY_ENABLED=false until these controls
are implemented.

**4S.85 -- Staff authentication design and implementation**

Goal: implement minimum viable staff authentication based on the design agreed in
4S.83. Wire user_id, role, and organisation_id to the verified server-side session.
Block /ask and /policies for unauthenticated requests. This is the single biggest
prerequisite for a real pilot.

**4S.86 -- Governance and Ask safety tests**

Goal: add pytest tests for the governance gates (_can_embed_document,
_can_use_document_for_answer_debug, _can_show_document_to_staff), the escalation
short-circuit, the staff source response minimisation, the /policies organisation
scoping, and the upload defaults. These are safety-critical paths in a regulated
setting and must have exhaustive branch coverage.

**4S.87 -- Shagufta care-sector domain review**

Goal: commission the care-sector domain review using the prompt in
external-review-pack.md Section D. By this milestone, the docs are accurate, the
Ask UX is honest, and the product is more realistic to review. The domain review
will produce a separate scored review document.

**4S.88 -- Care-sector pilot readiness checklist**

Goal: produce a formal checklist of every condition that must be true before
Thumhara Centre is given access to a real pilot environment with real policy
documents. Include: DPA in place, legal sign-off, nominated governance reviewer
confirmed, approved documents uploaded and reviewed, auth tested, CORS locked,
OpenAI pinned, rate limiting persistent, security review completed.

---

## 9. First Next Milestone Recommendation

**Start with 4S.79 -- Documentation and product-state alignment.**

The reason is specific: the Codex review identified that several documents, including
README.md and external-review-pack.md, still describe staff-facing Ask as
placeholder-only. The current backend code has a governed staff RAG path. This is
not a minor inconsistency. Any stakeholder, reviewer, or future pilot client reading
the documentation has a materially inaccurate picture of what the system can do.

Fixing documentation drift is the lowest-cost, lowest-risk action in the roadmap.
It takes one milestone, produces no application code changes, and immediately makes
every subsequent conversation -- with Thumhara Centre, with technical reviewers,
with the care-sector domain reviewer -- more honest and more productive.

The alternative would be to start with the Ask WorkTwin UX pass (4S.80) or with
authentication design (4S.83). Both are more impactful in the long run. But starting
either of those while the documentation still misrepresents the product means the
team is building on an inaccurate shared understanding. Documentation alignment is
the correct foundation.

After 4S.79, the recommended sequence is: 4S.80 (Ask honesty UX), 4S.81 (mobile
trust), 4S.82 (Book a Pilot flow), then the security and auth design sequence from
4S.83 onwards. Authentication implementation (4S.85) is the most critical single
milestone for real pilot readiness, but it requires the design groundwork of 4S.83
and 4S.84 to be done first.

---

## 10. Definition of 10/10 for This Project

A 10/10 for WorkTwin Care Pilot does not mean the most sophisticated care sector AI
product ever built. It means this specific product is excellent at what it is
designed to do. The standard below is what "excellent" looks like for this type of
product.

### Safe

The product does not cause harm. Sensitive topics (safeguarding, medication, HR,
legal, wellbeing) route to human escalation without fail. Non-grounded answers are
never shown to staff. Upload and governance controls prevent unsafe documents from
reaching the staff AI path. Authentication exists and is enforced.

### Honest

The product does not overstate its capabilities. Staff can see clearly whether an
answer is source-grounded, demo-only, or unavailable. Documentation accurately
describes the current code and deployment state. The demo does not imply capabilities
that do not yet exist.

### Mobile-friendly

The product works reliably on a mid-range Android phone at 375px. Navigation, Ask
WorkTwin, Private Notes, and escalation contacts are fully usable on mobile without
horizontal scroll, focus traps, or layout failures. Frontline care workers use phones
on the floor, not laptops at desks.

### Privacy-first

Individual staff conversations are never accessible to managers. No surveillance,
performance scoring, or sentiment tracking features exist in the product. Admin
dashboards show anonymised trends only. The privacy guarantee is enforced
technically, not just stated in copy.

### Governed

Every document used in AI answers has passed the full multi-gate governance
checklist: real document, not dummy, not sensitive, not escalation-required,
approved for embedding, approved for staff visibility, approved for source-grounded
answers, governance-reviewed by a named person on a named date. No shortcut through
any gate is possible.

### Care-sector credible

The product has been reviewed by a care-sector domain expert and adjusted in
response to their feedback. The scenarios reflect real situations care workers face.
The escalation contacts match the actual reporting structure in a UK care home. The
tone is appropriate for workers who may be stressed, time-pressed, and on mobile
during a shift.

### Technically defensible

The codebase can be explained to a sceptical technical reviewer without apology.
The backend is modular and testable. The governance gates have exhaustive test
coverage. Dependencies are pinned. Logging is structured and privacy-preserving.
Authentication is real. The admin proxy has session validation, path allowlists, and
CSRF protection.

### Pilot-ready

A data processing agreement is in place with Supabase and OpenAI. Legal review of
the AI governance model is complete. The care provider has a named governance
reviewer. A pilot readiness checklist has been completed and signed off. Real
documents have been reviewed by a human before upload. The organisation has been
briefed on what the product does and does not do.

### Not lots of features

A 10/10 for this product is not a product with many features. It is a product that
does a small number of things correctly: answers grounded in approved policies,
honest escalation for sensitive topics, private notes, access-refusal guidance, and
a clear onboarding path. Fewer features done to a high standard in a governed,
safe, honest way is the correct definition of excellent for this product and this
sector.
