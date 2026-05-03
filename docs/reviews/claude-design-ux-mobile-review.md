# WorkTwin Care Pilot -- Claude Design / UX and Mobile Review

**Milestone:** 4S.77 - Claude Design / UX and mobile review
**Reviewer:** Claude Design
**Date:** 2026-05-03
**Checkpoint reviewed:** 7e36693 Add Codex strict technical review

---

## Overall Rating

**7.0 / 10**

---

## Overall Judgement

The demo is strong enough for a friendly care manager walkthrough, but not ready for an unsupervised frontline care worker pilot. The staff-facing experience has a calm care-sector tone, strong privacy framing, and a clear escalation-first product direction. The biggest UX risk is Ask WorkTwin: it needs clearer expectation-setting around whether answers are demo-only, governed, source-grounded, or unavailable.

---

## Top 5 Strengths

1. Calm, sector-appropriate visual language.
2. Consistent privacy-first framing across the demo.
3. Escalation is part of the product spine: support links, dashboard reminders, and scenario safety prompts.
4. Dashboard gives staff a clear starting point.
5. The doorstep/access-refusal scenario is a standout artefact and should be polished before adding more scenarios.

---

## Top 5 Weaknesses

1. Ask WorkTwin expectation-setting is not yet strong enough. It needs to show clearly what mode it is in and whether an answer is source-grounded.
2. Landing page mentions source-cited answers, but the staff UI does not yet make citations obvious enough.
3. Private Notes trust is fragile because session-only behaviour and privacy boundaries need to be clearer on the Notes page itself.
4. Book a Pilot is not empty, but it is only a mailto link, not a designed pilot enquiry flow.
5. Mobile navigation uses desktop sidebar and mobile drawer versions of SidebarContent behind responsive classes. This may be fine visually, but it should be checked for duplicate landmarks, focus behaviour and screen-reader clarity.

---

## Highest-Risk UX Issue

Ask WorkTwin may allow staff or demo viewers to believe they are receiving policy-grounded answers without enough visible proof of what source was used. In a care setting, that is a trust and safety risk.

---

## Quickest UX Improvement

Add one clear status line above the Ask composer that states what mode Ask WorkTwin is currently in. For example:

> "Demo mode: answers are limited and may fall back to safe guidance. For safeguarding, medication, HR, legal or wellbeing concerns, escalate to a human lead."

Also add one static worked example with a source/citation card.

---

## Must-Fix Before a Real Pilot

1. Ask WorkTwin must clearly explain whether it is source-grounded, fallback-only, or escalation-only.
2. Add visible example answer and citation card.
3. Full mobile pass at 375px and 414px, including Private Notes and the drawer.
4. Replace mailto Book a Pilot with a proper pilot enquiry flow or landing section.
5. Clarify Private Notes persistence and privacy boundary on the Notes page.
6. Add pilot-grade authentication.
7. Make Privacy and Escalation easy to reach from every core staff page.
8. Add a "what this is / what this is not" block above the fold on the landing page or demo entry.

---

## What Should Not Be Built Yet

1. More scenario types before the access-refusal scenario is polished.
2. Manager dashboards or analytics.
3. AI features inside Private Notes.
4. Brand expansion before trust, auth and safety basics are clearer.
5. Staff-facing RAG as the headline product experience before the UI can prove source-grounding clearly.

---

## Prioritised UX Next Steps

1. **Ask WorkTwin honesty pass:** status line, mode label, example answer, citation display, escalation wording.
2. **Private Notes mobile trust pass:** fix layout and explain session-only behaviour clearly.
3. **Mobile navigation/accessibility pass:** check duplicate nav landmarks, focus trap, drawer close behaviour and screen-reader clarity.
4. **Book a Pilot flow:** replace plain mailto with a more deliberate enquiry journey.
5. **Landing page clarity pass:** explain what is live, what is demo-only and what is not production-ready.
6. **Scenario polish:** finish the access-refusal scenario before adding new scenarios.
7. **Empty/loading/error states:** make them calm, plain-English and care-sector appropriate.

---

## Recommended Next Milestone

**4S.78 - Staff-facing AI honesty and mobile trust pass.**

---

## Note on Testing

No automated tests are needed for this review-only documentation milestone. Tests become relevant when the UX fixes are implemented, especially end-to-end tests for:

- No horizontal scroll at 375px
- Drawer behaviour
- Ask page mode wording
- Visible citation example
- Private Notes mobile layout
