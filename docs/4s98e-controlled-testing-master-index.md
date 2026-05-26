# 4S.98E — Controlled Testing Master Index

**Slice:** 4S.98E  
**Status:** Documentation only — no code, data or policy changes  
**Base checkpoint:** 54a8f14 — Add trusted tester onboarding message pack  
**Date:** 21 May 2026  
**UK English**

---

## 1. Purpose

This document is the master index for the controlled preview testing phase of WorkTwin Care Pilot at Thumhara Centre.

It explains what each testing document is for, when to use it, who owns it, and the correct sequence in which the documents should be applied.

It is a navigation aid. It does not replace the individual documents. Anyone involved in reviewing or preparing for testing should start here and then refer to the relevant document.

---

## 2. Current Status

WorkTwin Care Pilot is in **controlled preview only**.

| Item | Current position |
|---|---|
| Operational use | Not live. No real care delivery decisions should be based on this tool. |
| Testing stage | Shagufta controlled preview complete (4S.100A). Guidance-led scenarios (4S.100C), fictional service-user guidance cards (4S.100D), dashboard and onboarding journey alignment (4S.100E), mobile journey smoke coverage — Playwright smoke 24/24 (4S.100F), and controlled-preview evidence log (4S.100G) are all complete. Safety, trust, and UI polish sequence 4S.101A–4S.101K is complete. The next gate before any 3–5 trusted care worker testing begins is a second controlled Shagufta review using the updated script. |
| Confidential information | No real staff names, service-user names, care plans, medication details, safeguarding cases, HR records or incident reports should be entered at any point. |
| Policy library | Limited to five approved pilot documents (see Section 6). |
| Next gate | Second controlled Shagufta review using the updated script (4S.101K) before any wider tester access. |

Testing must not expand beyond a single controlled reviewer until the conditions in Section 5 are resolved.

---

## 3. Document Map

| Document | Purpose | Use when | Owner / reviewer | Status |
|---|---|---|---|---|
| **4S.98A** — Trusted Care Worker Testing Readiness Pack | Defines who may test, what safe test behaviour looks like, and what conditions should cause testing to pause. | Before any 3–5 trusted worker test is authorised. Also as a reference checklist during preparation. | Inaam (author) / Shagufta and line manager (reviewers) | Draft — not yet in use |
| **4S.98B** — Shagufta Review Script and Feedback Log | Guides Shagufta through a structured controlled mobile preview. Provides structured questions, a feedback log, and a Go / Fix / Stop decision form. | Step 1 of the testing sequence. Used by Shagufta during the controlled preview session. | Shagufta (reviewer) / Inaam (author) | Ready for use at Shagufta's controlled preview |
| **4S.98C** — Controlled Ask Quality Scorecard | Tests whether Ask WorkTwin gives clear, source-grounded, safe and escalated answers before any trusted worker is invited to use the system. | Before submitting to Shagufta for review, and again before any trusted worker testing is approved. | Inaam (tester) / Shagufta (approver) | Ready for internal use |
| **4S.98D** — Trusted Tester Onboarding Message Pack | Provides ready-to-send draft messages, ground rules and a feedback form for future trusted care worker testers. | Step 6 only — after Shagufta and manager approval for a 3–5 trusted worker test has been confirmed and recorded. | Inaam (author) / Shagufta and line manager (approvers) | Draft — not to be sent until approval confirmed |

---

## 4. Correct Testing Sequence

Follow these steps in order. Do not skip steps or run them out of sequence.

**Step 1 — Shagufta controlled mobile preview** *(Complete — 4S.100A)*  
Shagufta reviewed the live preview on her mobile device. She gave positive feedback on Ask WorkTwin and the policy experience. Feedback is recorded at `docs/4s100a-shagufta-feedback-service-user-guidance.md`.

**Step 2 — Record feedback using 4S.98B** *(Complete — 4S.100A)*  
Key feedback from Shagufta: WorkTwin's highest value is guidance on what to do next during a real shift situation, not retrospective recording. Product direction confirmed as guidance-led scenarios. See `docs/4s100a-shagufta-feedback-service-user-guidance.md`.

