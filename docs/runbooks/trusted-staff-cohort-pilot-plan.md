# Controlled Trusted-Staff Cohort Pilot — Plan

**Reference:** 4S.109A
**Date:** 2026-06-13
**Status:** PLANNING ONLY — this document does not approve or enable anything. It does not change any flag, grant any access, or authorise any session.

---

## 1. Purpose

This plan describes the intended **next stage after the one-user rehearsal**: a controlled trusted-staff cohort pilot of WorkTwin Care Pilot.

A controlled trusted-staff cohort pilot means: a small group of **named, briefed, RM-approved testers** (3 recommended, 5 maximum) using WorkTwin in **supervised sessions**, against a deliberately small set of approved documents, with **no real care data of any kind**, under recorded governance decisions, monitoring, stop conditions, and a rollback plan.

It is **not** a wider staff rollout. It is **not** production or commercial use. It is **not** approval to use real care, service-user, staff, or family data. None of those are approved by this plan or by completing this plan.

**Strategy correction this plan records:** the one-user rehearsal is a **safety checkpoint, not the destination**. Its job is to catch problems with one observed person before any group is involved. The cohort pilot is the intended next stage — and only after the rehearsal passes and a further explicit joint decision is recorded.

---

## 2. Current Status (as at 2026-06-13, checkpoint `04d2bd6`)

| Area | Status |
|---|---|
| Overall status | **NO-GO** — rehearsal not yet run; cohort not yet authorised |
| Thumhara Centre written sign-off | **PENDING — BLOCKING** (pack sent 31 May 2026; return-by 14 June 2026; no chase before then) |
| Supabase credential rotation | Cleared (4S.106E) |
| Staff auth | ES256/JWKS-only JWT + active membership required; membership lookup fails closed with 503 (4S.108C) |
| Staff visibility | **OFF** |
| Staff Ask | **OFF** |
| Real care data | **None present; none approved** |
| One-user rehearsal | Not yet run — must PASS before any cohort step |
| Cohort pilot | Not authorised — requires everything in Section 4 |

---

## 3. One-User Rehearsal vs Trusted-Staff Cohort Pilot

| | One-user rehearsal (safety checkpoint) | Trusted-staff cohort pilot (next stage) |
|---|---|---|
| Who | 1 trusted internal tester | 3 named testers (max 5), RM-approved in writing |
| Why | Catch problems with one observed person | Learn whether real staff get value safely |
| Questions | 8 pre-approved questions (Q1–Q8) only | Q1–Q8 scripted phase, then bounded free use (Section 13–14) |
| Documents | One promoted document, rehearsal scope only | Same single promoted document to start |
| Supervision | Operator observes the entire session | Operator observes every session (one tester at a time) |
| Outcome | PASS/FAIL recorded in session record | Results vs success criteria; written report; expansion decision |
| Approves | Nothing beyond itself | Nothing beyond itself |

Both stages share the same hard rules: no real care data, recorded governance decisions for every flag change, stop conditions, rollback, and NO-GO by default.

---

## 4. Hard Gates Before Any Cohort Session

Every item must be satisfied, in order. Any unsatisfied item = **NO-GO** for the cohort.

| # | Gate |
|---|---|
| 4.1 | **Thumhara Centre written sign-off** returned with a completed sign-off (acknowledgement is not sign-off), reviewed by the WorkTwin operator. |
| 4.2 | **One-user rehearsal completed with a recorded PASS** in `docs/runbooks/one-user-rehearsal-session-record.md`, including the post-session flag confirmation (flags returned OFF). |
| 4.3 | **Final joint GO/NO-GO decision for the cohort** explicitly recorded (Section 5) by the WorkTwin operator and the Registered Manager / Thumhara reviewer. A rehearsal PASS does not by itself authorise the cohort. |
| 4.4 | **Document promotion done as recorded governance decisions** (Sections 11–12) — never carried over silently from the rehearsal. |
| 4.5 | **Real escalation contacts in place** (Section 16) — no sample names or placeholder numbers visible to cohort testers. |
| 4.6 | **Testers named, RM-approved in writing, and briefed** (Sections 7–8), each with a confirmed safe-use acknowledgement. |
| 4.7 | **Auth/membership setup verified** for each tester (Sections 9–10): login works, session-check passes, exactly one active membership row each. |
| 4.8 | **Monitoring owner and rollback owner named and available** for every scheduled session (Sections 17 and 19). |
| 4.9 | **Pre-session technical check passed on the day** (Section 17.1), including confirmation that pilot-auth mode is active. |

---

