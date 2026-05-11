# WorkTwin Care Pilot — Policy Upload and AI Testing Tracker

## Current Status

| Item | Detail |
|------|--------|
| Phase | Internal testing only |
| Real staff use | None — no staff have access |
| Pending review | Shagufta review may occur later; not scheduled |
| Document visibility | Admin/testing only unless gates are deliberately enabled |
| Last updated | 2026-05-11 |
| PPE upload | Paused — PPE Policy PDF not yet available; will be requested from Shagufta |

Documents remain in testing state until all required gates are explicitly approved. Enabling a gate is a deliberate act — it does not happen automatically upon upload.

---

## Safety Rule — What Must Not Be Uploaded

Do not upload any of the following unless licence or use has been confirmed in writing:

- Service-user records, care plans, or risk assessments containing names
- MAR charts or medication records containing names
- Staff HR files, payroll data, or employment contracts
- Safeguarding case notes or investigation records
- Named complaints or formal complaint correspondence
- Confidential third-party content (e.g. QCS policies) unless licence permits embedding

When in doubt, assign lane **D** and escalate before uploading.

---

## QCS and Third-Party Content Restriction

**Recorded: 2026-05-07**

WorkTwin may use organisation-owned, original, commissioned, or properly licensed source material.

WorkTwin must not ingest, upload, embed, vectorise, answer-debug, or staff-serve QCS Documentation or any other third-party copyrighted compliance-library content unless explicit written permission exists for this specific AI/RAG use case.

Thumhara Centre has a QCS licence; however, WorkTwin must not use QCS Documentation in any AI/RAG workflow unless written permission confirms that the licence permits this specific use case. This is a content-source restriction, not a WorkTwin architecture failure.

**Blocked operations for QCS Documentation (until written permission is obtained):**

| Operation | Status |
|-----------|--------|
| Document upload (new QCS documents) | Blocked |
| Text extraction | Blocked |
| Chunking | Blocked |
| Embedding / vector-indexing | Blocked — existing QCS embeddings must not be expanded |
| Admin answer-debug | Blocked — existing QCS answer-debug access must not be expanded |
| Source-grounded staff answers | Blocked |
| Staff visibility | Blocked |
| Use in demo / pilot / production | Blocked |
| Derivative rewriting preserving protected third-party wording or structure | Blocked |

**Existing QCS documents in the registry (AC32, CC34, QQ03):** Their recorded database flag state is historical/current registry state only — no database flags are being changed in this docs-only record. Operationally, AC32, CC34, and QQ03 are blocked/frozen from further use in WorkTwin AI/RAG workflows from 2026-05-07. They must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission confirms the specific AI/RAG use case is permitted. A later data-governance cleanup slice should review whether the DB flags or embeddings need to be disabled, hidden, archived, or removed. See document notes and decision log entries dated 2026-05-07.

**Clean corpus direction:** Future demo and pilot documents must be clean-corpus documents — Thumhara-original documents, commissioned or internally produced content, organisation-owned procedures, or public guidance (e.g. CQC, NHS England, Skills for Care) where the licence explicitly permits the intended use, checked source-by-source, with attribution where required.

---

## Testing Lanes

Each policy document is assigned a lane before upload. The lane governs how it may be used in the AI system.

| Lane | Label | Meaning |
|------|-------|---------|
| **A** | Safe AI answer testing candidate | Suitable for AI-generated, source-grounded answers to staff questions |
| **B** | Admin-test only for now | Uploaded and indexed for testing purposes only; not yet approved for staff-visible answers |
| **C** | Human-only escalation policy | Policy exists in the system for context only; AI must escalate rather than answer |
| **D** | Do not upload | Contains personal data, restricted content, or unconfirmed licensed material |

A document may be promoted from B to A after successful quality testing and explicit gate approval. Lane C documents must never be promoted to A without governance sign-off.

---

## Gate Definitions

Each gate must be set deliberately. No gate is implied by upload alone.

| Gate Flag | Meaning |
|-----------|---------|
| `approved_for_embedding` | Document has been reviewed and is safe to embed as vectors |
| `approved_for_source_grounded_answers` | AI may cite this document when answering staff questions |
| `approved_for_staff_visibility` | Staff-facing answer UI may reference this document as a source |
| `governance_reviewed_by` | Name of reviewer who approved governance gates |
| `governance_reviewed_at` | Date governance review was completed |
| `embedding_status=indexed` | Embedding pipeline has processed this document successfully |

---

## Current Known Documents

Based on current registry proof as of 2026-05-06.