**Step 3 — Run Ask quality checks using 4S.98C**  
Using the scorecard in 4S.98C, test a set of representative questions against Ask WorkTwin. Confirm that all critical safety checks pass before proceeding.

**Step 4 — Fix any safety or usability issues**  
Address all issues raised in Step 2 and Step 3 before moving further. Do not proceed to trusted worker testing until all critical failures are resolved.

**Step 5 — Decide whether 3–5 trusted worker testing is appropriate**  
Shagufta and the relevant manager review the outcomes of Steps 2–4 and make a recorded Go / Fix / Stop decision. This decision must be documented before Step 6 is taken.

**Step 6 — Use 4S.98A and 4S.98D only if approved**  
If and only if the Step 5 decision is Go, use 4S.98A to confirm readiness and 4S.98D to onboard trusted testers. Do not use these documents to invite testers before approval.

---

## 5. Do Not Proceed Conditions

Testing must not expand to any additional users or move beyond the controlled preview if any of the following conditions apply:

- Shagufta has not completed her review and recorded a Go decision.
- There are unresolved unsafe or inaccurate answers from Ask WorkTwin that have not been fixed and re-tested.
- High-risk topics (safeguarding, medication, emergency, mental health, serious incidents) do not produce a clear escalation prompt in the AI response.
- Mobile reliability is poor — the app is slow, crashes, or behaves inconsistently on the test device.
- There is any risk that testers may enter real confidential data, personal information, or live case details.
- The governance and policy visibility position is unclear — testers must understand which documents the system can and cannot answer from.

If any of these conditions is present, return to Step 4 and resolve before proceeding.

---

## 6. Current Live Policy Boundary

Ask WorkTwin is grounded exclusively in the following five approved pilot documents:

1. Thumhara Centre Professional Boundaries Policy
2. Thumhara Centre Infection Prevention and Basic Hygiene Policy
3. Thumhara Centre Confidentiality and Information Handling Policy
4. Thumhara Centre Mobile Phone and Portable Device Use Policy
5. Visitor Sign-In and Identification Procedure

No additional documents should be made live until the policy go-live checklist has been passed and the addition has been reviewed and authorised. Any answer that draws on information outside these five documents must be treated as unsupported and flagged immediately.

---

## 7. Next Decision

Steps 1 and 2 (Shagufta's controlled preview and feedback) are complete. **Current position (4S.100G):** The full Shagufta evidence sequence is complete. Shagufta gave positive feedback on Ask WorkTwin and the Policy Library. No safety or governance stop conditions were raised. Guidance-led scenarios (4S.100C), fictional service-user guidance cards (4S.100D), dashboard and onboarding journey alignment (4S.100E), mobile journey smoke coverage — Playwright smoke 24/24 (4S.100F), and controlled-preview evidence log (4S.100G) are all committed. Checkpoint: `c278725`.

The **immediate next action** is a second controlled Shagufta review using the updated script (4S.101K). After the review: if positive, create 4S.101M Shagufta second-review evidence log; if issues found, create a targeted 4S.101M fix slice. Steps 3–6 remain pending until the second review decision is recorded. Do not move to 3–5 trusted workers until that decision is documented.

The three possible outcomes from the original review remain relevant for future stages:

| Outcome | Action |
|---|---|
| **Fix first** | Shagufta identifies issues. Inaam resolves them. Re-test using 4S.98C. Return to Step 1 or Step 3 as appropriate. |
| **Approve limited trusted worker test** | Shagufta and manager confirm Go. Proceed to Step 6. Use 4S.98A and 4S.98D as directed. |
| **Stop and rework safety or governance** | Significant safety, escalation, or governance concerns identified. Testing pauses. Scope, policy, or AI behaviour is reworked before any further testing is considered. |

No decision beyond this point should be taken without a recorded review outcome from Shagufta and, where required, the relevant manager.

---

*This is an internal working document for the WorkTwin Care Pilot controlled preview phase. It contains no real staff data, service-user data, case information, or confidential records. It does not constitute operational guidance and must not be treated as such.*
