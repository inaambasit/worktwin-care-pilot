# 4S.102A — Trusted Staff Readiness Master Plan

**Status:** Documentation only — no code changes  
**Date:** 2026-05-26  
**Author:** WorkTwin Care Pilot team  
**Checkpoint:** 8e47a12

---

## 1. Current Position

| Item | Detail |
|---|---|
| Latest checkpoint | 8e47a12 — Align current state after 4S101 polish sequence |
| Proven app checkpoint | 41761ba — Add mobile safety smoke coverage |
| Build | Passed |
| Playwright smoke tests | 33/33 passed |
| Deployment mode | Controlled preview only |
| Production-ready? | No |
| Live operational use? | No |
| Ready for unsupervised trusted staff use? | No — additional policy coverage, secure login, and evidence capture are required first |

The product has a stable, tested build and a controlled preview environment. The mobile UI, policy library, Ask WorkTwin, scenario guidance, escalation contacts, fictional service-user cards, private notes and privacy model are all exercised. However, access is not yet invite-only, policy coverage is partial, and a structured staff practice workflow with feedback capture has not been completed. These gaps must be resolved before 3–5 trusted staff can practise safely.

---

## 2. Readiness Definition

"Ready for trusted staff practice" means all of the following conditions are met.

### Access
- Login is invite-only — only named, known staff can enter
- No open public access to staff portal routes
- Staff have been briefed that this is a practice environment, not live operational software

### Data
- No real confidential data of any kind is present
- All service-user profiles are clearly fictional
- All contact details shown are clearly labelled as demonstration-only
- Private Notes are clearly labelled as non-official records that are not stored or shared

### Policy coverage
- Enough useful, approved policy documents are indexed to support a meaningful practice session
- Low-risk queries return safe, accurate Ask answers
- High-risk queries (medication, safeguarding, complaints) route to escalation-only responses, not attempt to answer

### Staff journey
- Staff can complete a clear end-to-end journey: login → dashboard → Ask → Policy Library → Scenario Guidance → fictional cards → feedback
- The journey works on mobile as well as desktop
- Escalation contacts are visible and clearly labelled as illustrative only

### Feedback
- A structured feedback form or log is in place
- Each session produces a written evidence record
- A go/fix/stop decision is made after each session

### Stop conditions
- Written stop conditions are in place and known to the session facilitator
- Any stop condition triggered halts testing immediately

---

## 3. Policy Coverage Plan

The table below maps policy areas to current coverage status, required documents, recommended lane, risk level, and next action.

**Lane definitions:**

| Lane | Meaning |
|---|---|
| A | Safe for Ask answers — low risk, clear guidance, suitable for direct staff response |
| B | Cautious staff-visible support — useful but response must include "check with your manager/senior" |
| C | Escalation-only / human-led — WorkTwin surfaces signposting only, never attempts a full answer |
| D | Do not upload or use yet — too sensitive, too variable, or requires legal/governance sign-off first |

---

