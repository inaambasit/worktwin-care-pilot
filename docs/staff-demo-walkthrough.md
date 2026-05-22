# Staff Demo Walkthrough

**Updated:** 22 May 2026
**Milestone:** 4S.100B
**Status:** Controlled pilot prototype — not production-ready; not approved for unsupervised real staff use  
**Pilot client:** Thumhara Centre

---

## 1. Purpose of the demo

This demo shows a working pilot of the WorkTwin staff-facing interface for a domiciliary and residential care setting. It proves that:

- Staff can navigate a clean, credible front-end from a browser.
- Core features are functional: policy lookup, guided onboarding, practice scenarios, private notes and escalation contacts.
- Admin UI visibility is controlled by `NEXT_PUBLIC_ADMIN_DEMO_ENABLED`; admin API/proxy actions remain disabled/fail-closed publicly unless `ADMIN_PROXY_ENABLED` is deliberately enabled, which must not happen before real auth/session/CSRF/RBAC are in place.
- High-risk topics route staff to a human, not to autonomous AI advice.

This is a prototype built for pilot discovery, stakeholder review and future client validation. It is not approved for live use with real staff or real service users.

---

## 2. What staff can currently see

| Feature | Available to staff |
|---|---|
| Landing page | Yes |
| Staff dashboard | Yes |
| Ask WorkTwin (AI assistant) | Yes — governed RAG pipeline; source-grounded where document gate state permits |
| Policy library | Yes -- Visitor Sign-In (Lane A, staff-visible) only; AC32, CC34, QQ03 are BLOCKED (2026-05-07) -- QCS content restriction; must not be used in demo |
| Onboarding hub | Yes — sample content |
| Guidance-led scenarios | Yes — fictional guidance-led scenarios; staff think through what to do next, when to escalate, and what not to do |
| Private notes | Yes — session-only; not a persistent production implementation |
| Escalation contacts | Yes — sample contacts |
| Admin dashboard | Visibility controlled by NEXT_PUBLIC_ADMIN_DEMO_ENABLED; may be visible in deployed demo; not for real end-user access |
| Admin API / proxy | Disabled/fail-closed publicly (ADMIN_PROXY_ENABLED not set); must not be enabled before real auth/session/CSRF/RBAC |
| High-risk autonomous advice | No — escalates to human |

**Current document state:**

- **Visitor Sign-In and Identification Procedure** — Lane A; the first clean proof. Approved for staff-visible source-grounded answers.
- **AC32 (Mobile Phone and Portable Device Use Policy)**, **CC34 (Infection Control)**, and **QQ03 (Complaints)** -- BLOCKED (2026-05-07) -- QCS content restriction applies; must not be used in demo, pilot, staff-style Ask, answer-debug expansion, embedding expansion, staff visibility, or production until written permission confirms this specific AI/RAG use case is allowed. Their DB flags and embeddings are historical/current registry state only and do not represent approved continuing use. Do not use in demo material.
- **CR100 (Safeguarding)** and **PM11 (Whistleblowing)** — human-only escalation; never AI-answerable.
- **PPE Policy** — pending; PDF not yet received.
- **CR07 (Data Protection)** — parked; PDF export and data-protection escalation strategy required before upload.

---

## 3. The staff journey

### Landing page
Staff arrive at the root URL and see the WorkTwin Care landing page. It introduces the product clearly, with a call to action to enter the staff area. No login is required for this demo; access is open for demonstration purposes only. Auth scaffolding exists but is not activated publicly — the E2E proof (4S.88G) is blocked.

### Dashboard
After entering, staff land on a personal dashboard. It shows their name, a welcome message, and quick links to all main features. The dashboard guides the Visitor SOP demo path -- a clear prompt directs staff toward policy lookup and the access-refusal scenario. The layout is calm and uncluttered, appropriate for care staff who may be accessing this between shifts.

