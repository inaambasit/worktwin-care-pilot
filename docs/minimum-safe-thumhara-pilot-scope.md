# Minimum Safe Thumhara Pilot Scope

**Date:** 2026-05-13
**Status:** Controlled pilot scope — not production approval.

---

## 1. Purpose

This document freezes the agreed boundary for the Minimum Safe Thumhara Pilot. Its purpose is to ensure that WorkTwin does not drift into wider SaaS or general product scope before the safety, governance, and quality foundations for even a narrow pilot have been properly proven.

The Thumhara Centre pilot is not a general product launch. It is a narrow, controlled test with a small trusted group, focused on a single care provider, using a single approved set of Thumhara-owned policy documents, for a single narrow use case. Any expansion beyond this boundary requires a separate, explicit decision.

This document was written based on discussion with Shagufta, who has 3–5 trusted people available for controlled testing.

---

## 2. What the pilot is allowed to do

Within its defined boundary, the pilot is permitted to:

- Allow trusted Thumhara Centre staff to ask general questions about approved Thumhara-owned policy and onboarding material.
- Return source-grounded answers only from documents that have been approved for staff visibility.
- Cite the relevant policy source where a question is answerable.
- Refuse or escalate high-risk topics (safeguarding, medication, HR, complaints, accident/incident, raising concerns) rather than generating procedural advice.
- Help Thumhara Centre leadership assess whether the UX, source-grounding, policy retrieval and escalation model are useful and safe in a real care-provider setting.
- Collect structured feedback from trusted users to inform future development decisions.

---

## 3. What the pilot is not allowed to do

The pilot must not be used for any of the following:

- Live operational decision-making of any kind.
- Care planning or care delivery guidance.
- Service-user-specific advice.
- Medication advice, dosage guidance, administration instructions or medication incident handling.
- Safeguarding threshold assessment, referral decisions or case guidance.
- HR disciplinary, grievance, payroll or case advice.
- Complaint-case handling involving named individuals.
- Replacement for managers, safeguarding leads, medication leads, HR, compliance leads, or any clinical or professional judgement.
- Uploading real service-user records, care plans, MAR charts, HR files, complaints, safeguarding case notes or named incident reports into the system under any circumstances.

---

## 4. User group

- **Size:** 3–5 trusted people only, nominated by Thumhara Centre leadership.
- **Nomination:** Users must be named and individually invited. No open registration.
- **Briefing:** Every user must receive pilot instructions before access is granted. Instructions must explain what WorkTwin is, what it can and cannot answer, and that they must not type names, service-user details or any confidential case information.
- **Feedback:** Structured feedback must be gathered from users after a defined period of use. Feedback is essential for assessing whether the pilot is performing safely and usefully before any wider access is considered.

---

## 5. Document policy scope

### Intended first staff-visible candidates

The following documents are the current candidates for staff-visible approval, subject to successful completion of individual approval and testing steps:

| Policy | Status |
|--------|--------|
| TC-POL-001 Thumhara Centre Visitor Sign-In and Identification Policy | Candidate — pending staff-visibility approval |
| TC-POL-002 Thumhara Centre Mobile Phone and Portable Device Use Policy | Candidate — pending staff-visibility approval |
| TC-POL-003 Thumhara Centre Confidentiality and Information Handling Policy | Candidate — pending staff-visibility approval |
| TC-POL-004 Thumhara Centre Infection Prevention and Basic Hygiene Policy | Candidate — pending staff-visibility approval |
| TC-POL-005 Thumhara Centre Professional Boundaries Policy | Candidate — pending testing and staff-visibility approval |

None of the above are staff-visible yet. Each requires a separate, deliberate governance decision.

### Not staff-visible — escalation-only or admin-test-only

The following subject areas must not be answered for staff. They are currently admin-test-only or escalation-only, and must remain so unless explicitly approved through a separate process:

- Medication (TC-POL-009)
- Safeguarding (TC-POL-010)
- Complaints (TC-POL-007)
- Accident and incident reporting (TC-POL-006)
- Raising concerns and speaking up (TC-POL-008)

High-risk queries in these areas must continue to return an escalation response only.

### 4S.97B decision — first staff-visible candidate set

**Date:** 2026-05-13

Following a review of current governance state, the first staff-visible candidate set for the Minimum Safe Thumhara Pilot is confirmed as:

| Policy | Current governance state | Staff visibility |
|--------|--------------------------|-----------------|
| TC-POL-001 Thumhara Centre Visitor Sign-In and Identification Policy | `approved_for_ai`, indexed, `real_document=true` | `false` — not yet enabled |
| TC-POL-002 Thumhara Centre Mobile Phone and Portable Device Use Policy | `approved_for_ai`, indexed, `real_document=true` | `false` — not yet enabled |
| TC-POL-003 Thumhara Centre Confidentiality and Information Handling Policy | `approved_for_ai`, indexed, `real_document=true` | `false` — not yet enabled |
| TC-POL-004 Thumhara Centre Infection Prevention and Basic Hygiene Policy | `approved_for_ai`, indexed, `real_document=true` | `false` — not yet enabled |

All four are currently Lane B — admin answer-debug approved only. Staff visibility (`approved_for_staff_visibility`) remains `false` for all four. This decision identifies them as the intended first candidates; it does not enable staff visibility, does not approve them for staff use, and does not make staff Ask live.

Staff-visible approval for each document must still be opened separately, deliberately and explicitly, following the technical gates in section 7.

**TC-POL-005 deferred.** At the time of this decision, TC-POL-005 Professional Boundaries has not completed the required governance and testing path (`real_document=false`, `dummy_document=true`, `governance_status=not_reviewed`, `embedding_status=pending`). It is excluded from the first candidate set until metadata correction, embedding, admin answer-debug testing, negative-control testing and documentation are complete.

**High-risk and specialist policies remain excluded.** TC-POL-006 (Accident and Incident Reporting), TC-POL-007 (Complaints), TC-POL-008 (Raising Concerns and Speaking Up), TC-POL-009 (Medication Support and Escalation) and TC-POL-010 (Safeguarding Adults Awareness and Escalation) are not candidates for staff visibility at this stage. They remain escalation-only or admin-test-only.

### 4S.97C proof — Staff Ask baseline blocks candidate documents before staff visibility

**Date:** 2026-05-13

Before opening any staff visibility gate, the staff-facing `/ask` endpoint was inspected and tested to confirm that TC-POL-001 to TC-POL-004 do not surface to staff while `status=draft` and `approved_for_staff_visibility=false`.

#### Code inspection

`/ask` routes through `_can_use_document_for_staff_ask()`, which composes `_can_show_document_to_staff()`. A document is eligible for staff Ask only if all of the following conditions are met simultaneously:

- `is_sensitive=false`
- `escalation_required=false`
- `contains_qcs_or_third_party_content` is not true
- `real_document=true`
- `dummy_document=false`
- `status=approved`
- `approved_for_staff_visibility=true`
- `approved_for_source_grounded_answers=true`
- `approved_for_embedding=true`
- `governance_reviewed_by` set
- `governance_reviewed_at` set
- `embedding_status=indexed`
- `access_roles` includes All Staff or the requesting user's role

If no eligible staff-visible source remains after filtering, `/ask` returns the safe fallback response. The response never returns `document_id`, `chunk_id`, `similarity`, `chunk_index`, governance flags or source preview to staff.

Because all four candidate documents currently have `status=draft` and `approved_for_staff_visibility=false`, none can pass the eligibility check.

#### Auth proof

On the standard local backend (port 8000, `PILOT_AUTH_MODE=true`), an unauthenticated `POST /ask` returned:

```
HTTP 401 — "Missing Authorization header."
```

Unauthenticated staff Ask access is blocked.

#### Baseline behaviour proof (temporary local test, port 8001)

A temporary second backend instance was run on port 8001 with process-only environment overrides (`PILOT_AUTH_MODE=false`, `PILOT_ORGANISATION_ID=thumhara-centre`, `PILOT_USER_ROLE=Care Worker`, `ALLOWED_ORGANISATION_IDS=demo-org,thumhara-centre`). No `.env` file, Git history, Render, Vercel or Supabase configuration was modified.

Four questions covering the candidate policy set were submitted before opening any staff visibility gate:

| # | Question | `allowed_to_answer` | `requires_escalation` | `source_count` | `risk_category` |
|---|----------|--------------------|-----------------------|----------------|-----------------|
| 1 | How should a visitor sign in at Thumhara Centre? | `false` | `true` | 0 | `standard` |
| 2 | Can staff use their personal phone during work? | `false` | `true` | 0 | `standard` |
| 3 | Can staff share confidential information with a family member if they ask for it? | `false` | `true` | 0 | `legal` |
| 4 | When should staff wash their hands? | `false` | `true` | 0 | `standard` |

All four returned `allowed_to_answer=false`, `requires_escalation=true` and `source_count=0`. The confidentiality question was correctly classified as `risk_category=legal`.

#### Verdict

**PASS.** TC-POL-001 to TC-POL-004 do not leak into staff-facing Ask while `status=draft` and `approved_for_staff_visibility=false`. Lane B / admin answer-debug approval is not sufficient for staff Ask eligibility. Staff visibility must still be opened separately, deliberately and policy-by-policy, after all technical gates in section 7 are satisfied.

