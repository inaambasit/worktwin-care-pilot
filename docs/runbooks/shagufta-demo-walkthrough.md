# Shagufta Demo Walkthrough

**Reference:** 4S.105J
**Date:** 2026-06-02
**Audience:** Shagufta Akhtar — Registered Manager, Thumhara Centre
**Prepared by:** Inaam Basit — WorkTwin operator
**Status:** WALKTHROUGH ONLY — this document does not approve staff access or real use of WorkTwin

---

## 1. Purpose

This walkthrough is for a short, informal conversation between Inaam and Shagufta to show what has been built so far and to explain what still needs to happen before any Thumhara staff member uses WorkTwin in even a limited way.

Nothing in this walkthrough is live, nothing changes system settings, and no Thumhara data is involved at any point.

---

## 2. What Shagufta Will See

### The Rehearsal Cockpit (`/rehearsal`)

This is an internal operator page — Shagufta would see it in a browser, but it is not visible to Thumhara staff and does not appear in the normal staff-facing system.

It shows:

- **A clear NO-GO status** — a prominent red banner confirming that the system is not yet ready for even a one-person test run, and explaining why.
- **Hard gates** — a checklist of the things that must be completed before a rehearsal can happen. One is still open: Thumhara Centre's written sign-off (which is what Shagufta is being asked to return). The technical credential rotation that Inaam needed to carry out has now been completed (4S.106E).
- **Approved safe questions** — the eight specific, pre-approved questions that would be used in the one-person rehearsal. These cover everyday topics like confidentiality principles and what to do if information is accidentally shared. Two of them (medication and safeguarding) are deliberately designed to be blocked by WorkTwin rather than answered.
- **Stop conditions** — a list of situations that would immediately halt the rehearsal if they arose (for example, if real service-user data were entered, or if WorkTwin gave advice it should not give).
- **Rehearsal artefacts** — links to the documents that govern the rehearsal process (the plan, the monitoring runbook, the session record, the readiness gate).

### The Feedback Capture Page (`/rehearsal/feedback`)

This is the page the operator (Inaam) would fill in during the rehearsal. It has:

- A session details section (date, who was present, environment).
- A section for recording observations for each of the eight approved questions — did it answer correctly, did it escalate, did it show the source?
- Stop condition checkboxes — if one fires, the page immediately shows a red alert.
- An outcome section — Pass / Pass with Actions / Stop / No-Go.
- A button to copy the whole summary as plain text (for pasting into a document or email). No data is saved anywhere and no network call is made.
- A clear form button.

---

## 3. What WorkTwin Is Not Doing Yet

It is important to be clear about what this system is **not** doing at this stage.

| What WorkTwin is not doing | Why this matters |
|----------------------------|-----------------|
| Not live | No Thumhara staff can access it. Staff visibility is switched off. |
| Not available to staff | The Ask WorkTwin feature is switched off. No staff member can ask it a question. |
| Not using real care data | The system uses only a controlled sandbox. No service-user, staff, or family information is in the system. |
| Not making policy decisions | WorkTwin signposts to approved policy. It does not decide anything or tell anyone what to do. |
| Not replacing the Registered Manager | All escalation routes lead to a human — the line manager or the Registered Manager. WorkTwin does not hold authority. |

---

## 4. What Is Already Complete

The following has been built and tested:

| Item | Status |
|------|--------|
| Staff login and membership verification (ES256 tokens) | Complete — tested end-to-end in sandbox |
| Auth security hardened (ES256-only, HS256 fallback removed) | Complete |
| Cache headers on staff routes (no browser caching of sensitive responses) | Complete |
| Monitoring and rollback runbook | Complete — docs/runbooks/trusted-staff-monitoring-and-rollback-runbook.md |
| One-user rehearsal plan | Complete — docs/runbooks/one-user-staff-rehearsal-plan.md |
| Session record / feedback capture | Complete — docs/runbooks/one-user-rehearsal-session-record.md |
| Rehearsal readiness gate / go-no-go checklist | Complete — docs/runbooks/one-user-rehearsal-readiness-gate.md |
| Rehearsal cockpit UI | Complete — visible at /rehearsal |
| Feedback capture UI | Complete — visible at /rehearsal/feedback |
| Operator dry run against the cockpit and feedback page | Complete — PASS |

---

## 5. What Is Still Required Before a One-User Rehearsal