| Document | Lane | Indexed | Source-Grounded Approved | Staff-Visible | Notes |
|----------|------|---------|--------------------------|---------------|-------|
| Visitor Sign-In and Identification Procedure | **A** | Yes | Yes | Yes | Fully approved; first live lane A policy |
| AC32 Mobile Phone and Portable Device Use Policy | **A — controlled internal testing only** | Yes | Yes | Yes | BLOCKED (2026-05-07) — QCS content restriction applies; DB flag state is historical registry state only, no database flags changed in this docs-only record; must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission obtained; a later data-governance cleanup slice should review whether DB flags/embeddings need to be disabled, hidden, archived, or removed; see QCS and Third-party Content Restriction section |
| CC34 Infection Control Policy and Procedure | **B → A candidate** | Yes | Yes | No | BLOCKED (2026-05-07) — QCS content restriction applies; extended admin QA complete; not for staff visibility or further AI-RAG expansion until written permission obtained |
| CR100 Safeguarding Adults Policy and Procedure | **C** | — | No | No | Sensitive; AI must escalate all related questions to a person |
| PM11 Raising Concerns / Freedom to Speak Up / Whistleblowing | **C** | — | No | No | HR concern route; human-only; never AI-answerable |
| CR07 Data Protection and Confidentiality Policy and Procedure (English) | **B pending upload** | No | No | No | Useful for confidentiality, UK GDPR, data protection and staff responsibilities; admin-test only first because it touches legal/compliance/confidential information duties |
| CR07 Data Protection and Confidentiality Policy and Procedure (Urdu) | Pending multilingual review | No | No | No | Do not upload yet until bilingual/multilingual document strategy is agreed |
| QQ03 Complaints, Suggestions and Compliments Policy and Procedure | **B — admin answer-debug only** | Yes | Yes (admin/debug only) | No | BLOCKED (2026-05-07) — QCS content restriction applies; DB flag state is historical registry state only, no database flags changed in this docs-only record; must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission obtained; a later data-governance cleanup slice should review whether DB flags/embeddings need to be disabled, hidden, archived, or removed |
| Thumhara Centre Visitor Sign-In and Identification Policy (TC-POL-001) | **A candidate — draft upload only** | No | No | No | **Thumhara-original draft** — not QCS, not third-party content. Safe low-risk operational content. Draft only; not approved for live operational use until reviewed by Thumhara Centre leadership. No gates enabled. Embedding not yet triggered. Lane A candidate pending leadership review, embedding approval, and brief admin spot-check. |

### Gate Summary per Document

| Document | `approved_for_embedding` | `approved_for_source_grounded_answers` | `approved_for_staff_visibility` |
|----------|--------------------------|----------------------------------------|---------------------------------|
| Visitor Sign-In | Yes | Yes | Yes |
| AC32 Mobile Phone | Yes | Yes | Yes |
| CC34 Infection Control | Yes | Yes | No |
| CR100 Safeguarding | No | No | No |
| PM11 Whistleblowing | No | No | No |
| CR07 Data Protection and Confidentiality (English) | No | No | No |
| CR07 Data Protection and Confidentiality (Urdu) | No | No | No |
| QQ03 Complaints, Suggestions and Compliments | Yes | Yes (admin/debug only) | No |
| TC-POL-001 Visitor Sign-In and Identification Policy | No | No | No |

---

## Quality Testing Checklist

Run this checklist for each document promoted to lane A or B.

- [ ] Text extraction succeeded with no truncation or garbled characters
- [ ] Chunk count is sensible for the document length (not too few, not excessively fragmented)
- [ ] Embeddings were generated and stored without error
- [ ] Vector retrieval returns the correct policy for relevant test questions
- [ ] Answer-debug panel shows `confidence: source_grounded` (not `fallback` or `ungrounded`)
- [ ] Sources are cited visibly in the staff-facing answer
- [ ] Answer contains no unsupported claims beyond what the document states
- [ ] Answer handles high-risk topics (safeguarding, medication, complaints) by escalating to a person rather than answering
- [ ] Answer is written in plain English understandable to a care worker without specialist training
- [ ] Edge-case questions (e.g. "what if the policy doesn't cover my situation?") produce safe, appropriate responses

---

## Test Question Bank

Grouped by policy area. Use these during AI answer quality testing. Add new questions as they arise from real staff scenarios.

### Visitor and Access Control

1. What ID do I need to check before letting a visitor in?
2. What do I do if a visitor refuses to show ID?
3. Where do visitors sign in, and who is responsible for checking the log?
4. Can a family member visit without an appointment?
5. What happens if I am not sure whether someone is authorised to visit?

### Infection Control