### Ask WorkTwin
Staff can type a free-text question into the AI assistant. The Ask demo path focuses on Visitor SOP questions -- for example, visitor sign-in procedures, identification requirements, and visitor access controls. The assistant answers from approved governing documents where the source and gate state permit, cites its source, and recommends escalation where the topic is sensitive or outside its scope. It does not give final employment, legal, medical or disciplinary advice. Safeguarding, medication concerns and anything ambiguous are flagged for human review. AI answers are only returned from documents that have passed all governance gates.

### Policy library
Staff can browse and search approved policy documents. Visitor Sign-In and Identification Procedure is currently approved and staff-visible. AC32, CC34, and QQ03 are QCS-derived documents -- BLOCKED (2026-05-07); must not be used in demo. Documents in admin-debug or human-only lanes are not visible here. This is read-only. No policies have been approved for unsupervised real-world use at this stage.

### Onboarding hub
New staff or those in their first weeks can follow a structured onboarding path. This includes key policies to read, short tasks to acknowledge, and links to relevant practice scenarios. Content is sample/fictional.

### Guidance-led scenarios
Scenarios are fictional examples of situations care workers face during a shift. Each scenario presents a realistic situation, offers guidance on what to do next, indicates when to escalate, and states clearly what WorkTwin does not replace. Scenarios are not recording forms, competency sign-offs, training assessments or replacements for existing care-recording systems. No results are stored or shared with the employer. Staff must continue using their existing care-recording systems alongside WorkTwin.

### Private notes
Staff can write personal notes — reflections, reminders, questions to raise with a manager. These are private to the individual session. They are not visible to the employer, the admin panel or the AI assistant. They exist solely to support the staff member. Private notes are session-only and are not a real production privacy implementation; a persistent notes feature would require authentication and a purpose-built privacy-safe storage design.

### Escalation contacts
Staff can view a list of escalation contacts relevant to their role — safeguarding lead, HR, on-call manager, and so on. Contacts are sample/fictional in this demo. The sidebar highlights the active contact clearly.

---

## 4. Safety and governance

| Point | Status |
|---|---|
| Admin demo screens | Visibility controlled by NEXT_PUBLIC_ADMIN_DEMO_ENABLED; may be visible in deployed demo; not for real end-user access |
| Admin API / proxy | Disabled/fail-closed publicly (ADMIN_PROXY_ENABLED not set); must not be enabled before real auth, session, CSRF, and RBAC are in place |
| High-risk topics | Routed to human escalation — no autonomous AI advice |
| Personal data | No real staff, service-user, resident, care-plan, HR, safeguarding case-note or named complaint personal data has been introduced; some controlled internal policy testing has used Thumhara Centre/QCS policy documents under governance restrictions |
| Staff-facing RAG | Governed pipeline; Visitor Sign-In is staff-visible (Lane A); AC32, CC34, and QQ03 are BLOCKED (2026-05-07) -- QCS content restriction; must not be used in demo; CR100 and PM11 are human-only escalation |
| Individual staff data | Not shared with employer in any form |
| Surveillance behaviours | Not built — see privacy principles |
| Auth | Not activated publicly; auth scaffolding (JWT ES256/JWKS, Bearer forwarding, Supabase SSR) is wired but E2E proof (4S.88G) is blocked |

---

## 5. Demo posture

Current posture at checkpoint `f9f8054`:

- Local build passes (Next.js, no errors or warnings)
- Playwright smoke tests: 20/20 passed — all major staff routes
- Admin API proxy: disabled (ADMIN_PROXY_ENABLED not set); /api/admin/documents returns 403 — `{"detail":"Admin proxy is disabled for this deployment."}`
- Auth: local proof complete (4S.98A, 4S.98B); `PILOT_AUTH_MODE=true` proven locally with real Supabase Bearer token; public/live rollout remains disabled
- Shagufta completed controlled preview (4S.100A); gave positive feedback on Ask WorkTwin and the policy experience