Staff visibility is not enabled. The pilot is not live. Staff users cannot access these policies yet.

---

## 6. Safety and escalation rules

The following rules apply at all times during the pilot:

- High-risk topics (safeguarding, medication, HR, complaints, accident/incident, raising concerns) must refuse to provide procedural advice and must escalate to the appropriate human lead.
- The system must not generate a procedural answer for a high-risk query if the correct specialist source document is absent from the approved staff-visible corpus.
- Staff-facing Ask must use staff-visible documents only. Admin answer-debug approval (Lane B) is not equivalent to staff visibility and does not constitute permission for staff access.
- Staff visibility must be approved policy-by-policy, deliberately and explicitly. Approval for one document does not imply approval for any other.
- No governance gate may be opened speculatively or in bulk.

---

## 7. Technical gates required before staff access

The following technical conditions must be verified and proven before any trusted user is granted access:

- Staff authentication is working and correctly scoped to Thumhara Centre.
- Organisation membership and tenant scoping are proven — staff cannot access another organisation's documents or answers.
- Staff Ask uses only documents approved for staff visibility; admin-only (Lane B) documents do not appear in staff answers.
- Negative controls pass for all high-risk topic areas: medication, safeguarding, HR, complaints and accident/incident queries must return escalation responses, not procedural answers.
- No dummy documents, QCS-licensed documents or historical test documents leak into staff-visible answers.
- Staff-facing UI includes appropriate pilot safety wording that sets expectations clearly.
- Admin access remains restricted to authorised administrators only.
- The public admin proxy remains disabled unless a real authentication and RBAC boundary has been fully proven and independently reviewed.

---

## 8. Data protection and privacy boundaries

- No personal data, service-user data, HR case data, safeguarding case data or complaint case data may be entered into the system during the pilot.
- Staff must be explicitly instructed, before access, not to type names, service-user identifiers, dates of birth, addresses or any other information that could identify an individual.
- Audit logs should be metadata-only where possible. Raw query text should not be stored in logs unless there is a specific, reviewed justification. Where query text is stored, it must be treated with the same care as personal data.
- Any accidental entry of personal data must be treated as a pilot incident: it should be reported, reviewed and documented. Steps to prevent recurrence should be identified.
- Data handling during the pilot must be consistent with the organisation's data protection obligations under UK GDPR and the Data Protection Act 2018.

---

## 9. Pilot success criteria

The pilot will be considered successful if all of the following conditions are met at the end of the controlled test period:

- Trusted users can log in and use the system without technical barriers.
- Users understand what WorkTwin can and cannot answer, based on the pilot instructions provided.
- Low- and medium-risk policy questions receive useful, source-grounded answers that staff find relevant and practical.
- High-risk questions are refused or escalated clearly, with a clear pointer to the correct human route.
- Sources cited in answers are relevant to the question asked.
- Structured feedback has been collected from all participating users.
- No unsafe procedural advice has been given on high-risk topics.
- No personal data has been intentionally processed through the system.

---

## 10. Current readiness rating

| Area | Rating |
|------|--------|
| Admin answer-debug governance (Lane B) | Complete for TC-POL-001 to TC-POL-004 |
| High-risk specialist blocking (4S.96L) | Complete |
| Classifier and source-routing polish (4S.96N) | Complete |
| Staff-visible policy approval | Not started |
| Staff auth and organisation scoping proof | Not started |
| Staff Ask negative-control proof | Not started |
| Staff-facing UI pilot safety wording | Not started |
| Trusted-user instructions and feedback form | Not started |

**Current readiness for the Minimum Safe Thumhara Pilot: approximately 7/10.**

After staff-visible policy approval, staff Ask proof, and auth/org-scoping proof are complete, the target readiness is **8.5–9/10**.

This project is not production-ready. It is not a general-purpose SaaS product. It is a narrow, controlled pilot with a single trusted user group at a single care provider.

---

## 11. Next steps

| Slice | Description |
|-------|-------------|
| 4S.97B | Choose the first staff-visible policy set and open staff visibility gates policy-by-policy |
| 4S.97C | Prove that staff Ask uses only staff-visible documents and does not surface Lane B (admin-only) content |
| 4S.97D | Prove staff authentication and organisation scoping end-to-end |
| 4S.97E | Prepare trusted-user pilot instructions and a structured feedback form |

No step in this sequence may be skipped. Each step must be completed and documented before the next begins.

---

*This document records the agreed scope of the Minimum Safe Thumhara Pilot. It is an internal governance reference only. It does not constitute legal advice, regulatory approval or a data protection impact assessment. Formal review by Thumhara Centre leadership is required before any trusted user is granted access.*
