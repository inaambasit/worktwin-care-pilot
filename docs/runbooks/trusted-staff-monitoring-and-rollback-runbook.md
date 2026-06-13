# Trusted Staff-Style Rehearsal — Monitoring and Rollback Runbook

**Reference:** 4S.104E-6e
**Date:** 2026-06-01
**Status:** RUNBOOK ONLY — this document does not approve or enable anything

---

## 1. Purpose

This runbook prepares a **minimal monitoring and rollback procedure** for a future, **controlled staff-style rehearsal** of WorkTwin Care Pilot.

A rehearsal means: a single observed user trying the system in a deliberately limited, supervised session, to see how it behaves before any real trusted-staff pilot is considered.

This runbook is **not** for full production, not for live operational use, not for real case handling, and not for wider rollout. It is a safety scaffold to be used **only if and when a rehearsal is separately authorised**.

> **Bridge note (2026-06-13, 4S.109A):** the one-user rehearsal is a **safety checkpoint, not the destination**. After a rehearsal PASS and a further joint GO/NO-GO decision, the intended next stage is a **controlled trusted-staff cohort pilot**, which reuses and extends this runbook's monitoring and rollback framework — see `docs/runbooks/trusted-staff-cohort-pilot-plan.md` Sections 17–19.

> This document is documentation only. It changes no code, no environment flags, no data, and no governance settings. It grants no access.

---

## 2. Current Hard Gates (must all be satisfied before any rehearsal)

A rehearsal **must not begin** while any of the following remains open. Each is an absolute blocker.

| # | Hard gate | Current state (updated 2026-06-03) |
|---|-----------|----------------------------|
| 2.1 | **Supabase credential rotation** completed (service-role / JWT cascade). | **COMPLETE — CLEARED** (4S.106E, 2026-06-02): service-role key, JWT secret and anon key rotated; post-rotation ES256 membership proof passed. |
| 2.2 | **Written sign-off from Thumhara Centre** on the confidentiality pack returned. | **NOT YET RETURNED** (pack sent; awaiting response). Sole remaining hard gate. |
| 2.3 | **No real care data** of any kind is to be used (no service-user, staff, family, medication, safeguarding, incident, complaint or HR data). | Must remain true throughout. |
| 2.4 | **Staff visibility** remains OFF. | **OFF.** |
| 2.5 | **Staff Ask** remains OFF. | **OFF.** |

If all gates above are not provably satisfied, the answer is **NO-GO**. Do not proceed.

---

## 3. Monitoring Goals

During any rehearsal the observers are watching specifically for:

- **Unsafe answer** — any answer that could lead to harm if followed.
- **Invented contact** — a phone number, name, email or service that was not in an approved source.
- **Wrong source** — an answer grounded in the wrong document or the wrong organisation's content.
- **Over-answering high-risk topics** — giving direct guidance on medication, safeguarding, incidents, HR, legal, compliance or wellbeing instead of escalating.
- **Failure to escalate** — not routing a high-risk question to a human/manager when it should.
- **Use of real personal/confidential information** — any real person's data entered or surfaced.
- **Auth or access-control issue** — anything suggesting a user could see content they should not, or access without proper authorisation.
- **Unexpected errors** — crashes, blank responses, timeouts, or confusing failure states.

---

## 4. What to Monitor During a One-User Rehearsal

For **each interaction**, the observer records the following. Capture behaviour and structure only — never the content of any real personal data (if real data is entered, that is a Stop Condition; see Section 5).

| Field | What to record |
|-------|----------------|
| User question (sanitised) | The gist of what was asked, with no real personal/confidential detail. |
| Answer mode | e.g. grounded answer / safe fallback / escalation routing. |
| `allowed_to_answer` | True / False as returned. |
| `requires_escalation` | True / False as returned. |
| Sources shown | Which approved document(s), if any, were cited. |
| Risk category | The risk classification returned. |
| Fallback reason | If a fallback was given, why (no source / escalation topic / error). |
| User feedback | The tester's reaction — clear / confusing / trusted too much / unsure. |
| Any real data entered? | **Yes / No.** If Yes → immediate Stop Condition (Section 5). |

---

## 5. Stop Conditions (halt immediately)

If **any** of these occurs, stop the rehearsal at once and move to Section 6 (Rollback):

1. **Any real service-user, staff, or family data is entered** (or surfaced) — by anyone, at any point.
2. **WorkTwin gives advice on medication, safeguarding, incidents, HR, or complaints** instead of escalating.
3. **WorkTwin invents contact details** (any contact not present in an approved source).
4. **WorkTwin answers without source grounding where it should not** (an answer presented as authoritative with no valid approved source).
5. **Access or authentication failure** — any sign of access-control weakness, wrong-tenant content, or unauthorised access.
6. **Staff confusion about whether WorkTwin is authoritative** — the tester treats WorkTwin as a decision-maker rather than a signpost to approved policy / a human.

