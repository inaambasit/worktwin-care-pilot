# One-User Staff Rehearsal — Readiness Gate / Go-No-Go Checklist

**Reference:** 4S.105C / 4S.106E
**Date:** 2026-06-01
**Last updated:** 2026-06-02 — Supabase credential rotation cleared (4S.106E)
**Status:** CHECKLIST ONLY — this document does not approve the rehearsal by itself

> **Bridge note (2026-06-13, 4S.109A):** this gate covers the **one-user rehearsal only**, which is a safety checkpoint, not the destination. A GO recorded here authorises only that single rehearsal. The intended next stage after a rehearsal PASS is a **controlled trusted-staff cohort pilot**, which has its own gates and its own joint GO/NO-GO decision — see `docs/runbooks/trusted-staff-cohort-pilot-plan.md`.

---

## 1. Purpose

This is the **final readiness gate** before the controlled one-user staff rehearsal can proceed.

It brings together every pre-condition — technical, governance, artefact, tester, and environment — into a single, jointly completed checklist. When every item is marked **Pass** by an authorised person, and the Section 9 Go/No-Go table records a joint **GO**, the rehearsal may be scheduled.

Until then, the default is **NO-GO**.

> Completing this checklist does not by itself approve the rehearsal. It records whether the conditions for a rehearsal are met. The GO must be explicitly recorded in Section 10 by the WorkTwin operator and the Registered Manager / Thumhara reviewer jointly.

---

## 2. Current Status Summary (as at 2026-06-02)

| Area | Status |
|------|--------|
| Technical — auth mode, membership, no-store, ADMIN_TOKEN, OpenAI | Substantially complete (see Section 4) |
| Supabase credential rotation | **COMPLETE — CLEARED** (4S.106E — 2026-06-02) |
| Thumhara sign-off | **PENDING — BLOCKING** (return-by 2026-06-14) |
| Governance — real_document decision, staff visibility, Staff Ask | **All OFF / not yet decided** |
| Rehearsal artefacts (runbooks, plan, session record) | All present on `main` |
| Tester identified and briefed | **NOT YET** |
| Environment / sandbox confirmed | Confirmed demo-org; no production org |

**Current overall status: NO-GO.** One hard blocker remains: Thumhara written sign-off (return-by 2026-06-14). Supabase credential rotation cleared 2026-06-02 (4S.106E — service-role key, JWT secret, anon key rotated; ES256 membership proof PASS; staff visibility remains OFF; Staff Ask remains OFF).

---

## 3. Absolute NO-GO Blockers

If **any** item in this section is **not satisfied**, the answer is **NO-GO**. Do not proceed to Sections 4–8.

| # | Blocker | Satisfied? |
|---|---------|------------|
| 3.1 | **Supabase credential rotation completed** (service-role key / JWT cascade). Any untreated exposed credential is an absolute blocker. | **PASS** — 4S.106E (2026-06-02) |
| 3.2 | **Thumhara Centre written sign-off returned and reviewed** by the WorkTwin operator. The confidentiality pack must have been returned with a completed sign-off — not just acknowledged. | |
| 3.3 | **No approved governance path has been skipped.** Any `real_document` promotion, staff-visibility change, or Staff Ask enablement must have gone through a recorded governance decision — not assumed or improvised. | |
| 3.4 | **Staff visibility and Staff Ask are only enabled (if at all) through a separately recorded operator decision** made after all other gates pass — not defaulted on, not left from a previous test, not toggled without a record. | |
| 3.5 | **A named rollback owner is present or immediately reachable** for the entire session. This person has the access and authority to switch flags OFF at any point. | |
| 3.6 | **A named monitoring owner is present or immediately reachable** for the entire session. This person will observe every interaction. | |
| 3.7 | **There is no intention to use real care data** of any kind (service-user, staff, family, medication, safeguarding, incident, complaint, HR). Tester has confirmed this in writing. | |

---

## 4. Technical Readiness

