# 4S.66 - Staff Demo Final Walkthrough Notes

**Date:** 2 May 2026  
**Milestone:** 4S.66  
**Status:** Pilot prototype -- not production-ready  
**Pilot client:** Thumhara Centre (sample/fictional data throughout)

---

## 1. Purpose of the demo

This demo shows a working pilot of the WorkTwin staff-facing interface for a domiciliary and residential care setting. It proves that:

- Staff can navigate a clean, credible front-end from a browser.
- Core features are functional: policy lookup, guided onboarding, practice scenarios, private notes and escalation contacts.
- The admin console is appropriately locked down and not publicly accessible.
- High-risk topics route staff to a human, not to autonomous AI advice.

This is a prototype built for pilot discovery, stakeholder review and future client validation. It is not approved for live use with real staff or real service users.

---

## 2. What staff can currently see

| Feature | Available to staff |
|---|---|
| Landing page | Yes |
| Staff dashboard | Yes |
| Ask WorkTwin (AI assistant) | Yes - controlled, limited RAG |
| Policy library | Yes - sample policies |
| Onboarding hub | Yes - sample content |
| Practice scenarios | Yes - fictional scenarios |
| Private notes | Yes - local to session |
| Escalation contacts | Yes - sample contacts |
| Admin dashboard | No - disabled publicly |
| Admin API | No - proxy returns 403 |
| High-risk autonomous advice | No - escalates to human |

Staff-facing RAG has not been expanded as part of this milestone. The knowledge base contains only the controlled sample documents already in place.

---

## 3. The staff journey

### Landing page
Staff arrive at the root URL and see the WorkTwin Care landing page. It introduces the product clearly, with a call to action to enter the staff area. No login is required for this demo; access is open for demonstration purposes only.

### Dashboard
After entering, staff land on a personal dashboard. It shows their name, a welcome message, and quick links to all main features. The layout is calm and uncluttered, appropriate for care staff who may be accessing this between shifts.

### Ask WorkTwin
Staff can type a free-text question into the AI assistant. The assistant answers from the approved sample policy set, cites its source, and recommends escalation where the topic is sensitive or outside its scope. It does not give final employment, legal, medical or disciplinary advice. Safeguarding, medication concerns and anything ambiguous are flagged for human review.

### Policy library
Staff can browse and search sample care policies. Policies are displayed in plain English with section headings. This is read-only. No policies have been approved for real-world use at this stage.

### Onboarding hub
New staff or those in their first weeks can follow a structured onboarding path. This includes key policies to read, short tasks to acknowledge, and links to relevant practice scenarios. Content is sample/fictional.

### Practice scenarios
Staff can select from a set of scenario-based exercises (e.g. medication refusal, safeguarding concern, incident report). Each scenario asks how they would respond, then provides structured feedback. No results are stored or shared with the employer. This feature is for self-directed learning only.

### Private notes
Staff can write personal notes - reflections, reminders, questions to raise with a manager. These are private to the individual session. They are not visible to the employer, the admin panel or the AI assistant. They exist solely to support the staff member.

### Escalation contacts
Staff can view a list of escalation contacts relevant to their role - safeguarding lead, HR, on-call manager, and so on. Contacts are sample/fictional in this demo. The sidebar highlights the active contact clearly.

---

## 4. Safety and governance

| Point | Status |
|---|---|
| Admin demo screens | Disabled publicly - not reachable without direct internal access |
| Public admin API proxy | Blocked - returns 403 for all unauthenticated requests |
| High-risk topics | Routed to human escalation - no autonomous AI advice |
| Sample/fictional data | Used throughout - no real staff, service users or policies |
| Staff-facing RAG | Controlled and not expanded in this milestone |
| Individual staff data | Not shared with employer in any form |
| Surveillance behaviours | Not built - see privacy principles |

---

## 5. Proof completed

The following checks were completed at the c58a16f checkpoint:

- Local build passed (Next.js, no errors or warnings)
- Playwright smoke tests passed: **10/10**
- Live staff pages returned **HTTP 200** for all core routes
- Live admin demo confirmed **disabled** (page not reachable publicly)
- Live admin API proxy confirmed returning **HTTP 403** for unauthenticated requests

---

## 6. Suggested demo talk track

Use natural language. Do not read from slides.

> "This is WorkTwin - it's designed to sit alongside a care worker during their working day, not replace their manager or their judgement.
>
> From the dashboard they can look up a policy quickly, practise a tricky scenario in private, or find out who to escalate to if something comes up they're not sure about.
>
> The AI only answers from documents the employer has approved. If something touches safeguarding or anything sensitive, it tells the worker to speak to a person - it doesn't try to handle it.
>
> Private notes are visible only to the worker - we don't track what they write, and the employer never sees it.
>
> The admin side is completely separate. I'll show you that briefly but it's behind a separate access layer and not part of what staff see at all.
>
> This is a working pilot. The policies shown are sample content. Before going live with a real team we'd work with you to load your own approved documents and go through the governance steps."

---

## 7. Known limitations and next steps

- **Still a pilot.** The product is not approved for live use with real staff or service users.
- **Policies not approved.** Before real use, policies must be reviewed, approved and uploaded by the employer under a proper governance process.
- **No high-risk autonomous advice.** The system intentionally does not give autonomous advice on safeguarding, legal or disciplinary matters. This is by design and will not change.
- **RAG not expanded.** The knowledge base is limited to the controlled sample set. Expanding it requires explicit governance sign-off.
- **Auth not implemented.** The demo is open-access. Real deployment would require staff authentication.
- **Future work may include:**
  - More granular staff role journeys (senior carer, team leader, coordinator)
  - Bilingual support (e.g. English/Urdu for community care settings)
  - Employer-managed approved document workflows
  - Structured onboarding completion tracking (privacy-safe, aggregate only)
