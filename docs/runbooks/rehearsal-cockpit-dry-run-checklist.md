# Rehearsal Cockpit — Operator Dry-Run Checklist

**Reference:** 4S.105G
**Date:** 2026-06-01
**Status:** CHECKLIST ONLY — this document does not approve the staff rehearsal or change any system state

---

## 1. Purpose

This checklist covers an **operator-only dry run** of the rehearsal cockpit and feedback capture UI.

A dry run is the operator verifying, in a browser, that the `/rehearsal` and `/rehearsal/feedback` pages load correctly, display the right content and safety messaging, and that the feedback form functions as expected — before the controlled one-user staff rehearsal takes place with a real tester.

**This is not the staff rehearsal.** No staff tester is involved. No real care data is used. No system flags are changed. No Supabase writes are made. The dry run confirms UI correctness only.

> Completing this dry run does not approve the staff rehearsal. It records that the operator has verified the rehearsal tooling is working. The staff rehearsal remains subject to all hard gates in the One-User Rehearsal Readiness Gate (docs/runbooks/one-user-rehearsal-readiness-gate.md).

---

## 2. What Can Be Tested in This Dry Run

The following can be checked without any flag changes, Supabase access, real data, or staff involvement:

| # | Item |
|---|------|
| 2.1 | `/rehearsal` (cockpit) page loads in a browser. |
| 2.2 | `/rehearsal/feedback` (feedback capture) page loads in a browser. |
| 2.3 | NO-GO status banner is visible and correctly worded on the cockpit. |
| 2.4 | Hard gates section shows 2 pending (Thumhara sign-off, Supabase rotation) and 4 complete. |
| 2.5 | Approved safe test questions Q1–Q8 are visible and correctly listed. |
| 2.6 | Stop conditions are visible and correctly listed. |
| 2.7 | Rehearsal artefacts section lists all four runbooks. |
| 2.8 | "Open feedback form" button on the cockpit navigates to `/rehearsal/feedback`. |
| 2.9 | Feedback form fields accept input (session details, question toggles, notes). |
| 2.10 | Real-data trip-wire (Q real-data field = "Yes — STOP") triggers the live red alert banner. |
| 2.11 | Stop condition checkboxes trigger the live red alert banner when ticked. |
| 2.12 | "Copy summary to clipboard" copies a plain-text summary with no network call. |
| 2.13 | "Clear form" resets all fields to their initial state. |
| 2.14 | Back-to-cockpit navigation works from the feedback page. |
| 2.15 | No network errors or console errors appear during the above. |

---

## 3. What Must Not Be Tested in This Dry Run

The following are **absolutely prohibited** in a dry run. Any of these would constitute a Stop Condition for the dry run itself.

| # | Prohibited action |
|---|------------------|
| 3.1 | Real staff login or real staff JWT token. |
| 3.2 | Any real service-user, staff, family, medication, safeguarding, incident, complaint, or HR data entered in any field. |
| 3.3 | Enabling staff visibility. |
| 3.4 | Enabling Staff Ask. |
| 3.5 | Promoting any document to `real_document = true`. |
| 3.6 | Making any Supabase write (direct or via API). |
| 3.7 | Changing any environment variable. |
| 3.8 | Using the live Ask WorkTwin (`/ask`) staff endpoint. |
| 3.9 | Using the live Policies (`/policies`) staff endpoint. |
| 3.10 | Treating the dry run as evidence that the staff rehearsal is ready to proceed. |

---

## 4. Pre-Dry-Run Checks

Complete these before opening a browser.

| # | Check | Result |
|---|-------|--------|
| 4.1 | `git status --short` — working tree is clean on `main`. | |
| 4.2 | `git --no-pager log -1 --oneline` — confirms checkpoint `467e9a1`. | |
| 4.3 | Staff visibility is OFF — confirmed by operator. | |
| 4.4 | Staff Ask is OFF — confirmed by operator. | |
| 4.5 | No Supabase change is planned during this dry run. | |
| 4.6 | No env change is planned during this dry run. | |
| 4.7 | Browser devtools console is open to catch any JS errors. | |

---

## 5. Browser Walkthrough Steps

Perform these steps in order. Record the result of each in Section 11.

### 5.1 — Open the rehearsal cockpit

1. Open a browser and navigate to the WorkTwin frontend (local dev server or Vercel preview).
2. If using `NEXT_PUBLIC_ADMIN_DEMO_ENABLED=true`, use the Admin ↗ switcher to enter the admin portal.
3. Navigate to `/rehearsal` (directly or via the "Rehearsal Cockpit" link in the admin sidebar).
4. Confirm the page loads without errors.

### 5.2 — Cockpit visual checks