| # | Check | Expected state | Actual state | Pass / Fail |
|---|-------|---------------|-------------|-------------|
| 4.1 | **Auth mode aligned** — `PILOT_AUTH_MODE=true`, `NEXT_PUBLIC_PILOT_AUTH_MODE=true`. Both flags confirmed in local env and Render. | Both `true` | | |
| 4.2 | **ES256 membership proof passed** — active member → 200, inactive → 403, no-membership → 401/403. Proven end-to-end on sandbox demo-org (4S.104E-6b-fix). | PASS (sandbox) | | |
| 4.3 | **Cache-Control: no-store on `/policies` and `/ask`** — merged to `main` (commit `98135fc`, PR #1). | Merged | | |
| 4.4 | **`ADMIN_TOKEN` rotated** — local `backend/.env`, Render, Vercel updated; bogus → 401 (not 503) on Render confirmed. | Rotated | | |
| 4.5 | **`OPENAI_API_KEY` rotated** — new WorkTwin Care Pilot Backend key active; old key revoked; post-revoke verify PASS (search-vector 200, `has_error: false`). | Rotated, old key revoked | | |
| 4.6 | **Supabase credential rotation** — service-role key / JWT cascade. | Rotated | PASS — 4S.106E (2026-06-02): service-role, JWT secret, anon key rotated; ES256 membership proof PASS (active 200, inactive 403, nomember 403/401); cleanup verified | Pass |
| 4.7 | **Render backend healthy** — `GET /health` → 200 `{"status":"ok"}`. | 200 | | |
| 4.8 | **Vercel frontend reachable** — frontend loads without errors. | Reachable | | |
| 4.9 | **Staff visibility flag confirmed** — operator has verified the current flag state and recorded the intended state for this session. | Confirm on the day | | |
| 4.10 | **Staff Ask flag confirmed** — operator has verified the current flag state and recorded the intended state for this session. | Confirm on the day | | |
| 4.11 | **`git status --short` on `main` is clean** — no uncommitted modifications; working tree matches `origin/main`. | Clean | | |
| 4.12 | **Current `main` commit confirmed** — `git --no-pager log -1 --oneline` output recorded. | Record on the day | | |

---

## 5. Governance Readiness

| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 5.1 | **Completed confidentiality sign-off pack received** from Shagufta Akhtar / Thumhara Centre. | | Return-by 2026-06-14. |
| 5.2 | **Sign-off pack Section 10 answers reviewed** by WorkTwin operator — no unanswered questions, no objections unresolved. | | |
| 5.3 | **Sign-off pack Section 11 signatures checked** — completed and dated by the appropriate signatory. | | |
| 5.4 | **Any amendments or concerns raised in the sign-off pack resolved** before proceeding. | | |
| 5.5 | **`real_document` promotion decision recorded separately** — whether the dummy/extract documents remain in place or whether the real Confidentiality source policy has been promoted, is explicitly decided and documented. | | Must be a conscious decision, not a default. |
| 5.6 | **Staff visibility decision recorded separately** — the specific decision (enable / keep OFF) for this rehearsal is written down, dated, and made by the operator. | | |
| 5.7 | **Staff Ask decision recorded separately** — the specific decision (enable / keep OFF) for this rehearsal is written down, dated, and made by the operator. | | |
| 5.8 | **No governance gate has been bypassed or assumed** — every flag state is the result of a deliberate, recorded decision. | | |

---

## 6. Rehearsal Artefacts Readiness

| # | Artefact | Location on `main` | Present? |
|---|----------|-------------------|----------|
| 6.1 | Monitoring and rollback runbook | `docs/runbooks/trusted-staff-monitoring-and-rollback-runbook.md` | Yes (commit `c0d2c58`) |
| 6.2 | One-user rehearsal plan | `docs/runbooks/one-user-staff-rehearsal-plan.md` | Yes (commit `37cf96c`) |
| 6.3 | Session record / feedback capture | `docs/runbooks/one-user-rehearsal-session-record.md` | Yes (commit `1e74caa`) |
| 6.4 | Approved question list (Q1–Q8) | Embedded in rehearsal plan Section 6 and session record Section E | Yes |
| 6.5 | Feedback log template | Embedded in session record (per-question tester fields, Section E) | Yes |
| 6.6 | Incident log template | Session record Section G; also monitoring runbook Section 9 | Yes |
| 6.7 | Go/No-Go template | Session record Section I | Yes |
| 6.8 | **This readiness gate checklist** | `docs/runbooks/one-user-rehearsal-readiness-gate.md` | Confirm merged |

All six artefacts must be present on `main` and the operator must have read each one before the session opens.

---

## 7. Tester Readiness

| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 7.1 | **Single trusted tester chosen** — one person only; named; trusted internal person (not general staff rollout). | | Name held by operator; not recorded here. |
| 7.2 | **Tester has been briefed** on the purpose, constraints, and stop conditions of the rehearsal. | | |
| 7.3 | **Tester confirms in writing** (session record Section C) that no real service-user, staff, family, medication, safeguarding, incident, complaint or HR data will be entered. | | Confirmed in session record on the day. |
| 7.4 | **Tester understands WorkTwin is guidance/signposting only** — not an authoritative decision-maker; not a replacement for a human supervisor. | | |
| 7.5 | **Tester knows to stop immediately** and tell the operator if anything seems wrong. | | |
| 7.6 | **Tester is not a Thumhara Centre staff member** unless the Thumhara reviewer has separately approved their participation in writing. | | |

---

## 8. Environment Readiness

| # | Check | Required value | Confirmed? |
|---|-------|---------------|------------|
| 8.1 | Organisation in use | `demo-org` (sandbox) | |
| 8.2 | No Thumhara Centre production org (`thumhara-centre`) in scope | Not in scope — separate written decision required to change this | |
| 8.3 | No real confidential care data in any document accessible during the session | Confirmed — dummy/extract documents only unless separately governed | |
| 8.4 | **Rollback path confirmed** — operator has the access and knows the steps to switch staff visibility and Staff Ask OFF immediately if a Stop Condition fires (monitoring runbook Section 6) | Confirmed by operator | |
| 8.5 | Backend Render URL confirmed and reachable | `https://worktwin-care-pilot-api.onrender.com` | |
| 8.6 | Frontend Vercel URL confirmed and reachable | `https://worktwin-care-pilot.vercel.app` | |

---

## 9. Final Go / No-Go Table

Complete only after Sections 3–8 are fully checked. If any Section 3 blocker is unsatisfied, the result is **NO-GO** regardless of the rest.

| Section | All items Pass? | Notes |
|---------|----------------|-------|
| Section 3 — Absolute blockers | | Any No = NO-GO. |
| Section 4 — Technical readiness | | |
| Section 5 — Governance readiness | | |
| Section 6 — Artefacts present | | |
| Section 7 — Tester readiness | | |
| Section 8 — Environment readiness | | |
| **Overall result** | **GO / NO-GO** | |

**Default: NO-GO.** A GO requires every section above to be All Pass and must be jointly recorded in Section 10.

---

## 10. Decision Record

Complete jointly. Both signatures required for a GO.

| Field | Entry |
|-------|-------|
| Date of decision | |
| Overall result (Section 9) | GO / NO-GO |
| Any items marked Fail or N-A (list) | |
| Any conditions attached to GO | |
| Decision made by (WorkTwin operator) | |
| Decision endorsed by (RM / Thumhara reviewer) | |
| Next action | |
| Scheduled rehearsal date (if GO) | |

---

## 11. Scope Statement

**Completing this checklist does not by itself approve the rehearsal.** It records whether the pre-conditions for a rehearsal are met.

A rehearsal may only proceed when:
- all Section 3 blockers are satisfied;
- all Sections 4–8 items are Pass;
- a joint GO is explicitly recorded in Section 10 by the WorkTwin operator and the Registered Manager / Thumhara reviewer.

**This checklist does not approve staff access, staff visibility, Staff Ask, `real_document` promotion, real care data use, or wider rollout.** Any of those requires a separate, explicitly recorded decision over and above this gate.