One hard gate remains open (Section 5.1). The Supabase credential rotation (Section 5.2) has been completed. Neither the remaining gate nor the final go/no-go decision can be skipped.

### 5.1 — Thumhara Centre written sign-off (still required)

The confidentiality pack was sent to Shagufta on **31 May 2026**, return-by **14 June 2026**.

The pack asks Shagufta to review the draft Confidentiality and Information Handling policy, confirm that the description of how WorkTwin handles staff queries is accurate, and sign and return the document.

Until this is returned with a completed sign-off, no rehearsal can take place.

### 5.2 — Supabase credential rotation (completed)

This was a technical step that Inaam carried out — rotating the database access credentials before any real staff interaction with the live system. It was completed in 4S.106E (service-role key, JWT secret and anon key rotated), and a post-rotation membership check confirmed the system still behaves correctly. This gate is cleared.

### 5.3 — Final go/no-go decision

Once the written sign-off (Section 5.1) is returned, Inaam and Shagufta jointly complete the Rehearsal Readiness Gate document and record an explicit GO decision before the rehearsal is scheduled.

### 5.4 — No real data confirmation

The one-person tester must confirm in writing, before the session begins, that they will not enter any real service-user, staff, family, medication, safeguarding, incident, complaint, or HR information at any point.

---

## 6. Simple Demo Script

This is a suggested order for Inaam to show Shagufta the system. It takes approximately 10–15 minutes.

**Step 1 — Open the rehearsal cockpit**
Navigate to `/rehearsal`. Point out the red "NO-GO" banner at the top. Explain that this is intentional — the system is not ready and the page reflects that honestly.

**Step 2 — Show the hard gates**
Scroll to the hard gates section. Show the one "Blocking" item (written sign-off) and the five "Complete" items (including the Supabase credential rotation, cleared in 4S.106E). Explain that Shagufta returning the confidentiality pack clears the one remaining blocker.

**Step 3 — Show the approved safe questions**
Scroll to the approved questions list. Walk through Q1–Q6 briefly. Then show Q7 (medication) and Q8 (safeguarding) and explain that these are included specifically to confirm that WorkTwin refuses to answer them — they should be blocked and escalated, not answered.

**Step 4 — Show the stop conditions**
Scroll to the stop conditions section. Explain that if any of these things happen during the rehearsal, the session stops immediately and the rollback procedure is followed.

**Step 5 — Open the feedback capture page**
Click "Open feedback form" to navigate to `/rehearsal/feedback`. Show the session details section, the Q1–Q8 observation fields, and the stop condition checkboxes.

**Step 6 — Show the trip-wire**
On the "Real data entered" field for any question, click "Yes — STOP" and show Shagufta the immediate red alert that appears. Explain that this is a safety mechanism — if real data is accidentally entered, the system signals it immediately. Click it off to clear the alert.

**Step 7 — Show copy summary**
Click "Copy summary to clipboard" and paste the result into a plain text editor. Explain that this is the only way feedback leaves the system — a plain text paste, no database, no network call.

**Step 8 — Explain what happens next**
Summarise: the Supabase credential rotation is already done (4S.106E); once the signed pack is returned, Inaam and Shagufta jointly complete the readiness gate, then one trusted internal person (not a Thumhara staff member in the first instance) asks the eight approved questions and the results are recorded.

---

## 7. Questions to Ask Shagufta After the Demo

1. Does the description of how WorkTwin handles confidentiality queries match what you would expect from a staff support tool?
2. Are the eight approved questions the right ones, or would you like to change any before the rehearsal?
3. Are there any concerns about the stop conditions — are there situations you would want added?
4. Is 14 June a realistic return date for the signed confidentiality pack?
5. Is there anything about what you have seen today that you would like explained differently before the pack goes back?

---

## 8. Final Statement

> This walkthrough does not approve staff access to WorkTwin.
> It does not enable the Staff Ask feature.
> It does not constitute the written sign-off that is being requested from Thumhara Centre.
> It does not record a GO decision for the rehearsal.
>
> The system remains in a controlled, operator-only state. No Thumhara staff member has access to WorkTwin. No real care data is held in the system. The Supabase credential rotation (Section 5.2) is complete; the rehearsal cannot proceed until the remaining hard gate (Section 5.1, written sign-off) is satisfied and a joint GO decision is recorded.