6. What PPE do I need to wear when supporting a service user who is unwell?
7. What is the procedure if I suspect an outbreak in the home?
8. How often should I be cleaning high-touch surfaces?
9. What do I do if I have symptoms of infection before a shift?
10. Who is responsible for infection control audits?

### Mobile Phone and Device Use

11. Am I allowed to use my personal mobile phone on the floor?
12. Can I take photos or videos of service users if they give permission?
13. What should I do if I see a colleague using their phone inappropriately around a service user?
14. Are there areas where phone use is completely prohibited?
15. What is the policy on using a work-provided device for personal use?

### Safeguarding (Escalation Only — Lane C)

16. I am worried a service user is being harmed — who do I speak to? *(expected AI response: escalate to your designated safeguarding lead immediately; do not delay)*
17. A family member has asked me to keep something quiet — what should I do? *(expected AI response: escalate; you cannot agree to confidentiality in safeguarding situations)*

### Raising Concerns / Whistleblowing (Escalation Only — Lane C)

18. I want to raise a concern about a colleague's behaviour — what are my options? *(expected AI response: direct to manager or the raising concerns procedure; provide escalation contact)*
19. Can I raise a concern anonymously? *(expected AI response: escalate to HR or the designated person; AI cannot advise on this)*

### Data Protection and Confidentiality

20. What should staff do to keep service user information confidential?
21. Can staff discuss service user information with family members?
22. What should I do if I accidentally share confidential information with the wrong person?
23. Can I access a service user's record if I am not involved in their care?
24. What should I do if I think there has been a data breach?

> **Note:** Questions about data breaches, serious confidentiality incidents, or legal/compliance concerns must escalate to a manager or appropriate data protection lead and must not be answered freely by AI.

---

## AC32 Mini QA Findings — 2026-05-06

A mini QA set was run locally against `/ask` after AC32 was approved for controlled internal Thumhara Centre staff-style Ask testing. Overall score: **7.5 / 10**.

| # | Question | Result |
|---|----------|--------|
| 1 | Can staff use their mobile phone while working? | Pass |
| 2 | Can I use my personal phone to send a quick personal text during my shift? | Pass |
| 3 | Can staff use a mobile phone while driving for work? | Partial fail — escalated as a legal matter instead of giving an AC32 policy-guided answer |
| 4 | Can I take a photo or video of a service user if they say it is okay? | Partial fail — fallback response despite AC32 containing camera and voice-recording consent wording |
| 5 | Can I use my own phone for work if I have not been given a work phone? | Pass |
| 6 | What should I do if my work mobile phone or portable device is lost or stolen? | Pass |
| 7 | Can I use a tablet, smart watch, USB device or other portable device for work? | Pass |
| 8 | What security steps should staff follow when using a mobile phone or portable device for work? | Pass — answer was too long and appeared truncated |

### Conclusion

Historical controlled internal staff-style Ask testing was completed before 2026-05-07 (mini QA results above). **BLOCKED from 2026-05-07:** AC32 is now frozen. QCS content restriction applies — AC32 must not be used for further staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission confirms that the QCS licence permits this specific AI/RAG use case (extracting policy text, storing in WorkTwin/Supabase, vector search, and AI-generated staff answers outside the QCS platform). Thumhara Centre has a QCS licence; however, written permission for this specific AI/RAG use case has not been obtained. See QCS and Third-Party Content Restriction section.

**Follow-up (data-governance cleanup slice):** Review whether existing QCS-derived database flags or embeddings for AC32, CC34, and QQ03 need to be disabled, hidden, archived, or removed. This must be handled in a dedicated controlled data-governance cleanup slice — no database flags are changed in this docs-only record.

### Follow-Up Actions

- Improve policy-guided handling for mobile-phone-while-driving questions so AC32 wording can be applied safely instead of defaulting to blanket legal escalation.
- Improve handling for photo, video, and voice-recording consent questions so the system gives a policy-guided answer or escalation based on AC32 rather than a generic fallback.
- Tighten long security-step answers to avoid overly broad or truncated output.
- Re-test AC32 after answer responsibility model, prompt, and routing improvements have been made.

---

## QQ03 Upload and Vector Retrieval Findings — 2026-05-06

QQ03 Complaints, Suggestions and Compliments Policy and Procedure was uploaded through the direct local backend route for controlled internal admin-only testing.

### Upload and Extraction Summary

| Field | Value |
|-------|-------|
| document_id | `dff29050-2dbf-45d4-b413-c81c1e165f4d` |
| HTTP status | 200 |
| upload_status | success |
| extraction_status | success |
| extracted_page_count | 20 |
| extracted_character_count | 55,813 |
| chunk_count | 54 |
| embedding_record_count | 54 |
| personal_data_risk | low |
| personal_data_warnings | none |
| extraction_warnings | none |

