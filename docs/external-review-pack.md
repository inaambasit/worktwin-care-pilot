# WorkTwin Care Pilot - External Review Pack

Version: 2026-05-07
Milestone: 4S.89H

---

## 1. Purpose of This Review Pack

This pack enables independent review of the WorkTwin Care Pilot across four
disciplines: engineering, UX/design, care-sector domain knowledge, and
AI/governance readiness.

The goal is to gather honest, prioritised feedback before any real pilot
deployment. Reviewers should treat this as a working prototype and demo build,
not a production-ready product. It is safe to use for structured demos and
internal review. It is not safe for use with real service-user records,
sensitive HR data, or live care operations.

Feedback will be used to decide what must be fixed, what should be deferred,
and what must never be built.

**Current sources of truth:** `docs/current-state.md` is the authoritative
record of checkpoint, blockers, and pilot-readiness status.
`docs/policy-upload-testing-tracker.md` is the authoritative record of
policy/document testing state. This review pack reflects the position as of
7 May 2026; refer to those documents for the latest updates.

---

## 2. Current Project Snapshot

**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, deployed on
Vercel. Mobile-responsive. Staff app uses drawer navigation on mobile and a
persistent sidebar on desktop.

**Backend:** Python / FastAPI, deployed on Render. Document registry backed by
Supabase (PostgreSQL + private storage bucket).

**Admin access:** Admin demo screen visibility is controlled by
`NEXT_PUBLIC_ADMIN_DEMO_ENABLED`; the live Vercel deployment may have this set
to `true`, making admin demo screens visible. They are not intended for real
end-user access. `NEXT_PUBLIC_ADMIN_DEMO_ENABLED` controls UI visibility only
and does not grant admin API access. All admin and debug API endpoints are
protected by bearer token. Browser admin calls are routed through a
server-side Vercel proxy so the token is never exposed in the browser bundle.
The proxy has been partially hardened (typed path allowlist, method guard,
CSRF fail-closed guard for POST/PATCH, upload content-type/size guards, safe
audit logging, no-store caching); it is not yet production-ready — real
Supabase Auth session validation, real organisation_memberships lookup, and
production CSRF/same-site controls remain outstanding.

**Demo status:** The app is a working pilot/demo prototype. The backend contains
a governed staff /ask RAG path, but it requires OpenAI, the database, and a
qualifying governed document to return source-grounded answers. High-risk topics
always short-circuit to human escalation. When infrastructure is unavailable or
no qualifying source exists, the endpoint returns a safe fallback. The public
demo is governed and fallback-safe, not production-ready.

---

## 3. Current Staff-Facing Experience

The following screens are accessible in the live staff demo:

- **Landing page** - product overview, value proposition, Book a Pilot CTA.
- **Dashboard** - summary cards, quick links to key features.
- **Ask WorkTwin** - governed staff assistant flow. The backend has a
  source-grounded RAG path with strict document gates. It falls back safely
  when OpenAI, the database, or a qualifying governed document is unavailable,
  or when a topic is high risk. The public demo must be treated as non-production
  and fallback-safe unless its live configuration and qualifying source state
  have been explicitly verified.
- **Policy library** - browse and search approved policy documents. Visitor
  Sign-In and Identification Procedure is the first clean Lane A proof —
  approved for staff-visible source-grounded answers. AC32 (Mobile Phone and
  Portable Device Use Policy) has controlled internal Thumhara Centre
  staff-style testing status; QCS AI/RAG permission still requires
  confirmation before wider rollout. CC34 (Infection Control) and QQ03
  (Complaints) remain admin answer-debug only and are not staff-visible.
- **Onboarding hub** - structured onboarding checklist and guidance for new
  staff.
- **Practice scenarios** - learning scenarios to build staff confidence.
- **Access-refusal scenario** - specific scenario covering how to handle an
  access-refusal situation.
- **Private notes** - staff can save private notes. Notes are private by
  default and are not visible to managers.
- **Escalation contacts** - directory of who to contact for sensitive topics
  (safeguarding, medication, HR, legal, wellbeing).

---

## 4. Current Backend and Governance Reality

- Admin-only vector search and answer-debug endpoints exist and are governed.
- The backend contains a governed staff /ask RAG path. It only attempts
  source-grounded answers when OpenAI and the database are configured and a
  qualifying governed document passes all strict staff Ask gates.
- High-risk topics always short-circuit to human escalation -- no AI answer
  is returned.
- If infrastructure is unavailable, no qualifying source exists, or a topic is
  high risk, the endpoint returns a safe fallback.
- The product is not pilot-ready. Authentication, RBAC, admin session protection,
  full safety tests, and pilot governance must be in place before any real staff
  use or real documents are uploaded.
- AC32 (Mobile Phone and Portable Device Use Policy) has been approved only
  for controlled internal Thumhara Centre staff-style testing; it is not
  approved for wider rollout. QCS AI/RAG permission (for extracting policy
  text, storing in WorkTwin/Supabase, vector search, and AI-generated answers
  outside the QCS platform) still requires confirmation before any wider
  deployment.