| Policy area | Example staff questions | Current coverage | Needed document | Suggested lane | Risk notes | Next action |
|---|---|---|---|---|---|---|
| Visitor sign-in | "What do I do when a visitor arrives?" "Where is the sign-in sheet?" | Partial — visitor SOP approved | Visitor sign-in and escorting SOP | A | Low risk, straightforward process | Confirm upload and index; test Ask response |
| Professional boundaries | "Can I accept a gift from a service user?" "Can I give out my personal number?" | Not indexed | Professional boundaries policy | B | Medium risk — nuance required; answer must say "speak with your manager" | Prepare and approve document; assign to 4S.102C |
| Confidentiality | "What can I tell a family member about a service user?" | Not indexed | Confidentiality and information sharing policy | B | Medium risk — GDPR context; response must include escalation prompt | Prepare and approve document; assign to 4S.102C |
| Mobile phone / device use | "Am I allowed to use my personal phone during a shift?" | Not indexed | Mobile phone and personal device use policy | A | Low risk, clear rule-based guidance | Prepare and approve document; assign to 4S.102C |
| Infection / hygiene | "When do I need to use gloves?" "What is the hand-washing procedure?" | Not indexed | Infection prevention and control policy | A | Low risk, evidence-based guidance | Prepare and approve document; assign to 4S.102C |
| Fire / emergency procedure | "What do I do if the fire alarm goes off?" | Not indexed | Fire safety and emergency evacuation procedure | A | Low risk for basic orientation; do not replace site-specific drills | Prepare and approve document; note must state "follow your site's specific plan" |
| Accident / incident reporting | "A service user has had a fall — what do I do first?" | Not indexed | Accident, incident and near-miss reporting procedure | B | Medium risk — action sequence matters; response must prompt escalation | Prepare and approve document; lane B with escalation prompt |
| Food, fluids and nutrition support | "A service user says they are not hungry — do I record that?" | Not indexed | Food, fluids and nutrition support guidance | B | Medium risk — individual needs vary; must prompt senior review | Prepare and approve document; assign to 4S.102C |
| Personal care, dignity and respect | "How do I support someone with personal hygiene in a dignified way?" | Not indexed | Personal care, dignity and respect standards | A | Low-to-medium risk — principles-based; reinforce person-centred approach | Prepare and approve document; assign to 4S.102C |
| Communication with families and professionals | "A family member is asking me questions about their relative's care plan — what do I say?" | Not indexed | Communication with families and external professionals policy | C | High risk — information governance; escalation-only; route to senior/manager | Assign to lane C; do not attempt full answer; add to escalation-only set |
| Lone working / safe working | "I am doing a home visit alone — what do I need to do?" | Not indexed | Lone working and safe working procedure | B | Medium risk — safety-critical but guidance is clear; response must confirm senior must be notified | Prepare and approve document; lane B with check-in requirement |
| Medication escalation | "A service user is asking me to give them their medication — what do I do?" | Not indexed | Medication escalation and administration boundary guidance | C | High risk — never attempt full answer; WorkTwin must only say "contact your medication lead or manager immediately" | Lane C only; do not upload full medication policy — escalation signposting only |
| Safeguarding escalation | "I am worried a service user is being harmed — what do I do?" | Not indexed | Safeguarding escalation pathway (signposting only) | C | Highest risk — WorkTwin must only say "contact your safeguarding lead, manager or call 999 if immediate danger" — never advise further | Lane C only; escalation-only response; test carefully before any staff sees it |
| Complaints / raising concerns | "A service user is unhappy with their care — how do I raise this?" | Not indexed | Complaints procedure and whistleblowing / raising concerns guidance | C | High risk — regulatory context; must route to manager or registered complaints process; do not attempt to adjudicate | Lane C only; escalation-only; assign to review before upload |

---

## 4. Next Policy Batch Recommendation

Prepare these 5–8 documents first. They are staff-facing, practical, and low-to-medium risk. They will unlock the most useful Ask responses for a trusted staff practice session.

### Batch 1 — Prepare and index (low-to-medium risk, Lane A or B)

| Priority | Policy area | Lane | Rationale |
|---|---|---|---|
| 1 | Mobile phone / device use | A | Short, clear, rule-based — easy to prepare; immediate staff relevance |
| 2 | Infection / hygiene | A | Evidence-based, widely standardised; low variation between providers |
| 3 | Fire / emergency procedure | A | Basic orientation; include "follow your site-specific plan" caveat |
| 4 | Personal care, dignity and respect | A | Core care values; principles-based; useful for new and experienced staff alike |
| 5 | Professional boundaries | B | High relevance to daily staff queries; medium risk; needs "check with manager" prompt |
| 6 | Confidentiality | B | Frequent staff question; moderate risk; GDPR framing required |
| 7 | Lone working / safe working | B | Safety-relevant; clear procedure exists; medium risk |
| 8 | Accident / incident reporting | B | Common scenario; action sequence must be correct; escalation prompt required |

### Escalation-only set — Prepare signposting text only (Lane C — do not upload full policy)

| Policy area | Lane | Action |
|---|---|---|
| Medication escalation | C | Write escalation-only response text; do not upload medication policy |
| Safeguarding escalation | C | Write escalation-only response text; test response carefully before any staff session |
| Communication with families | C | Write escalation-only response text; route to manager |
| Complaints / raising concerns | C | Write escalation-only response text; route to complaints lead |

---

## 5. Secure Login Readiness Plan

### Current position

The public preview is accessible without authentication. Staff portal routes are not protected behind invite-only login. Supabase auth is configured but the invite-only membership model for trusted staff has not been activated. No admin proxy is exposed to the public. No real service-user data is present.

### What trusted staff practice requires

- Staff portal routes must be protected — no unauthenticated access
- Login must be invite-only — named staff receive an invite link or magic link
- Supabase organisation membership must be scoped to named staff only
- Public pages remain accessible without login: landing page, privacy model, book pilot
- No admin proxy is enabled in the public environment
- No real service-user data is present until secure data governance has been reviewed and approved separately

### Auth readiness table

