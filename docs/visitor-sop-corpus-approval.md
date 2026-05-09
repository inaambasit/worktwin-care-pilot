# Visitor Sign-In SOP - Clean-Corpus Approval Record

> **Internal governance record -- not legal advice.**
> A completed template does not automatically approve staff visibility or AI answers. Normal WorkTwin
> governance gates (lane classification, sensitive-topic review, admin approval in the document
> registry) still apply.
>
> WorkTwin may use organisation-owned, original, commissioned, or properly licensed source material.
> WorkTwin must not use QCS Documentation or third-party copyrighted compliance-library content
> unless explicit written permission exists for this specific AI/RAG use case.
>
> This record confirms that the Visitor Sign-In and Identification Procedure is not QCS-derived and
> is the first confirmed clean-corpus document approved for controlled internal demo use.

---

## 1. Document Identity

| Field | Value |
|---|---|
| Document title | Visitor Sign-In and Identification Procedure |
| Version | Demo v1 |
| Date created | 2026-05-06 |
| Date approved for WorkTwin review | 2026-05-06 |
| Document owner | WorkTwin (demo-safe record for Thumhara Centre pilot) |
| Author / creator | WorkTwin / Inaam Basit |
| Intended WorkTwin use case | Staff policy Q&A (Ask WorkTwin); policy library display; controlled stakeholder demonstration |
| Organisation / service area | Thumhara Centre -- domiciliary and residential care |

---

## 2. Source and Ownership Check

### 2a. Origin

- [x] Thumhara-original document -- written in-house with no material copied or adapted from a
      third-party template

> **Note:** The Visitor Sign-In and Identification Procedure used in the WorkTwin pilot is a
> demo-safe operational SOP record. It was prepared specifically for the WorkTwin controlled pilot
> and covers visitor sign-in, ID checking, and access control. It is not derived from QCS
> Documentation or any other third-party compliance-library template. It does not contain personal
> data about named individuals.

### 2b. Third-party content

- Does this document include any third-party material (in full, summarised, or adapted)?
  - [x] No

- Does this document include any QCS Documentation?
  - [x] No

### 2c. Derivation declaration

- [x] I confirm this document is **not** copied, lightly reworded, adapted from, or structurally
      derived from QCS Documentation or any other copyrighted compliance-library template.

**Written permission reference:** Not applicable -- document is not QCS-derived or third-party-derived.

---

## 3. Third-Party and Public-Source Register

No third-party or public sources are used in this document.

| Source name | URL / reference | Licence / terms checked | Attribution required? | How source was used | Text copied, summarised, or referenced only? | Approved for WorkTwin use? | Notes |
|---|---|---|---|---|---|---|---|
| None | N/A | N/A | N/A | N/A | N/A | N/A | Document is Thumhara-original / WorkTwin-produced |

---

## 4. WorkTwin Permission Approval

| Permitted use | Decision | Notes |
|---|---|---|
| Upload to WorkTwin | Approved | Uploaded 2026-05-06 |
| Text extraction | Approved | Extracted 2026-05-06 |
| Storage in WorkTwin / Supabase | Approved | Stored in document registry; no personal data |
| Chunking | Approved | Chunked and indexed 2026-05-06 |
| Embedding and vector search | Approved | Indexed (pgvector); embedding_status = indexed |
| Admin vector search | Approved | Admin-only vector search approved |
| Admin answer-debug | Approved | Admin answer-debug approved |
| Staff visibility | Approved | Lane A; approved_for_staff_visibility = true |
| Source-grounded staff answers | Approved | approved_for_source_grounded_answers = true; Lane A |
| Onboarding journey use | Approved | May be referenced in onboarding content |
| Scenario / practice use | Approved | May be referenced in practice scenarios |
| Demo use | Approved -- controlled internal demo only | Safe for controlled stakeholder demonstration; Visitor SOP is the only document approved for demo |
| Internal pilot use | Approved -- controlled only | Not approved for unsupervised real staff use; requires auth, DPA, and pilot sign-off before real pilot |
| Production use | Denied -- blocked pending DPA and pilot sign-off | Not approved for production; DPA with Thumhara Centre, pilot governance sign-off, and final controlled pilot sign-off required before production |

---

## 5. Risk and Governance Classification

| Field | Value |
|---|---|
| Lane classification | Lane A |
| Sensitive? | No -- visitor access and ID checking; no personal data about staff, residents, or service users |
| Escalation required? | No |
| Staff-visible candidate? | Yes |
| Source-grounded answer candidate? | Yes |
| Human-only topic? | No |
| Role restrictions | All staff |
| Review / expiry date | Review before production pilot begins |
| Notes | First confirmed clean-corpus document; used as the Lane A baseline proof for the WorkTwin governance pipeline |

**Lane guidance:**

| Lane | Typical profile |
|---|---|
| A | Non-sensitive operational content; no personal data; low escalation risk |
| B | Procedural content; moderate sensitivity; standard review |
| C | Content touching safeguarding, medication, incidents, HR, legal, or wellbeing |
| D | High-risk; human-only; not eligible for AI answers |

---

## 6. Prohibited Use Declaration

> **This document is clean-corpus and does not contain QCS Documentation or third-party copyrighted
> compliance-library content. The restrictions in the WorkTwin QCS content restriction (current-state.md
> Section 12) do not apply to this document.**

The person completing this template confirms:

- [x] The source and ownership check in Section 2 has been completed honestly and to the best of
      their knowledge.
- [x] No third-party sources are used; Section 3 records "None".
- [x] This document does not contain QCS Documentation or copyrighted compliance-library content.
- [x] This template is an internal governance record, not legal advice. When in doubt, seek legal
      or professional guidance before proceeding.

---

## 7. Approval Sign-Off

| Field | Value |
|---|---|
| Prepared by | Inaam Basit |
| Reviewed by | Inaam Basit |
| Approved by | Inaam Basit |
| Approval date | 2026-05-09 |
| Approval scope | Controlled internal demo and pilot prototype use only; as per Section 4 above |
| Conditions / limitations | Not approved for production use until DPA with Thumhara Centre is in place, pilot governance sign-off is complete, and final controlled pilot sign-off is obtained. No real staff, service-user, or personal data. Auth must be activated before any real staff use. |
| Next review date | Before production pilot begins |

---

## 8. WorkTwin Ingestion Record

| Field | Value |
|---|---|
| Uploaded? | Yes |
| Document ID | Assigned by WorkTwin registry at upload (2026-05-06) |
| Embedding status | Complete -- indexed (pgvector; text-embedding-3-small, 1536 dims) |
| Governance flags set | approved_for_embedding = true; approved_for_source_grounded_answers = true; approved_for_staff_visibility = true |
| Staff visibility enabled? | Yes |
| AI answers enabled? | Yes -- source-grounded, Lane A |
| Reviewer | Inaam Basit |
| Date | 2026-05-09 |
| Notes | First clean Lane A proof. Baseline for WorkTwin governed RAG pipeline testing. Used in all controlled internal demo and stakeholder walkthrough sessions. Not QCS-derived. DB flags represent a genuinely approved continuing state (unlike AC32, CC34, QQ03 whose flags are historical/current registry state only). |