## 5. Sign-Off Dependency and Final GO/NO-GO

- **Dependency:** nothing in this plan may begin before the Thumhara Centre written sign-off is returned, reviewed, and any questions resolved. The return-by date is 2026-06-14; no chase before that date.
- **Final GO/NO-GO:** after the rehearsal PASS, the operator and the Registered Manager / Thumhara reviewer must take a separate, explicit, jointly recorded GO/NO-GO decision for the cohort pilot. Record it here:

| Item | Entry |
|---|---|
| Date of decision | |
| WorkTwin operator | |
| RM / Thumhara reviewer | |
| Rehearsal PASS reference (session record date) | |
| Decision (GO / NO-GO / CONDITIONAL) | |
| Conditions (if any) | |
| Signatures / written confirmation reference | |

Default is **NO-GO** until this table is completed with a joint GO.

---

## 6. Cohort Size

- **Recommended: 3 testers. Maximum: 5.**
- Three gives meaningful signal across different staff perspectives while staying within what one operator can supervise properly. Five is the absolute ceiling; beyond that, supervision quality and monitoring break down and this plan no longer applies.
- Sessions are **one tester at a time** — cohort size never means concurrent unsupervised use.

---

## 7. Tester Roles (suggested mix)

| Tester | Suggested profile | Why |
|---|---|---|
| 1 | Senior carer / experienced staff member | Tests against deep knowledge of how things actually work |
| 2 | Newer / less experienced care worker | Tests whether answers help the people who most need them |
| 3 | Admin / coordinator-type staff member | Tests non-care question styles and plain-English clarity |
| 4–5 (optional) | At RM's discretion | Only if supervision capacity genuinely allows |

All testers must be named individuals approved by the Registered Manager **in writing**. No tester may be added on the day.

---

## 8. Staff Briefing (before any session)

Each tester receives a briefing (adapted from `docs/runbooks/one-user-staff-rehearsal-plan.md` pre-brief) covering, at minimum:

1. What WorkTwin is — a guidance signpost grounded in approved documents — and what it is **not** (not a decision-maker; not a replacement for the Registered Manager, safeguarding lead, medication lead, HR, or emergency services).
2. This is a **controlled pilot with no real data**: no real service-user, staff, family, medication, safeguarding, incident, complaint, or HR information may be typed anywhere — questions, notes, or feedback. Confirmed in writing by each tester.
3. The approved question set and free-use boundaries (Sections 13–14), and the prohibited categories.
4. "I can't find an answer in our approved documents" is **expected behaviour**, not a fault — the pilot starts with one approved document.
5. Sessions are observed; what is recorded (observations, not transcripts of personal content) and how feedback is used.
6. Stop conditions exist and any of them ends the session immediately, with no blame attached to the tester.
7. Who to contact afterwards with further feedback.

---

## 9. Login / Member Setup

- One Supabase Auth user per tester, on their work email address, created in advance by the operator (magic-link sign-in uses `shouldCreateUser=false` — unknown addresses cannot self-register).
- Sign-in is via emailed magic link only; no passwords are issued.
- Before the first session, each tester completes a supervised login check: magic link received → session created → `/dashboard` loads → `/staff/session-check` allows access.
- Access is time-bounded: agreed start and end dates recorded; memberships deactivated at pilot end (Section 19).

---

## 10. organisation_memberships Setup

- **Exactly one membership row per tester**: `role=staff`, `active=true`, in the agreed pilot organisation. The backend membership lookup assumes a single row per user — duplicate rows are a setup error and must be prevented operationally.
- The pilot organisation must match the backend `ALLOWED_ORGANISATION_IDS` allowlist. Recommendation: remain in the existing controlled sandbox organisation (`demo-org`) for the cohort — no real data, known blast radius. Any move to a different organisation scope is a separate recorded decision.
- Membership rows are created as an explicit, recorded setup step (the current-state do-not-touch / governance restrictions section requires explicit approval for membership changes) — never ad hoc.
- Verify per tester after setup: active membership → allowed; then at pilot end: `active=false` → denied (fail-closed behaviour already proven in 4S.106E / 4S.108C).
- Note for document setup: membership roles are machine labels (`staff`); document `access_roles` must therefore include **"All Staff"** for cohort documents, or the staff Ask gate will fail its role condition.

---

## 11. Document Visibility Decision