| Auth item | Current known status | Risk | Required action | Slice |
|---|---|---|---|---|
| Staff portal routes protected | Not confirmed — currently in open preview | High — any member of public can access staff features | Confirm route protection; apply auth middleware to all staff routes | 4S.103A |
| Invite-only login | Not activated | High — trusted staff session requires controlled access | Activate Supabase invite-only or magic link flow for named staff only | 4S.103B |
| Organisation membership scoping | Not confirmed | Medium — without scoping, any authenticated user could access | Confirm org membership required for staff portal access | 4S.103A |
| Public pages remain open | Confirmed — landing, privacy model, book pilot are public | Low | Verify these routes do not require auth after staff route protection is applied | 4S.103A |
| Admin proxy exposed publicly | Not exposed — confirmed | Low — current state is correct | Confirm no change to this; do not expose admin proxy | Ongoing |
| Magic link / email invite flow | Supabase auth configured; invite flow not tested end-to-end | Medium | Test full invite-only login flow for a named test user before any staff session | 4S.103B |
| Real service-user data absent | Confirmed — no real data present | Low — current state is correct | Maintain this; do not add real data until governance approved | Ongoing |
| Auth middleware on API routes | Not confirmed | High — staff portal auth must cover API routes, not just pages | Audit API route protection as part of auth readiness | 4S.103A |
| Session timeout behaviour | Not tested | Medium — long sessions increase exposure risk | Define and test session timeout; confirm staff are logged out after inactivity | 4S.103A |
| Supabase RLS baseline | Reviewed in 4S.90M — baseline established | Low — baseline is in place | Confirm RLS covers all tables used in staff portal | 4S.103A |

---

## 6. Trusted Staff Practice Workflow

The following is the exact journey a trusted staff member should complete in a supervised practice session. Each step should be tested and recorded.

### Step 1 — Login
- Staff receive an invite link or magic link to their named email address
- Staff follow the link and authenticate
- Staff land on the staff dashboard
- Confirm: login works; staff see their name or email confirmed; no access for unauthenticated users

### Step 2 — Dashboard
- Staff see the dashboard with clear navigation
- Staff see no real service-user data
- Confirm: dashboard loads correctly on mobile and desktop

### Step 3 — Ask WorkTwin
- Staff type a realistic but low-risk question (e.g. "What do I do when a visitor arrives?" or "When do I need to use gloves?")
- Staff review the response
- Staff note: Was the answer useful? Did it feel safe? Was escalation prompted where needed?
- Confirm: Ask returns an answer; answer is grounded in an indexed policy; no hallucinated contacts or procedures

### Step 4 — Policy Library
- Staff browse the Policy Library
- Staff locate a relevant policy (e.g. Visitor Sign-In)
- Staff read the policy summary
- Confirm: policy is findable; summary is accurate; mobile layout is readable

### Step 5 — Scenario Guidance
- Staff open a scenario
- Staff work through the scenario steps
- Confirm: scenario reflects realistic care worker situations; guidance is sound; escalation is clear where needed

### Step 6 — Fictional service-user cards
- Staff view the fictional service-user cards
- Staff confirm the cards are clearly labelled as fictional
- Staff do not enter any real service-user information
- Confirm: cards are clearly fictional; no real names, care plan details or medication information are present

### Step 7 — Access Refusal scenario
- Staff work through an access refusal scenario (e.g. a fictional service user refusing entry)
- Staff review the guidance
- Confirm: guidance is person-centred and legally sound; escalation is prompted; staff do not feel the product is telling them what to decide

### Step 8 — Private Notes
- Staff open the Private Notes area
- Staff read the disclaimer that notes are not official records and are not stored or shared
- Staff optionally type a practice note
- Confirm: disclaimer is prominent; staff understand notes are not care records

### Step 9 — Escalation Contacts
- Staff view the Escalation Contacts section
- Staff confirm contacts are clearly labelled as illustrative/demonstration only
- Confirm: no real contact details are shown; staff understand this is not a live directory

### Step 10 — Privacy Model
- Staff read the Privacy Model page
- Staff understand what data WorkTwin does and does not hold
- Confirm: privacy model is legible on mobile; staff feel informed

### Step 11 — Feedback
- Staff complete the feedback form or structured log (see Section 7)
- Facilitator reviews responses before the session ends
- Go/fix/stop decision is recorded

---

## 7. Feedback and Evidence Capture

Every supervised practice session must produce a written evidence record. The facilitator is responsible for completing this log during or immediately after each session.

### Per-session log fields