- Visitor Sign-In and Identification Procedure is the first clean Lane A
  policy — approved for staff-visible source-grounded answers. AC32 has
  controlled internal testing status. CC34 (Infection Control) and QQ03
  (Complaints) remain admin answer-debug only and are not staff-visible.
  CR100 (Safeguarding) and PM11 (Whistleblowing) are human-only escalation
  and are never AI-answerable.
- No real service-user records, MAR charts, care plans, HR/payroll files or
  private case files should be uploaded to the system under any circumstances.
- No real staff, service-user, resident, care-plan, HR, safeguarding
  case-note or named complaint personal data has been introduced. Some
  controlled internal policy testing has used Thumhara Centre/QCS policy
  documents under governance restrictions.
- A data processing agreement (DPA) with Thumhara Centre is required before
  any real personal data is introduced. QCS AI/RAG use for AC32, CC34, and
  QQ03 has not been confirmed as permitted before wider rollout.
- Employee conversations are private by design. The product direction is that
  any future employer dashboards should show anonymised trends only. Individual
  chat transcripts should not be visible to managers.
- The following are permanently out of scope: performance scoring, sentiment
  tracking, surveillance features, productivity monitoring.

---

## 5. Review Prompts

Use the prompt for your reviewer role. Return your response in the output
format described in Section 8.

---

### A. Claude Code Engineering Review Prompt

You are reviewing the WorkTwin Care Pilot codebase at the path provided. This
is a Next.js 14 / FastAPI / Supabase pilot prototype for a UK care-sector AI
assistant. It is not production-ready.

Please review the full codebase and provide:

1. An overall engineering quality rating out of 10.
2. The top 5 engineering strengths.
3. The top 5 engineering weaknesses or risks.
4. The single highest-risk technical issue.
5. The quickest improvement that could be made today.
6. What must be fixed before this is used in a real pilot (with real staff and
   real documents).
7. What should not be built yet (features or infrastructure that would be
   premature).
8. A prioritised list of next technical steps.

Specific areas to cover:

- Next.js App Router structure, component organisation, and TypeScript safety.
- FastAPI route design, dependency injection, and error handling.
- The server-side Vercel proxy for admin calls and its security model.
- Bearer token protection on admin and debug endpoints.
- Supabase storage and database integration (document registry, private bucket).
- The document upload pipeline (PDF validation, personal-data risk scan,
  storage, registry record).
- The RAG/vector search pipeline (admin-only, not staff-facing).
- The governance model (approved_for_staff, escalation_required,
  approved_for_ai_answers flags).
- Environment variable handling (server-only vs public vars).
- The gap between placeholder /ask and production-grade document-grounded RAG.
- Authentication: currently absent. What is the minimum viable auth for a real
  pilot?

---

### B. Codex-Style Strict Technical Review Prompt

You are performing a strict technical review of the WorkTwin Care Pilot. Apply
the same standard you would use for a security-conscious production service
that handles sensitive care-sector data. Treat this as a pre-pilot readiness
audit.

Please provide:

1. An overall technical readiness rating out of 10.
2. The top 5 technical strengths.
3. The top 5 technical weaknesses or gaps.
4. The single highest-risk technical issue.
5. The quickest improvement available.
6. What must be fixed before a real pilot.
7. What should not be built yet.
8. A prioritised list of next steps.

Focus specifically on:

- Security posture: token handling, CORS, input validation, upload safety, SQL
  injection surface, access control completeness.
- Data privacy: what data could leak, to whom, and under what conditions.
- The server-side proxy: is it sufficient as an interim measure or does it
  create new risk?
- Dependency versions and known vulnerability exposure.
- Error handling: what does the system expose to clients on failure?
- The absence of authentication and its implications for a real pilot.
- Scalability and operational readiness: what breaks first under load?
- Observability: is there sufficient logging and monitoring for a pilot?
- The RAG pipeline governance model: is it robust enough?

---

### C. Claude Design / UX and Mobile Review Prompt

You are reviewing the staff-facing experience of the WorkTwin Care Pilot. The
target users are frontline care workers in a UK care home. Many will use the
app on a mobile phone during or between shifts. Some may have limited digital
confidence.

Please review the live demo and provide:

1. An overall UX and design quality rating out of 10.
2. The top 5 UX or design strengths.
3. The top 5 UX or design weaknesses.
4. The single highest-risk UX issue (something that would cause a staff member
   to make a mistake or lose trust).
5. The quickest UX improvement available.
6. What must be fixed before a real pilot.
7. What should not be built yet from a UX perspective.
8. A prioritised list of UX next steps.

Specific areas to assess:

- Mobile navigation: the drawer pattern on mobile vs sidebar on desktop.
- Landing page: does it clearly communicate what WorkTwin is and why staff
  should trust it?
- Dashboard: does it give staff a clear starting point?
- Ask WorkTwin: does the placeholder experience set the right expectations?
  Does it feel safe and trustworthy?