### Governance State

| Field | Value |
|-------|-------|
| real_document | true |
| dummy_document | false |
| governance_status | pilot_approved |
| approved_for_embedding | Yes |
| approved_for_source_grounded_answers | No |
| approved_for_staff_visibility | No |
| governance_reviewed_by | Inaam Basit |
| governance_reviewed_at | 2026-05-06T19:12:36 UTC |
| source_owner | Quality Compliance Systems / Thumhara Centre licensed policy |
| source_licence_notes | Thumhara Centre has a QCS licence; BLOCKED (2026-05-07) — written permission required to confirm this specific AI/RAG use case is permitted before any further ingestion, expansion, or staff serving |

### Embedding and Indexing Summary

Embeddings were generated in batches. Final embedding-readiness state:

| Field | Value |
|-------|-------|
| chunk_count | 54 |
| embedding_record_count | 54 |
| not_started_count | 0 |
| embedded_count | 54 |
| failed_count | 0 |
| is_ready_for_vector_search | true |
| is_ready_for_ai_answers | false |

All 54 chunks were embedded successfully with no failures.

### Vector Retrieval QA

Three admin-only vector searches were run after indexing was confirmed complete.

| # | Question | Result |
|---|----------|--------|
| 1 | What should staff do when receiving a complaint? | Pass |
| 2 | What should happen if a complaint suggests possible abuse or safeguarding concerns? | Pass |
| 3 | Can complaints be shared for learning and improvement? | Pass |

**Quality notes:**

- Retrieval returned QQ03 chunks correctly across all three searches.
- Complaint-handling steps were retrieved as expected.
- Safeguarding-related complaint wording was retrieved, including that safeguarding policies, local authority, and regulatory notifications should be followed where complaints indicate potential abuse.
- Learning and improvement wording was retrieved, including anonymisation for learning, trend tracking, annual reporting, and quality improvement.
- At this earlier vector-retrieval checkpoint, AI answers remained disabled (`approved_for_source_grounded_answers: false`).
- Staff visibility remains disabled (`approved_for_staff_visibility: false`).

### Conclusion

At this checkpoint, QQ03 remained **Lane B — admin-test only**. All 54 chunks were indexed and vector retrieval QA passed. Because complaints can involve safeguarding, named individuals, legal/compliance matters, or disciplinary issues, the next step required a deliberate governance review before any source-grounded answer-debug testing. Staff visibility remained disabled.

---

## QQ03 Admin-Only Answer-Debug Testing — 2026-05-06

After QQ03 was approved for source-grounded admin answer-debug only (`approved_for_source_grounded_answers=true`, `approved_for_staff_visibility=false`), a controlled internal admin-only answer-debug test was run. Staff visibility remained disabled throughout. The staff-facing `/ask` endpoint did not use QQ03.

### Governance State at Time of Test

| Field | Value |
|-------|-------|
| document_id | `dff29050-2dbf-45d4-b413-c81c1e165f4d` |
| approved_for_source_grounded_answers | Yes (admin/debug only) |
| approved_for_staff_visibility | No |

### Answer-Debug Test Questions and Results

| # | Question | Result |
|---|----------|--------|
| 1 | What should staff do when receiving a complaint? | Pass (with caution — see below) |
| 2 | What should happen if a complaint suggests possible abuse or safeguarding concerns? | Pass |
| 3 | Can complaints be shared for learning and improvement? | Pass |

### Overall Result: PASS with caution

**Pass criteria met:**

- All three responses were source-grounded to QQ03 sources only.
- Sources were cited in each response.
- Endpoint note confirmed staff AI answers are still disabled.

**Notable quality:**

- Safeguarding-related complaint answer correctly included safeguarding, local authority, and regulatory notification direction and escalation wording.
- Learning/improvement answer correctly mentioned anonymisation and quality improvement.

**Caution:** The general complaint-handling question (question 1) produced a useful and grounded answer but appended a sensitive-topic escalation note that was slightly over-cautious.

### Staff-Facing Safety Proof

A local `/ask` query — "What should I do if someone makes a complaint?" — returned `no sources`, `allowed_to_answer=false`, `requires_escalation=true`, `risk_category=hr`. This confirms QQ03 was not exposed to staff. The routing is safe; complaints-routing improvement can be considered as a separate future slice.

### Conclusion

QQ03 remains **Lane B — admin answer-debug only**. It is not approved for staff use and must not be represented as such. Do not promote to staff visibility without dedicated governance review.

---

## CC34 Extended Admin-Only QA — 2026-05-06