**Demo posture summary:**
- Credible for a controlled stakeholder demo using the four approved Thumhara policies (TC-POL-001 to TC-POL-004). AC32, CC34, and QQ03 are BLOCKED (2026-05-07) and must not appear in any demo, demo question, or demo material.
- Shagufta reviewed the controlled preview on her mobile device and gave positive feedback on Ask WorkTwin and the policy experience (4S.100A).
- Scenarios are now guidance-led, not recording-led. Each scenario helps staff think through what to do next, when to escalate, and what not to do. They are not recording forms, training assessments or care-recording system replacements.
- Not production-ready.
- Not approved for unsupervised real staff use.
- Do not demonstrate admin upload/proxy as production-ready — the proxy is disabled publicly; real session guard (4S.90N-C), real CSRF / same-origin guard (4S.90N-E), and admin response minimisation (4S.90N-F) are implemented; production rollout controls, DPA/content permissions, pilot governance, and final controlled pilot sign-off remain outstanding.

---

## 6. Suggested demo talk track

Use natural language. Do not read from slides.

> "This is WorkTwin — it's designed to sit alongside a care worker during their working day, not replace their manager or their judgement.
>
> Staff can see the whole product journey here — from the landing page through the dashboard, policy lookup, onboarding, practice scenarios, private notes, and escalation contacts.
>
> The AI only answers from documents the employer has approved and that have passed our governance gates. Where a document has been approved, answers are source-grounded and the source is always cited. If something touches safeguarding, medication, HR or anything sensitive, the system tells the worker to speak to a person — it doesn't try to handle it.
>
> Private notes are visible only to the worker — we don't track what they write, and the employer never sees it. Right now notes are session-only; before going live, persistent private notes would need proper authentication and privacy-safe storage.
>
> The admin side is completely separate. Admin screens may be visible in this demo environment depending on the configuration, but the admin API and proxy are locked down and not part of what staff see at all. Do not treat admin upload or proxy as production-ready.
>
> This is a working controlled prototype. Before going live with a real team we would need: staff authentication -- which is scaffolded but not yet activated -- DPA and legal review, written permission from QCS confirming the licence permits AI/RAG use for each document, governance sign-off, and full safety tests. We'd also work with you to load your own approved documents under a proper governance process."

---

## 7. Known limitations and next steps

- **Still a controlled prototype.** The product is not approved for live use with real staff or service users.
- **Policies not approved for production.** Before real use, policies must be reviewed, approved and uploaded by the employer under a proper governance process. Visitor Sign-In is the first clean Lane A proof and the only document safe for demo. AC32, CC34, and QQ03 are QCS-derived and BLOCKED (2026-05-07). Other documents are human-only or pending.
- **No high-risk autonomous advice.** The system intentionally does not give autonomous advice on safeguarding, legal or disciplinary matters. This is by design and will not change.
- **Auth proven locally but not activated for live/staff rollout.** Real Supabase Bearer token auth (4S.98A) and browser session proof (4S.98B) are complete locally. Public/live staff auth rollout remains disabled. `PILOT_AUTH_MODE=true` has been proven locally; public/live rollout requires a dedicated rollout decision, named-user plan, pilot-pack acceptance, governance approval, and deployment proof.
- **Admin proxy disabled publicly.** The admin proxy is disabled publicly (`ADMIN_PROXY_ENABLED` not set). Real session guard (4S.90N-C) is implemented. Real CSRF / same-origin guard (4S.90N-E) is implemented. Admin response minimisation (4S.90N-F) is implemented. Production rollout controls, DPA/content permissions, pilot governance, and final controlled pilot sign-off remain outstanding. Do not represent admin upload/proxy as production-ready.
- **QCS content blocked.** AC32, CC34, and QQ03 are QCS-derived content. BLOCKED (2026-05-07) -- QCS content restriction applies; must not be used in demo, pilot, staff-style Ask, answer-debug expansion, embedding expansion, staff visibility, or production until written permission confirms this specific AI/RAG use case is allowed. Their DB flags and embeddings are historical/current registry state only and do not represent approved continuing use. See docs/current-state.md Section 12.
- **No DPA.** A data processing agreement with Thumhara Centre is required before any real personal data is introduced.
- **Future work may include:**
  - More granular staff role journeys (senior carer, team leader, coordinator)
  - Bilingual support (e.g. English/Urdu for community care settings)
  - Employer-managed approved document workflows
  - Structured onboarding completion tracking (privacy-safe, aggregate only)