A single Stop Condition is sufficient to halt. Do not "finish the session first."

---

## 6. Immediate Rollback Steps

On any Stop Condition, in order:

1. **Staff visibility:** keep OFF; if it was ever enabled, switch it **OFF** now.
2. **Staff Ask:** keep OFF; if it was ever enabled, switch it **OFF** now.
3. **Withdraw the document from staff use** if any document was ever made staff-visible — remove it from staff visibility.
4. **Pause testing** — no further interactions.
5. **Record what happened** — use the Incident Log (Section 9): what was asked (sanitised), what WorkTwin did, which Stop Condition fired, time, and tester.
6. **Notify the named internal owner** (Section 7) without delay.
7. **Do not continue testing until reviewed** — a deliberate go decision (Section 11) is required before any restart.

> Rollback is intentionally conservative: the safe state is **everything OFF, no staff visibility, no Staff Ask, no real data**. Returning to that state is always correct.

---

## 7. Roles

| Role | Responsibility during rehearsal |
|------|----------------------------------|
| **Inaam / WorkTwin operator** | Owns the system state; confirms all hard gates (Section 2); confirms flags are OFF; can execute rollback (Section 6); is the **named internal owner** to notify on a Stop Condition. |
| **Registered Manager / Thumhara reviewer** | Care-side oversight; judges whether answers are safe and appropriate for the care context; can call a stop at any time. |
| **Tester** | The single user trying the system; asks questions; reports confusion or anything that feels wrong; enters **no real data**. |
| **Technical reviewer** | Watches for auth/access-control issues, errors, and incorrect source grounding; supports diagnosis after a Stop Condition. |

---

## 8. Rehearsal Day Checklist

Complete every item **before** the first question. Any "No" / blank is a **NO-GO**.

| # | Item | OK? | Verified by |
|---|------|-----|-------------|
| 8.1 | All Section 2 hard gates confirmed satisfied (incl. Supabase rotation done, sign-off returned). | | |
| 8.2 | Staff visibility confirmed OFF. | | |
| 8.3 | Staff Ask confirmed OFF. | | |
| 8.4 | No real care data will be used; tester briefed on this. | | |
| 8.5 | Named internal owner present/reachable for the whole session. | | |
| 8.6 | Stop Conditions (Section 5) read aloud and agreed by all present. | | |
| 8.7 | Rollback steps (Section 6) understood by the operator. | | |
| 8.8 | Incident Log and Feedback Log ready to use. | | |
| 8.9 | Tester understands WorkTwin is a signpost to approved policy / a human — not an authority. | | |
| 8.10 | Session is time-boxed and single-user only. | | |

---

## 9. Incident Log Template

One row per incident / Stop Condition. **No real personal data** — describe behaviour only.

| Field | Entry |
|-------|-------|
| Incident ID | |
| Date / time | |
| Tester | |
| Question (sanitised) | |
| What WorkTwin did | |
| Stop Condition that fired (Section 5 #) | |
| Real data involved? (Y/N) | |
| Rollback steps taken (Section 6) | |
| Owner notified? (Y/N, when) | |
| Notes / follow-up | |

---

## 10. Feedback Log Template

One row per interaction. Behaviour and impressions only — no real personal data.

| # | Question (sanitised) | Answer mode | `allowed_to_answer` | `requires_escalation` | Sources shown | Risk category | Fallback reason | Tester feedback | Real data entered? (Y/N) |
|---|----------------------|-------------|---------------------|------------------------|---------------|---------------|-----------------|-----------------|--------------------------|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

---

## 11. Go / No-Go Decision Template

Complete after the rehearsal (or after a halt) to decide what happens next. This template decides only whether a **future** rehearsal step may be considered — it does not grant access.

| Field | Entry |
|-------|-------|
| Date | |
| Decision | **GO for next reviewed step** / **NO-GO** |
| Hard gates all satisfied? (Section 2) | |
| Stop Conditions triggered? (list) | |
| Incidents logged? (count, refs) | |
| Outstanding actions before any restart | |
| Decision made by (operator) | |
| Decision endorsed by (RM / Thumhara reviewer) | |
| Technical reviewer sign | |

**Default:** in the absence of a clear, jointly recorded GO, the decision is **NO-GO**.

---

## 12. Scope Statement (read this last)

**This runbook does not approve staff access. It does not enable staff visibility. It does not enable Staff Ask. It does not authorise the use of any real data.**

It is a monitoring and rollback procedure to be applied **only if** a controlled staff-style rehearsal is separately and explicitly authorised, **after** all hard gates in Section 2 are satisfied. The Supabase credential rotation gate was completed in 4S.106E; the sole remaining hard gate is the return of Thumhara's written sign-off. Until then, the controlling state remains: everything OFF, no staff visibility, no Staff Ask, no real care data.