- Policy library: can staff find what they need quickly?
- Onboarding hub: is the structure clear for a new starter?
- Practice scenarios: are they realistic and useful?
- Private notes: is it obvious that notes are private?
- Escalation contacts: is it clear when and how to use this feature?
- Typography, spacing, contrast, and accessibility basics.
- Loading states and error states.
- Overall tone of voice and whether it is appropriate for care staff.

---

### D. Shagufta / Care-Sector Domain Feedback Prompt

You are reviewing the WorkTwin Care Pilot from the perspective of a UK care
home manager or registered care provider. The product is designed to help
frontline care staff find answers in policies, complete onboarding, and know
when to escalate sensitive issues to a human.

Please review the demo and provide:

1. An overall care-sector usefulness rating out of 10.
2. The top 5 things that feel right for care sector users.
3. The top 5 things that feel wrong, missing, or unrealistic.
4. The single highest-risk issue from a care-sector or regulatory perspective.
5. The quickest improvement that would make this more useful for care staff.
6. What must be in place before this could be piloted with a real care team.
7. What should not be built for care sector users at this stage.
8. A prioritised list of next steps from a domain perspective.

Specific questions to consider:

- Would a frontline care worker trust this product? What might cause them not
  to?
- Does the Ask WorkTwin experience feel appropriate given that it currently
  gives placeholder answers? Is the framing honest?
- Are the escalation contacts and escalation triggers realistic? Are any
  missing?
- Is the policy library useful in its current form?
- Do the practice scenarios reflect real situations care staff face?
- Is the private notes framing credible? Would staff believe their notes are
  truly private?
- What CQC or regulatory expectations should this product account for?
- What safeguarding or duty-of-care risks does the product create or help
  mitigate?
- Is the product appropriate for a Thumhara Centre pilot or does it need
  adaptation?

---

## 6. Scoring Areas

Reviewers should score each area out of 10 and include brief notes.

| Area                         | Score / 10 | Notes |
|------------------------------|------------|-------|
| Staff usability              |            |       |
| Mobile experience            |            |       |
| Care-sector realism          |            |       |
| Safety and escalation        |            |       |
| Privacy / no-surveillance trust |         |       |
| Technical architecture       |            |       |
| RAG / governance readiness   |            |       |
| Admin separation / security  |            |       |
| Pilot readiness              |            |       |
| Commercial clarity           |            |       |
| **Overall**                  |            |       |

---

## 7. Known Issues for Reviewers

The following issues are already known. Reviewers do not need to flag these
as new findings, but they are welcome to comment on severity or priority.

1. **Book a Pilot is a session-only enquiry page.** `/book-pilot` now exists
   and the landing page links to it. It is a controlled demo enquiry page only.
   It is session-only and does not yet submit to a backend, CRM, email workflow
   or database. No real enquiries are captured or stored.

2. **Private notes mobile layout needs polish.** The notes screen layout on
   small screens requires further work before it would meet a production bar.

3. **Authentication scaffolding exists but is not active.** `/login` and
   `/login/sent` exist as preparation and demo pages only. Auth scaffolding
   is wired: JWT validation supporting ES256 (JWKS) and HS256, Bearer token
   forwarding from frontend to backend, Supabase SSR client, and membership
   resolution code are all present. However, public pilot auth is not
   activated because 4S.88G (E2E auth proof) remains blocked — the
   `organisation_memberships` table cannot be applied to the
   production-labelled Supabase environment without a safe migration path.
   `PILOT_AUTH_MODE` remains `false`. There is no active/enforced session
   protection or role-based access control for real pilot use. Employee and
   admin routes remain accessible without an authenticated session.

4. **Staff-facing document-grounded RAG is governed and not fully active for
   the public demo.** The backend contains a governed staff /ask RAG path with
   strict document gates and safe fallback behaviour. It requires OpenAI, the
   database, and a qualifying governed document to return source-grounded
   answers. The product is not pilot-ready without authentication, RBAC, and
   completed pilot governance.

5. **Brand name WorkTwin needs clearance.** The name has not been through
   trademark or brand clearance. This is not a blocker for a pilot but must be
   resolved before any commercial launch.

6. **A real pilot would require additional work** including: approved and
   reviewed policy documents uploaded by the organisation, role-based access
   control, staff authentication, a data processing agreement, and sign-off
   from the care provider and their nominated reviewer.

---

## 8. Output Format for Reviewers

Please return your review in the following structure:

**Overall score:** [X / 10]

**Category scores:**
[Complete the scoring table from Section 6]

**Executive summary:**
[3-5 sentences summarising your overall impression]

**Must-fix before pilot:**
[Numbered list - things that make a real pilot unsafe or impractical without them]

**Should-fix before wider demo:**
[Numbered list - things that would cause embarrassment or reduce credibility in
a broader demo context]

**Later roadmap:**
[Things that are right to defer but should not be forgotten]

**Risks and concerns:**
[Any risks not covered above - regulatory, reputational, technical, ethical]

**Recommended next milestone:**
[One sentence: what should the team focus on next, and why]