5. Confirm the hero banner shows "Rehearsal Cockpit" with "Internal operator view — not staff-facing".
6. Confirm the status chips: Not live / Internal operator view / Staff visibility OFF / Staff Ask OFF / No real care data / Sandbox / demo-org only.
7. Confirm the "Overall status: NO-GO" red banner is present below the hero.
8. Confirm the hard gates card shows:
   - **Blocking** — "Thumhara Centre written sign-off returned and reviewed"
   - **Blocking** — "Supabase credential rotation complete"
   - **Complete** — "Monitoring and rollback runbook read and accepted"
   - **Complete** — "One-user rehearsal plan read and accepted"
   - **Complete** — "Session record / feedback capture document ready"
   - **Complete** — "Rehearsal readiness gate / go-no-go checklist completed"
   - Counter shows 4/6 complete.
9. Confirm the approved questions card shows Q1–Q8 with Q7 and Q8 highlighted in amber (sensitive).
10. Confirm the prohibited questions footer is present (red, "No question involving real service-user names...").
11. Confirm the stop conditions card lists all 7 conditions.
12. Confirm the stop conditions footer is present ("On any stop condition: switch staff visibility OFF...").
13. Confirm the rehearsal artefacts card lists all four runbooks with "Merged" badges.
14. Confirm the "Operator feedback capture" teal card is present with an "Open feedback form" button.
15. Confirm the final "Overall status: NO-GO" block at the bottom lists the two remaining blockers.

### 5.3 — Navigate to the feedback page

16. Click "Open feedback form" on the cockpit.
17. Confirm the URL changes to `/rehearsal/feedback`.
18. Confirm the page loads without errors.

### 5.4 — Feedback page visual checks

19. Confirm the hero banner shows "Rehearsal Feedback Capture" with "Operator-only — not staff-facing".
20. Confirm the status chips: Not live / Operator only / No network calls / No database save / No real care data.
21. Confirm the "Back to cockpit" link is visible in the hero.
22. Confirm the red data-entry warning banner is present ("Do not enter real care or personal data").
23. Confirm Section 1 — Session details fields are present (date, operator, tester, environment, checkpoint, hard gates confirmed).
24. Confirm environment pre-fills as "Sandbox / demo-org" and checkpoint pre-fills as "9eefa43".
25. Confirm Section 2 — Question feedback shows Q1–Q8, each with Q-ref badge, prompt, expected behaviour, and six fields.
26. Confirm Q7 and Q8 cards have amber background (sensitive questions).
27. Confirm Section 3 — Stop conditions shows 8 checkboxes.
28. Confirm Section 4 — Outcome shows PASS / PASS WITH ACTIONS / STOP / NO-GO toggle group.
29. Confirm Section 5 — Operator controls shows "Copy summary to clipboard" and "Clear form" buttons.
30. Confirm Section 6 — Artefact references lists all four runbooks.
31. Confirm the governance reminder amber banner is present at the bottom.
32. Confirm the "Back to Rehearsal Cockpit" link in Section 6 footer is present.

### 5.5 — Safety copy checks

33. Confirm "Do not enter real care or personal data" appears in the red warning banner.
34. Confirm each Q notes field has the placeholder "do not enter real care or personal data".
35. Confirm "Yes — STOP" label on the real-data-entered toggle.
36. Confirm the stop conditions footer reads "switch staff visibility OFF, switch Staff Ask OFF, halt the session immediately".
37. Confirm the governance notice reads "Thumhara Centre written sign-off and Supabase credential rotation remain required".

---

## 6. Feedback Form Behaviour Checks

Perform these in order. Use only invented, non-real placeholder values (e.g. "2026-06-99", "OP", "TS").

| # | Action | Expected behaviour | Pass / Fail |
|---|--------|--------------------|-------------|
| 6.1 | Type a date in the Session date field. | Field accepts text; value visible. | |
| 6.2 | Type initials in Operator and Tester fields. | Fields accept text. | |
| 6.3 | Click Yes on "Hard gates confirmed before session". | Button highlights teal; clicking again deselects. | |
| 6.4 | On Q1, click "Yes" for "Answered as expected". | Teal highlight; deselects on re-click. | |
| 6.5 | On Q1, click "No" for "Required escalation". | Red highlight. | |
| 6.6 | On Q1, click "N/A" for "Source shown". | Slate highlight. | |
| 6.7 | On Q1, type a note in the notes field. | Field accepts text; placeholder clears. | |
| 6.8 | On Q7 (amber), click "Yes" for "Answered as expected". | Teal highlight (Q7 is a blocking question — BLOCKED is expected; "No" reflects correct behaviour). | |

---

## 7. Real-Data Trip-Wire Check

| # | Action | Expected behaviour | Pass / Fail |
|---|--------|--------------------|-------------|
| 7.1 | On any question, click "Yes — STOP" for "Real data entered". | Live red alert banner appears immediately at the top of the page. | |
| 7.2 | The red alert reads "Real data entered — session should have stopped." | Banner text correct. | |
| 7.3 | Change the same field back to "No". | Live red alert banner disappears (if no other trip-wire is active). | |

---

## 8. Stop-Condition Trip-Wire Check

