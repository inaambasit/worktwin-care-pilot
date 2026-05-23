# 4S.100G — Shagufta Controlled-Preview Evidence Log

## 1. Purpose

This document records what Shagufta reviewed during her controlled preview of the WorkTwin Care Pilot, the feedback she gave, the product direction changes that followed, and the build work completed safely as a result. It exists so that anyone joining the project later can trace why the product looks and behaves as it does after this review cycle.

---

## 2. Review Context

- Shagufta reviewed the controlled preview after the Ask WorkTwin feature and mobile trust-polish work had been completed.
- This was a **controlled preview only** — not live operational use and not a pilot deployment in a real care setting.
- No real confidential data of any kind was used during the review.
- All scenarios, personas, guidance cards and interactions presented were entirely fictional and demo-only.

---

## 3. What Shagufta Liked

- **Ask WorkTwin** was positively received. The conversational, question-led interface felt accessible for front-line staff.
- The **Policy Library and approved-policy experience** were positively received. Being able to locate and browse approved policies in one place felt useful.
- Shagufta could see clearly how staff could use WorkTwin to **access safe policy guidance** during a shift without needing to find and read long documents.
- **Source-grounded answers** — responses that cite the specific policy they are drawn from — and the **safe escalation pathways** (always directing staff to a senior or registered manager for anything outside policy) made the product feel genuinely useful rather than a generic chatbot.

---

## 4. Feedback Shagufta Gave

The following captures the substance of Shagufta's feedback, expressed fictionally and without any real identifiable information.

- **Staff need realistic scenario guidance, not just generic practice.** Abstract or policy-only responses do not reflect what a carer actually faces mid-shift.
- A **morning call scenario** was suggested as highly relevant: a service user refuses to get out of bed, refuses food, has not eaten before a medication routine, and may later refuse toilet support or eating. Staff need guidance on how to respond sensitively to each of these refusals in sequence.
- A **garden scenario** was suggested: an older person refuses to come inside. Staff need guidance on how to approach this safely, balancing the person's right to choose with appropriate welfare checks.
- **Staff already record in their existing care system.** WorkTwin should guide what to do next in a situation rather than present duplicate recording forms or try to replace the care record.
- **Future service-user support** — such as surfacing known routines, recommended reassurance approaches, and an appropriate contact route for the person's family or key worker — was acknowledged as potentially valuable, but only within a secure, approved pilot with proper data governance in place.

---

## 5. Product Direction Confirmed

Following Shagufta's feedback, the product direction was confirmed and reoriented. WorkTwin should move away from:

> **"Policy search and recording-led scenarios"**

towards:

> **"Policy-grounded Ask plus guidance-led shift support for realistic care situations"**

This means the primary value for front-line staff is receiving clear, policy-backed guidance on what to do next in real care situations — not producing records, and not generating generic responses.

---

## 6. Changes Made After Feedback

The following slices were completed after Shagufta's review, in sequence:

| Slice | Description |
|-------|-------------|
| 4S.100A | Captured Shagufta service-user guidance feedback |
| 4S.100B | Redesigned scenarios as guidance-led support |
| 4S.100C | Added two fictional Shagufta-inspired scenarios |
| 4S.100D | Added fictional service-user guidance cards |
| 4S.100E | Aligned dashboard and onboarding staff journey |
| 4S.100F | Added mobile journey smoke coverage |

---

## 7. Evidence / Proof

| Item | Detail |
|------|--------|
| Latest checkpoint before this docs slice | `b5a3390` — Add mobile journey smoke coverage |
| Build status | Passed |
| Playwright smoke tests | Passed 24/24 |
| Mobile journey smoke coverage | Dashboard, onboarding, scenario guidance, and access-refusal safety are all covered |

---

## 8. Safety Boundaries

The following safety boundaries apply to everything built and reviewed in this cycle, and remain in force going forward:

- All data used in the preview is **fictional and demo-only**.
- **No real service-user data** of any kind has been used.
- **No real family contact details** have been stored, displayed, or processed.
- **No real medication details** have been stored, displayed, or processed.
- **No real care-plan details** have been stored, displayed, or processed.
- **No safeguarding, HR, complaints, incident or other confidential data** has been used.
- Staff continue to use their **existing care-recording systems** for all formal records. WorkTwin does not replace or duplicate those records.
- WorkTwin does **not replace** the role of the senior carer, registered manager, medication lead, safeguarding lead, or emergency services. Every scenario explicitly escalates to a human decision-maker.
- The product is **not production-ready**.
- The product is **not suitable for unsupervised use by real staff** at this stage.

---

## 9. Current Decision

The product is in a meaningfully stronger position as a result of Shagufta's feedback. The guidance-led approach, realistic scenario coverage, and mobile polish make it more aligned with real care-setting needs than it was before.

However, it remains suitable only for **continued controlled internal preview and testing**. It is not yet ready for real operational use or for wider trusted-worker testing without the next set of safety reviews, auth hardening, and governance gates being completed first.

---

## 10. Recommended Next Steps

| Slice | Description |
|-------|-------------|
| 4S.100H | Current-state / README alignment after Shagufta evidence log |
| 4S.101A | Claude Design review of Dashboard and Onboarding |
| 4S.101B | Codex frontend safety / stale wording review |
| 4S.101C | Fix any dashboard, onboarding, or scenario issues found |
| Later | Auth, security, and governance readiness before any real staff or service-user data is introduced |
