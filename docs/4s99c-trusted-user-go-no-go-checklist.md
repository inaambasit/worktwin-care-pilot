# 4S.99C — Trusted-User Pilot Go/No-Go Checklist

**Date:** 2026-05-18  
**Status:** Pre-access checklist — no access granted by this document.

---

## 1. Purpose

This checklist defines the final conditions that must be satisfied before any 3–5 named Thumhara Centre trusted users are granted access to the WorkTwin Care Pilot.

This document does not activate access, does not change environment flags, does not create users, does not approve production use, and does not authorise live operational use.

---

## 2. Current readiness position

The current controlled proof position is:

- Four-policy Thumhara staff-visible set has passed Staff Ask smoke proof.
- Authenticated backend proof passed with a non-real staff test user.
- Local frontend auth/session proof passed.
- Stakeholder-safe frontend route audit is complete.
- Trusted-user pilot pack exists.
- Public/live staff rollout remains disabled.
- Public admin proxy remains disabled.
- No real staff access has been granted.
- No real service-user, HR, safeguarding, medication, complaint or confidential personal data should be entered.

Current readiness for a narrow trusted-user pilot is approximately **8.5/10**, subject to the remaining checks in this document.

---

## 3. Hard no-go conditions

Access must not be granted if any of the following are true:

- Any real service-user, resident, HR, safeguarding, medication, complaint, care-plan, MAR chart or confidential personal data is intended to be uploaded or entered.
- The pilot pack has not been reviewed and accepted by Thumhara leadership.
- Named trusted users have not been individually approved.
- Users have not been briefed on prohibited data and escalation boundaries.
- The feedback route is not agreed.
- The incident process owner is not agreed.
- Public/live deployment proof has not been completed.
- Environment flags have not been checked immediately before access.
- Auth/session proof has not been repeated against the intended access route.
- Admin proxy is enabled publicly without a separate admin rollout decision.
- QCS or third-party restricted content is used for staff-facing RAG without written permission.
- Anyone expects WorkTwin to support live operational decisions.

---

## 4. Required pre-access checks

| Check | Required status before access |
|------|-------------------------------|
| Named users agreed | Required |
| Pilot pack reviewed by leadership | Required |
| Each user briefed individually | Required |
| Prohibited-data rules understood | Required |
| Escalation rules understood | Required |
| Feedback route agreed | Required |
| Incident process owner agreed | Required |
| Start/end dates agreed | Required |
| Access removal plan agreed | Required |
| Public deployment route proof completed | Required |
| Public auth flag review completed | Required |
| Backend auth flag review completed | Required |
| Admin proxy disabled or separately approved | Required |
| Staff Ask positive smoke proof repeated | Required |
| Staff Ask high-risk negative controls repeated | Required |
| Policy Library shows only approved staff-visible documents | Required |
| No QCS/third-party restricted content in staff-visible set | Required |
| Repo clean and checkpoint recorded | Required |

---

## 5. Final technical proof required before access

Before granting any named user access, run and record:

1. Public frontend route check.
2. Public backend health check.
3. Auth/session check using the intended login route.
4. `/policies` proof showing only the approved four-policy staff-visible set.
5. `/ask` positive proof for:
   - visitor sign-in
   - mobile phone use
   - records handling
   - hand hygiene
6. `/ask` negative-control proof for:
   - medication missed
   - safeguarding disclosure
   - resident fall/accident
   - named staff complaint
   - family member confidentiality question
7. Logout proof.
8. Repo clean checkpoint.
9. Environment flag review.

No named user should be invited until these are recorded.

---

## 6. Access decision states

| Decision | Meaning |
|---------|---------|
| GO | All pre-access checks passed; named users may be invited for narrow controlled testing only. |
| CONDITIONAL GO | Minor non-safety issue remains; access may proceed only if explicitly accepted by pilot lead. |
| NO-GO | Any hard no-go condition is present, or required proof is missing. |

Current position as of this document: **CONDITIONAL GO — not yet access-ready until final deployment proof, named-user approval, pilot-pack acceptance, feedback route confirmation and incident owner confirmation are complete.**

---

## 7. Boundaries after access

If access is granted, it remains limited to:

- 3–5 named trusted users only.
- General policy/workflow questions only.
- The approved four-policy staff-visible set only.
- No real personal, service-user, HR, safeguarding, medication, complaint, care-plan or confidential data.
- No live operational decision-making.
- No wider staff rollout.
- No production claim.

Any unsafe use, accidental data entry, confusion about boundaries, or escalation failure should pause the pilot immediately pending review.

---

## 8. Final warning

This checklist is an internal readiness control. It is not legal advice, not a DPIA, not regulatory approval, not production approval and not a substitute for Thumhara Centre leadership sign-off.