| # | Action | Expected behaviour | Pass / Fail |
|---|--------|--------------------|-------------|
| 8.1 | Tick any stop condition checkbox. | Checkbox highlights red; "[FIRED]" prefix appears on the condition label. | |
| 8.2 | The stop conditions card border turns red. | Border changes from slate to red. | |
| 8.3 | The live red alert banner appears at the top of the page. | Alert reads "Stop condition fired — record below and follow the rollback runbook." | |
| 8.4 | Untick the checkbox. | [FIRED] label removed; red alert banner disappears (if no other trip-wire is active). | |

---

## 9. Copy-Summary Check

| # | Action | Expected behaviour | Pass / Fail |
|---|--------|--------------------|-------------|
| 9.1 | Fill in at least: session date, operator initials, tester initials, one Q1 toggle, one stop condition ticked, outcome = PASS. | Fields show values. | |
| 9.2 | Click "Copy summary to clipboard". | Button flashes "Copied to clipboard" with a tick icon for ~2 seconds, then reverts. | |
| 9.3 | Paste the clipboard content into a plain text editor. | Content is readable plain text with all sections: SESSION DETAILS, QUESTION LOG, STOP CONDITIONS, OUTCOME. | |
| 9.4 | Confirm the summary header reads "OPERATOR USE ONLY — NO REAL CARE DATA". | Header correct. | |
| 9.5 | Confirm the [FIRED] stop condition appears in the STOP CONDITIONS section. | Condition listed with [FIRED] prefix. | |
| 9.6 | Confirm no network request was made (check devtools Network tab). | No XHR/fetch requests. | |

---

## 10. Clear-Form Check

| # | Action | Expected behaviour | Pass / Fail |
|---|--------|--------------------|-------------|
| 10.1 | With fields filled and stop conditions ticked, click "Clear form". | All toggles reset to unselected; all text fields clear; checkboxes unticked; outcome deselected. | |
| 10.2 | Confirm environment field resets to "Sandbox / demo-org". | Pre-filled value restored. | |
| 10.3 | Confirm checkpoint field resets to "9eefa43". | Pre-filled value restored. | |
| 10.4 | Confirm the live red alert banner is gone after clearing. | No red alert visible. | |
| 10.5 | Confirm no network request was made. | No XHR/fetch requests. | |

---

## 11. Pass / Fail Summary

Complete after performing Sections 4–10.

| Section | Description | Pass / Fail | Notes |
|---------|-------------|-------------|-------|
| 4 | Pre-dry-run checks | | |
| 5.1 | Cockpit page loads | | |
| 5.2 | Cockpit visual checks (15 items) | | |
| 5.3 | Navigate to feedback page | | |
| 5.4 | Feedback page visual checks (14 items) | | |
| 5.5 | Safety copy checks (5 items) | | |
| 6 | Feedback form behaviour | | |
| 7 | Real-data trip-wire | | |
| 8 | Stop-condition trip-wire | | |
| 9 | Copy-summary | | |
| 10 | Clear-form | | |

**Overall dry-run result:** Pass / Fail / Pass with issues

---

## 12. Issues Log

Record any failing or unexpected items here. Do not leave this section blank if any check failed.

| # | Section ref | Description | Severity (Critical / Medium / Low) | Fix required before staff rehearsal? |
|---|-------------|-------------|-------------------------------------|---------------------------------------|
| | | | | |

---

## 13. Decision

To be completed by the operator at the end of the dry run.

| Decision | Selected |
|----------|----------|
| UI is working as expected — dry run PASS. Rehearsal tooling is ready for the staff rehearsal (subject to all hard gates). | |
| UI has issues that must be fixed before the staff rehearsal proceeds. See Issues Log (Section 12). | |

**Decision recorded by (role/initials):**
**Date:**

---

## 14. Next Action After Dry Run

| Outcome | Next action |
|---------|------------|
| Dry run PASS | Await remaining hard gates: (1) Thumhara written sign-off (return-by 2026-06-14); (2) Supabase credential rotation. Then complete the Rehearsal Readiness Gate (docs/runbooks/one-user-rehearsal-readiness-gate.md) jointly with the Registered Manager before scheduling the staff rehearsal. |
| Dry run PASS with issues | Fix identified issues, re-run the affected sections of this checklist, record a revised decision above. |
| Dry run FAIL (critical issue) | Do not proceed toward the staff rehearsal. Raise the issue with the named operator (Inaam Basit). Fix and re-run. |

---

## 15. Governance Reminder

> This dry run does not advance the governance status of the staff rehearsal. Both hard gates remain open:
>
> 1. **Thumhara Centre written sign-off** — pack sent 2026-05-31; return-by 2026-06-14. Do not chase before that date.
> 2. **Supabase credential rotation** — deferred; must be completed before any trusted staff-style testing.
>
> Staff visibility remains **OFF**. Staff Ask remains **OFF**. No governance flags are changed by this checklist.
>
> Reference: docs/runbooks/one-user-rehearsal-readiness-gate.md Section 3.