After CC34 Infection Control Policy and Procedure was approved for source-grounded admin answer-debug only (`approved_for_source_grounded_answers=true`, `approved_for_staff_visibility=false`), an extended controlled internal admin-only answer-debug test was run across eight questions. Staff visibility remained disabled throughout. Governance-readiness confirmed CC34 remained not staff-visible (`approved_for_staff_visibility=false`, `can_show_to_staff_now=false`). No staff-facing `/ask` promotion or staff-visibility test was run in this slice.

### Governance State at Time of Test

| Field | Value |
|-------|-------|
| document_id | `c8a9e7d0-2448-47fe-a3a0-6dcf342f6235` |
| approved_for_source_grounded_answers | Yes (admin/debug only) |
| approved_for_staff_visibility | No |

### Answer-Debug Test Questions and Results

| # | Question | Result |
|---|----------|--------|
| 1 | When should staff wash their hands? | Pass |
| 2 | What PPE should staff use when supporting someone with personal care? | Pass with caution |
| 3 | What should staff do if a service user has diarrhoea or vomiting? | Pass with caution |
| 4 | What should staff do if they think there is an infection outbreak? | Pass with caution |
| 5 | How should staff clean high-touch surfaces? | Pass |
| 6 | What should staff do if they have symptoms of infection before a shift? | Pass |
| 7 | Who is responsible for infection control audits? | Partial Pass |
| 8 | Can staff come to work if they feel unwell but symptoms are mild? | Pass with caution |

### Quality Notes

- Answers were source-grounded to CC34.
- Hand hygiene and high-touch surface cleaning answers were strong.
- PPE answer was useful but points to the separate PPE policy — the PPE PDF is still needed before relying on PPE-specific staff answers.
- Diarrhoea/vomiting and outbreak answers were useful, but should have clearer escalation wording before any staff-facing release.
- Audit responsibility answer should mention both the Infection Prevention Lead for audit programme responsibilities and the Registered Manager for cleaning schedule oversight/countersigning where relevant.
- Mild illness answer was safe but should advise staff to contact their line manager or Thumhara Centre if unsure before attending work.

### Conclusion

CC34 remains **Lane B → A candidate**. Admin answer-debug approved only. Do not approve staff visibility yet.

**Follow-up required:**

- Tighten escalation wording for outbreak and diarrhoea/vomiting scenarios.
- Improve audit responsibility answer to cover both the Infection Prevention Lead and the Registered Manager roles clearly.
- Upload and review the PPE Policy when Shagufta provides the PDF — CC34 answers that reference PPE cannot be fully relied upon until the companion policy is available.

---

## TC-POL-001 Controlled Upload — 2026-05-11

TC-POL-001 Thumhara Centre Visitor Sign-In and Identification Policy was uploaded through the local authenticated admin proxy for controlled WorkTwin testing only. This is an original Thumhara Centre-owned draft — it is not QCS content and not sourced from any third-party policy library. No third-party content restriction applies.

### Upload Details

| Field | Value |
|-------|-------|
| Document code | TC-POL-001 |
| Document ID | `42d7b206-b85f-46a5-b0f2-1c3b6ff87ca3` |
| Title | Thumhara Centre Visitor Sign-In and Identification Policy |
| File | `TC-POL-001-visitor-sign-in-and-identification-policy-draft-v0.1.pdf` |
| Storage key | `thumhara-centre/documents/42d7b206-b85f-46a5-b0f2-1c3b6ff87ca3/TC-POL-001-visitor-sign-in-and-identification-policy-draft-v0.1.pdf` |
| Organisation | thumhara-centre |
| Category | Visitor Management |
| Vertical | care |
| Status | draft |
| Sensitive | false |
| Escalation required | false |
| chunk_count (upload response) | 14 |
| embedding_record_count (upload response) | 14 |
| chunking_status | prepared |
| embedding_status | pending |

### Tenant and Organisation Proof

| Check | Result |
|-------|--------|
| IS_THUMHARA | true |
| IS_DEMO_ORG | false |
| STORAGE_IS_THUMHARA_PREFIX | true |
| LIST_ORGS | thumhara-centre |
| LIST_HAS_DEMO_ORG | false |

### Governance State at Upload

All AI and visibility gates are disabled. No gate has been deliberately enabled. No embedding has been triggered.

| Gate | State |
|------|-------|
| `approved_for_embedding` | false |
| `approved_for_ai_answers` | false |
| `approved_for_source_grounded_answers` | false |
| `approved_for_staff_visibility` | false |

### Content Source

TC-POL-001 contains original Thumhara Centre-owned draft wording. It is not QCS content, not a third-party policy library document, and is not subject to any licence restriction. It is a clean-corpus Thumhara-original document per the clean-corpus direction established 2026-05-07.