| Field | What to record |
|---|---|
| Date | Date of the session |
| Staff member (role only — no name in log) | e.g. Care worker, Senior carer, Team leader |
| Device used | Mobile / desktop / tablet |
| Page tested | List each page visited |
| Question asked (Ask WorkTwin) | Exact question typed by the staff member |
| Answer useful? | Yes / Partly / No — with brief note |
| Did the answer feel safe? | Yes / Uncertain / No — with brief note |
| Any confusion about what WorkTwin is or does? | Yes / No — describe |
| Any mobile layout issue? | Yes / No — describe |
| Any risk concern raised by staff or facilitator? | Yes / No — describe |
| Suggested improvement | Free text |
| Go / fix / stop decision | Go = continue testing; Fix = pause and resolve issue before next session; Stop = halt testing immediately |

### Evidence log location

All session logs must be stored in `docs/` and named using the format `4s104b-session-log-YYYY-MM-DD.md`. They must not contain real service-user names, real contact details, or any confidential information.

---

## 8. Stop Conditions

The following conditions must halt trusted staff practice testing immediately. The facilitator must record the stop condition, the circumstances, and the go/fix/stop decision.

| # | Stop condition |
|---|---|
| 1 | A staff member enters or attempts to enter real confidential data (names, care plan details, medication, addresses, safeguarding information) |
| 2 | A staff member believes WorkTwin is live operational software used in real care delivery |
| 3 | A staff member believes WorkTwin replaces their manager, senior, 999, safeguarding lead, or medication lead |
| 4 | A staff member believes the demonstration contacts shown are live, reachable contacts |
| 5 | A staff member believes Private Notes are official care records that are stored and shared |
| 6 | Ask WorkTwin returns an unsafe answer, an answer that contradicts a clear escalation requirement, or an answer that hallucinates a procedure or contact |
| 7 | Policy coverage is too narrow to support a meaningful practice session — staff cannot find answers to any realistic questions |
| 8 | A staff member cannot complete the practice journey on mobile without significant difficulty |
| 9 | A staff member raises a safeguarding, welfare, or wellbeing concern during the session |
| 10 | The facilitator is not present for any part of the session |

---

## 9. Execution Roadmap

The following slices must be completed in order before 3–5 trusted staff can practise safely. Slices within a phase may proceed in parallel where dependencies allow.

### Phase 1 — Policy coverage (prerequisite for any meaningful practice session)

| Slice | Title | Purpose |
|---|---|---|
| 4S.102B | Policy coverage map finalisation | Confirm current indexed coverage; identify all gaps against the coverage table in Section 3 |
| 4S.102C | Prepare next policy batch | Draft, review and approve the 5–8 policies identified in Section 4; apply Thumhara Centre document approval process |
| 4S.102D | Upload and index next policies one by one | Upload each approved policy document individually; test Ask response after each upload; do not bulk upload |
| 4S.102E | Ask quality testing | Run structured Ask quality tests against new policies; record results in the controlled Ask quality scorecard; confirm lane assignments are correct |

### Phase 2 — Secure access (prerequisite for any trusted staff session)

| Slice | Title | Purpose |
|---|---|---|
| 4S.103A | Auth readiness audit | Audit all staff portal routes, API routes, session timeout and RLS against the auth readiness table in Section 5; produce written findings |
| 4S.103B | Invite-only login setup | Activate Supabase invite-only or magic link flow; test end-to-end login for a named test account; confirm unauthenticated users cannot access staff routes |

### Phase 3 — Staff practice (requires Phase 1 and Phase 2 complete)

| Slice | Title | Purpose |
|---|---|---|
| 4S.104A | Trusted staff practice route | Confirm the full staff practice journey in Section 6 works end-to-end in the protected environment; fix any blockers |
| 4S.104B | Feedback capture pack | Produce the session log template and facilitator briefing; confirm evidence capture process is in place |
| 4S.104C | Go / no-go review | Facilitator completes checklist against all readiness criteria in Section 2; makes go / no-go decision; records outcome |

---

## 10. Current Decision

The product is significantly closer to trusted staff practice, but is not yet ready. The next work must focus on three things in order: policy coverage (so Ask is useful), secure access (so the session is controlled), and structured evidence capture (so the session produces trustworthy findings).

General UI polish is not the priority. Any work that does not directly advance policy coverage, secure login, or feedback capture should be deferred until the go/no-go gate in 4S.104C has been passed.

---

*This document is a planning record only. It does not constitute approval to begin a live pilot, expose real service-user data, or allow unsupervised access. All go/no-go decisions must be made by the responsible person at Thumhara Centre in consultation with the WorkTwin team.*