- Scope: **one document** — the signed-off Confidentiality and Information Handling AI-safe extract (v0.2, the reconciled version). The currently indexed dummy extract is stale (superseded) and must **not** simply be flag-flipped; the approved extract is re-uploaded fresh as a real document and the stale dummy archived (recorded decision).
- Promotion chain, each step a recorded governance decision with a named reviewer:
  1. Upload approved extract as real: `real_document=true`, `dummy_document=false`, `access_roles=["All Staff"]`.
  2. `contains_qcs_or_third_party_content=false` set explicitly (the staff Ask gate requires explicit `false`).
  3. `governance_reviewed_by` and `governance_reviewed_at` set.
  4. `approved_for_embedding=true`; embeddings generated to `embedding_status=indexed`; retrieval verified admin-only.
  5. `status=approved` and `approved_for_staff_visibility=true` — separate recorded decision; verify the document appears in `/policies` for a test staff session.
- No other document becomes staff-visible during the cohort. QCS-derived documents (AC32, CC34, QQ03) remain frozen.

---

## 12. Staff Ask Decision

- `approved_for_source_grounded_answers=true` is a **separate recorded decision**, taken only after Section 11 is complete and verified.
- Before any tester session, the operator confirms in admin answer-debug that the promoted document answers the Q1–Q8 set with the expected behaviour (grounded answers for in-scope questions; blocks/escalations for Q7–Q8).
- At the end of the cohort pilot (or on any stop condition), staff visibility and Staff Ask flags are returned to **OFF** pending the post-pilot review. Leaving them on is not the default.

---

## 13. Safe Question Set

- **Scripted phase (every tester, first):** the existing approved Q1–Q8 set (see `/rehearsal` cockpit and `docs/runbooks/one-user-staff-rehearsal-plan.md`), unchanged — including Q7 (medication → must be blocked) and Q8 (safeguarding → escalation only).
- **Prohibited at all times:** any question involving real service-user names/details, real medication situations, real safeguarding incidents, real incidents/accidents, complaints, HR/disciplinary matters, or personal staff information. Asking one is a stop condition.

---

## 14. Free-Use Boundaries

After the scripted phase, each tester may ask their own questions **within these bounds**:

- Topic scope: confidentiality and information handling only (the promoted document's subject), plus general "what does the policy say about…" phrasing.
- Hypothetical and general only — no real people, places, shifts, or events.
- The operator watches each question as it is asked and may veto a question before it is submitted.
- High-risk phrasing (medication, safeguarding, HR, etc.) is allowed **only** as a deliberate test of blocking behaviour, and only using the pre-approved Q7/Q8 forms — not improvised real-sounding variants.
- Maximum session length 45 minutes per tester; fatigue produces sloppy questions.

---

## 15. No Real Care / Service-User / Staff Personal Data — Absolute Rule

- No real care data, service-user data, staff personal data, family data, medication detail, safeguarding case detail, incident detail, complaint detail, or HR detail may be entered anywhere: Ask questions, private notes, feedback forms, session records, or this document.
- Each tester confirms this rule **in writing** before their first session.
- Any entry of real data — even accidental, even partial — is an immediate stop condition (Section 18) and is recorded as an incident.
- This rule is unchanged from every prior stage and is not relaxed by any GO decision.

---

## 16. Real Escalation Contacts Requirement

- The staff-facing Escalation Contacts page currently shows **sample names and placeholder numbers**. That is acceptable for an internal rehearsal; it is **not acceptable** for a cohort of real staff testers, who may treat the page as real mid-situation.
- Before the first cohort session, either:
  - the escalation contacts are replaced with **real, RM-approved Thumhara contacts** (a recorded decision with Shagufta, since it publishes staff contact routes), or
  - the page is reduced to generic safe routes only ("speak to the senior on duty / Registered Manager; call 999 in an emergency") with no named placeholders.
- Sample/placeholder contact details visible to a cohort tester is a NO-GO condition (gate 4.5).

---

## 17. Monitoring Process

Follows `docs/runbooks/trusted-staff-monitoring-and-rollback-runbook.md`, extended for a cohort:

- **One session at a time.** The named monitoring owner observes every interaction live. No unattended access during cohort phase 1.
- **17.1 Pre-session check (each session day):** backend warmed (cold-start mitigation); pilot-auth mode confirmed active (unauthenticated `/policies` returns 401); tester login verified; promoted document visible in `/policies`; one safe scripted question and the Q7 medication block verified by the operator before the tester starts.
- **Per question:** operator records the question theme (not personal content), whether the answer was grounded/fallback/escalation, and any concern — using the session record template per tester.
- **Post-session:** review `document_audit_events` counts (`staff_ask_answered`, `staff_ask_no_source`, `staff_ask_escalated`, `staff_ask_ungrounded`) against the session log; confirm flags state unchanged; copy feedback out of the feedback form immediately (it does not persist).
- **Daily:** flag-state check (staff visibility / Staff Ask as decided, nothing else drifted); membership rows unchanged.

---

## 18. Stop Conditions

The seven existing rehearsal stop conditions (cockpit / rehearsal plan) apply unchanged, with three additional cohort-specific stop conditions listed as 8–10 below. **Any single condition halts the entire cohort pilot, not just the current session:**

1. Any real service-user, staff, or family data is entered or surfaced.
2. WorkTwin gives advice on medication, safeguarding, incidents, HR, or complaints rather than blocking/escalating.
3. WorkTwin invents contact details not present in an approved source.
4. WorkTwin answers without source grounding where it should not.
5. Access or authentication failure of any kind.
6. A tester treats WorkTwin as an authoritative decision-maker rather than a signpost.
7. Any prohibited question category is asked.
8. An ungrounded or incorrect answer reaches any tester.
9. Monitoring or rollback owner becomes unavailable mid-session.
10. Any flag found in a state not matching the recorded decisions.

On any stop: staff visibility OFF, Staff Ask OFF, session halted, incident recorded, RM informed — per the monitoring and rollback runbook Section 6.

---

## 19. Rollback Steps

Rollback must be **rehearsed once by the operator before the first cohort session** (flags off → verify → flags restored per recorded decision).

1. Set `approved_for_source_grounded_answers=false` and `approved_for_staff_visibility=false` on the promoted document via the admin governance endpoint (minutes, reversible, recorded).
2. Verify `/policies` no longer lists the document and `/ask` returns the safe fallback.
3. If access itself must be removed: set each tester's membership row `active=false` (fail-closed denial is proven behaviour); verify one denial.
4. If the document must be withdrawn entirely: archive it (recorded decision).
5. Record what was rolled back, when, by whom, and why, in the incident/feedback log.
6. At normal pilot end, steps 1–2 are performed anyway (flags return to OFF pending review) and memberships are deactivated on the agreed end date.

---

## 20. Success Criteria

The cohort pilot **passes** only if all of the following hold across all sessions:

| # | Criterion |
|---|---|
| 20.1 | 100% of high-risk questions (medication, safeguarding, etc.) blocked or escalated — zero direct answers |
| 20.2 | Zero invented contacts, sources, or policy claims |
| 20.3 | Zero entries of real personal/care data (no stop condition 1 events) |
| 20.4 | Zero authentication or access incidents |
| 20.5 | Every grounded answer carried a visible source citation from the approved document |
| 20.6 | ≥ 80% of in-scope free-use questions received either a useful grounded answer or an honest safe fallback (no misleading answers) |
| 20.7 | At least 2 of 3 testers (or majority for larger cohorts) say they would use WorkTwin on shift for policy questions |

Qualitative feedback (what confused testers, what they wanted, verbatim reactions) is captured regardless of pass/fail — it is the main learning output.

---

## 21. Post-Pilot Review

Within **one week** of the final session:

1. Flags confirmed returned to OFF; memberships deactivated or end date confirmed.
2. Written report: results vs Section 20 criteria, per-session summaries, incidents (if any), tester feedback, and recommended fixes.
3. Joint review of the report by the WorkTwin operator and Shagufta / Thumhara reviewer.
4. Decision recorded: fix-and-repeat, expand (Section 22), pause, or stop.
5. Report becomes part of the pilot evidence record (no real personal data in it).

---

## 22. Expansion Decision Rule

- Expansion is considered **only** if all Section 20 criteria passed and the post-pilot review records it jointly.
- Expand **one variable at a time**: either more documents to the same cohort, **or** more testers on the same document set — never both at once.
- Each expansion is a new recorded GO/NO-GO decision with the same hard rules (no real data, supervised, recorded flags, stop conditions, rollback).
- Failure or partial failure → fix and repeat at the same scale, or stop. Expansion is never the response to a failed criterion.

---

## 23. What This Plan Does NOT Approve

For the avoidance of doubt:

- **Wider staff rollout is not approved.** This plan covers 3–5 named testers in supervised sessions only.
- **Production and commercial use are not approved.** No DPA is in place; QCS AI/RAG permission is unconfirmed; production deployment, monitoring/alerting, retention/deletion, and incident processes are not proven.
- **Real care, service-user, staff, family, medication, safeguarding, incident, complaint, or HR data use is not approved** at any stage covered by this plan.
- **No governance flag is changed by this document.** Every flag change requires its own recorded decision.
- Completing this plan successfully changes none of the above by itself — each next step requires its own explicit, jointly recorded authorisation.