### Conclusion and Lane Assignment

TC-POL-001 is a **Lane A candidate**. It covers the same low-sensitivity Visitor Management subject area as the existing Visitor Sign-In and Identification Procedure but is TC-POL-001's own original Thumhara draft wording.

**Must not be used as live operational policy until Thumhara Centre leadership has reviewed and approved the draft content.**

Before any AI-answer or staff-visibility use:

1. Thumhara Centre leadership must review and approve the draft policy content.
2. `approved_for_embedding` must be deliberately enabled.
3. The embedding pipeline must complete successfully.
4. A brief admin answer-debug spot-check must be run (shorter than the full QCS-era QA process, as TC-POL-001 is clean-corpus Thumhara-original content and Lane A subject matter).

---

## Policy QA Routing Backlog — 2026-05-06

### AC32 — Mobile Phone and Portable Device Use Policy

- Historical controlled internal staff-style testing was completed before 2026-05-07. **AC32 is now blocked/frozen** from further staff-style Ask, staff-visible answers, answer-debug expansion, or any AI/RAG use until written permission is obtained (see QCS and Third-Party Content Restriction section).
- Mini QA overall result: **PASS with issues** (historical, completed before 2026-05-07 content restriction was formally recorded).
- Mobile-phone-while-driving question over-escalated as a legal matter; AC32 contains policy-guided driving wording that should have been applied.
- Photo/video/voice-recording consent question fell back to a generic response; AC32 contains relevant consent, camera, and recording wording.
- Some security-step answers were useful but too long and risked truncation.
- Follow-up required: improve routing, prompt, and answer responsibility handling before wider rollout.

### QQ03 — Complaints, Suggestions and Compliments Policy and Procedure

- Remains **Lane B — admin answer-debug only**. Not approved for staff visibility.
- Admin-only answer-debug result: **PASS with caution**.
- General complaint-handling answer was useful and source-grounded but slightly over-cautious — it appended a sensitive-topic escalation note that was not required.
- Staff-facing `/ask` did not expose QQ03 — correct behaviour confirmed.
- Staff-facing `/ask` routed a general complaints question as HR — safe, but not precise.
- Follow-up: consider a separate complaints/care-complaints routing slice in a later iteration.
- Do not approve QQ03 for staff visibility.

### Next-Document Decision

- Do not upload another document without a deliberate content review.
- PPE upload remains paused — PDF not yet received from Shagufta.
- CC34 extended QA has now been completed; follow-up work is to tighten outbreak/diarrhoea-vomiting escalation wording, improve audit-responsibility wording, and wait for the PPE PDF before any staff-visibility decision.
- CR07 remains parked — English DOCX must be exported to PDF, and a data-protection escalation strategy must be agreed before upload.
- Urdu/multilingual documents remain parked — no upload until a multilingual strategy is agreed.

---

## Policy Testing Scope Decision — 2026-05-06

The heavy QA process used to date — upload, vector retrieval check, admin answer-debug, routing verification, staff-visibility gate decision — was designed to prove the governance model, the answer-debug flow, the staff-visibility boundary, and the quality of source-grounded answers. That proof is now substantially complete.

Not every policy needs to go through the same depth of QA. Future documents should be classified into a lane before upload or testing begins.

**Lane summary for upload decisions:**

| Lane | Approach |
|------|----------|
| **A** | Shorter QA process — extraction check, basic retrieval spot-check, and a small answer-debug set sufficient |
| **B** | Full admin answer-debug and escalation/routing checks required before any staff-visibility decision |
| **C** | Human-only; may be uploaded for context indexing but must never be made AI-answerable |
| **D** | Do not upload |

**Current representative evidence set:**

| Document | Role in Evidence Set |
|----------|----------------------|
| Visitor Sign-In | Simple Lane A proof — extraction, indexing, and staff-visible answer confirmed |
| AC32 Mobile Phone | Controlled staff-visible operational policy proof — QA completed, routing gaps identified |
| CC34 Infection Control | B → A candidate — admin QA complete; not staff-visible yet; PPE companion still needed |
| QQ03 Complaints | Admin answer-debug only — routing and escalation behaviour confirmed; staff visibility disabled |
| PPE Policy | Practical operational candidate — paused until PDF arrives from Shagufta |
| CR07 Data Protection | Parked — requires PDF export and a deliberate data-protection escalation strategy before upload |
| Health & Safety / Incident Reporting | One future document in this area may be sufficient to prove another practical workflow pattern |

**Conclusion:** The immediate goal is to prove a representative evidence set, not to upload the whole policy library. Process documents selectively. Do not upload or deeply QA a policy unless it supports a clear product, governance, demo, or pilot-readiness purpose.

---

## Recommended Next Upload Batch

The following document types are recommended for the next testing cycle, subject to availability and content review before upload.

| Document | Recommended Lane | Reason |
|----------|-----------------|--------|
| PPE Policy | A/B candidate — pending receipt from Shagufta | Practical daily-use information; low sensitivity — PDF not yet available |
| Incident Reporting Procedure | B | Useful for staff, but test carefully for escalation triggers |
| QQ03 Complaints, Suggestions and Compliments Policy and Procedure | B — admin answer-debug only (uploaded) | Uploaded, extracted, fully indexed, vector retrieval QA passed, and admin-only answer-debug passed with caution; not pending upload — do not re-upload; do not approve for staff visibility. |
| Visitor and Contractor Access (if separate from current) | A candidate | Companion to existing visitor policy |
| Health and Safety General Policy | B | Broad scope; chunk quality will need careful checking |
| Infection Control companion documents | B | Companion to CC34; check for overlap and duplication |
| CR07 Data Protection and Confidentiality Policy and Procedure (English) | B — PDF export required | Useful for confidentiality and data protection questions; needs careful escalation handling for breaches, incidents, or legal/compliance concerns |
| CR07 Data Protection and Confidentiality Policy and Procedure (Urdu) | Do not upload yet | Multilingual strategy required before upload |

Do not upload named complaint records, incident records with service-user names, or HR disciplinary files as part of this batch.

---

## Policies to Avoid or Keep Human-Only

The following policy areas must not be AI-answerable. Assign lane C or D.

- Safeguarding (all types: adults, children, domestic abuse)
- Medication incidents and administration errors
- HR disciplinary and grievance procedures
- Whistleblowing and raising concerns
- Wellbeing and mental health crisis response
- Legal complaints and formal legal correspondence
- Named service-user documents of any kind
- Named staff documents of any kind

---

## Decision Log

Use this template to record each policy decision. Add a new row each time a document is uploaded, promoted, demoted, or reviewed.

| Date | Policy | Lane | Reviewer | Reason | Flags Approved | Test Result | Follow-Up Action |
|------|--------|------|----------|--------|----------------|-------------|-----------------|
| 2026-05-06 | Visitor Sign-In and Identification Procedure | A | Internal | First lane A proof; low sensitivity; extraction and QA passed | `approved_for_embedding`, `approved_for_source_grounded_answers`, `approved_for_staff_visibility` | Pass | None outstanding |
| 2026-05-06 | AC32 Mobile Phone and Portable Device Use Policy | B | Internal | Thumhara Centre has a QCS licence; AI/RAG use case confirmation required before wider production deployment | `approved_for_embedding`, `approved_for_source_grounded_answers` | Pass (quality testing) | Confirm the licence permits this specific AI/RAG use case before wider production deployment |
| 2026-05-06 | AC32 Mobile Phone and Portable Device Use Policy | A — controlled internal testing only | Inaam Basit | Historical pre-2026-05-07 decision: low-sensitivity operational staff policy; status approved and staff visibility governance approved for controlled internal staff-style Ask testing only at the time. Superseded by 2026-05-07 QCS content restriction; AC32 is now blocked/frozen from further WorkTwin AI/RAG use unless written permission is obtained. | `approved_for_embedding`, `approved_for_source_grounded_answers`, `approved_for_staff_visibility` | Pass — local and live Ask returned source-grounded AC32 answer | Confirm the licence permits this specific AI/RAG use case before wider production deployment |
| 2026-05-06 | CC34 Infection Control Policy and Procedure | B | Internal | Answer quality good; additional test questions needed | `approved_for_embedding`, `approved_for_source_grounded_answers` | Pass (initial) | Run extended question bank before promotion to A |
| 2026-05-06 | CR100 Safeguarding Adults Policy and Procedure | C | Internal | Sensitive by nature; never AI-answerable | None | Not applicable | Review escalation wording in AI system |
| 2026-05-06 | PM11 Raising Concerns / Whistleblowing | C | Internal | HR concern route; human-only | None | Not applicable | Ensure escalation route is clear in UI |
| 2026-05-06 | PPE Policy | Pending | Internal | Companion policy referenced by CC34 but PDF not yet available | None | Not started | Request PDF from Shagufta |
| 2026-05-06 | CR07 Data Protection and Confidentiality Policy and Procedure (English) | B pending upload | Internal | Useful policy candidate, but only DOCX uploaded so far and PDF export is required before backend upload | None | Not started | Export English DOCX to PDF before upload |
| 2026-05-06 | CR07 Data Protection and Confidentiality Policy and Procedure (Urdu) | Pending multilingual review | Internal | Uploaded for awareness only; multilingual strategy not yet agreed | None | Not started | Do not upload until bilingual/trilingual approach is agreed |
| 2026-05-06 | AC32 Mobile Phone and Portable Device Use Policy | A — controlled internal testing only | Internal QA | Mini QA completed across 8 realistic mobile-phone/portable-device questions | No new flags changed | Pass with issues — 6 pass, 2 partial fail, 1 answer too long/truncated | Keep controlled testing only; improve driving/photo-video routing and long-answer control before wider rollout |
| 2026-05-06 | QQ03 Complaints, Suggestions and Compliments Policy and Procedure | B — admin-test only | Inaam Basit | Uploaded, extracted, fully indexed and vector retrieval QA passed, but complaints can involve safeguarding, named people, legal/compliance or disciplinary issues | `approved_for_embedding` | Pass — 54/54 chunks embedded; 3/3 vector retrieval checks passed | Keep AI answers and staff visibility disabled; only consider answer-debug after deliberate governance review and escalation/routing checks |
| 2026-05-06 | QQ03 Complaints, Suggestions and Compliments Policy and Procedure | B — admin answer-debug only | Inaam Basit | Approved for source-grounded admin answer-debug only after retrieval QA passed; staff visibility remains disabled | `approved_for_source_grounded_answers` (admin/debug only) | Pass with caution — 3/3 answer-debug questions passed; all responses source-grounded to QQ03 only, sources cited, staff answers confirmed disabled; safeguarding escalation wording correct; learning/improvement anonymisation wording correct; Q1 slightly over-cautious with sensitive-topic note; local /ask confirmed QQ03 not exposed to staff | Keep staff visibility disabled; do not imply staff approval; consider complaints-routing improvement as a separate slice |
| 2026-05-07 | AC32 Mobile Phone and Portable Device Use Policy | BLOCKED — QCS content restriction | Inaam Basit | Content-source review established that WorkTwin must not use QCS Documentation in any AI/RAG workflow unless written permission confirms the licence permits this specific use case. AC32 is QCS-licensed content. DB flag state is historical registry state only; no database flags changed in this docs-only record. Must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission obtained. A later data-governance cleanup slice should review whether DB flags/embeddings need to be disabled, hidden, archived, or removed. | No flags changed | N/A — restriction recorded; no new testing | Obtain written permission from QCS / legal confirming AI/RAG use case is permitted before any further use |
| 2026-05-07 | CC34 Infection Control Policy and Procedure | BLOCKED — QCS content restriction | Inaam Basit | CC34 is QCS-licensed content. QCS content restriction applies. Extended admin QA previously completed; not for staff visibility or further AI-RAG expansion until written permission obtained. DB flag state is historical registry state only; no database flags changed in this docs-only record. Must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission obtained. A later data-governance cleanup slice should review whether DB flags/embeddings need to be disabled, hidden, archived, or removed. | No flags changed | N/A — restriction recorded | Obtain written permission from QCS / legal confirming AI/RAG use case is permitted before any further use |
| 2026-05-07 | QQ03 Complaints, Suggestions and Compliments Policy and Procedure | BLOCKED — QCS content restriction | Inaam Basit | QQ03 is QCS-licensed content. QCS content restriction applies. DB flag state is historical registry state only; no database flags changed in this docs-only record. Must not be used for staff-style Ask, staff-visible answers, answer-debug expansion, embedding expansion, demo, pilot, or production use unless written permission obtained. A later data-governance cleanup slice should review whether DB flags/embeddings need to be disabled, hidden, archived, or removed. | No flags changed | N/A — restriction recorded | Obtain written permission from QCS / legal confirming AI/RAG use case is permitted before any further use |
| 2026-05-11 | TC-POL-001 Thumhara Centre Visitor Sign-In and Identification Policy | A candidate — draft upload only | Internal | Original Thumhara-owned draft; not QCS; not third-party. Safe low-risk operational content. Draft only — not approved for live operational use until reviewed by Thumhara Centre leadership. Uploaded via local authenticated admin proxy; organisation and tenant scoping confirmed (IS_THUMHARA=true, IS_DEMO_ORG=false). | No flags enabled | Upload confirmed — 14 chunks prepared, embedding pending | Enable `approved_for_embedding` and trigger embedding pipeline after leadership review of draft content; run brief admin answer-debug spot-check before any staff-visibility decision |

---

*This tracker is for internal testing purposes only. It is not a live governance record. Governance review by Shagufta or another authorised reviewer is required before any document is considered approved for wider pilot use.*
