# WorkTwin Care Pilot

A privacy-first AI onboarding, policy and learning assistant for regulated SMEs, starting with care providers.

## Platform and vertical strategy

WorkTwin is the core platform: a privacy-first AI work, onboarding, policy, workflow and learning companion for employees in regulated SMEs.

WorkTwin Care Pilot is the first vertical test of that platform. The care version adapts the core WorkTwin model to UK care provider workflows, language, escalation routes and training scenarios.

Thumhara Centre and care providers are being used to test the first version because care teams have high policy load, high compliance pressure, repeated operational questions and a strong need for safe human escalation.

Future verticals may include financial advice firms, property management companies, recruitment agencies, healthcare admin providers, training providers and other regulated service SMEs.

The product boundary stays the same across verticals: private employee support, source-cited answers from approved documents, and anonymised employer insights only.

## First product promise

Turn your staff handbook, policies, SOPs and onboarding documents into a private AI assistant that helps employees:

- understand company policies
- follow procedures
- onboard faster
- practise realistic scenarios
- build role confidence
- ask questions safely

The employer sees anonymised trends, not private employee conversations.

## First niche

Care providers with 20–250 staff.

## First pilot offer

"We’ll build a private AI staff assistant around your care policies and onboarding documents in 14 days."

Suggested pilot:
- £1,500–£3,000 setup
- £500–£1,000 per month
- 60–90 day pilot
- up to 25–50 users
- 10–30 approved company documents

## MVP modules

1. Employee chat assistant
2. Company document upload
3. Source-cited answers
4. Role-based access
5. Escalation-safe answers
6. Micro-learning quizzes
7. Scenario practice
8. Private development notes
9. Anonymous employer insights
10. Audit logs

## Build approach

Start with a clickable demo and customer discovery before overbuilding.

Then build a real MVP using:

- Next.js frontend
- FastAPI backend
- PostgreSQL + pgvector
- Supabase or AWS storage
- OpenAI or Claude API
- Role-based access control
- Source-cited RAG answers

---

## Milestone 4A: Document Registry

### What was built

**Policy Library (`/policies`)** — Staff-facing page showing only approved documents. Staff can search, filter by category, open a policy detail card, and see a "Ask WorkTwin about this policy" CTA. Only approved documents appear here.

**Document Registry (`/admin/documents`)** — Admin power-user view of all documents across all statuses. Shows the full metadata schema including vertical, category, status, role access, sensitive flag, escalation flag, AI-approved flag, primary and available languages, review due date, and embedding status. Admins can approve draft/under-review documents or archive any document.

**Backend document registry (`GET|POST /documents`, `GET|PATCH /documents/{id}`, `POST /documents/{id}/approve|archive`)** — FastAPI endpoints backed by an in-memory registry with 12 sample documents. No real storage yet — that comes in Milestone 4B.

### Document Registry schema fields

| Field | Purpose |
|---|---|
| `vertical` | `care \| finance \| property \| recruitment \| healthcare_admin \| training_provider \| general \| custom` |
| `category` | Safeguarding, Medication, HR, Health and Safety, Complaints, Onboarding, Training |
| `status` | `draft \| approved \| under_review \| archived` |
| `access_roles` | Which roles can see this document |
| `is_sensitive` | True for HR, safeguarding, disciplinary content |
| `escalation_required` | True when AI must not answer and staff must speak to a human |
| `approved_for_embedding` | Real documents require this before chunks can be embedded or retrieved via vector search |
| `approved_for_source_grounded_answers` | Required for AI answer generation (answer-debug endpoint); not required for vector retrieval alone |
| `approved_for_staff_visibility` | Required before documents appear to staff; independent of embedding and answer approval |
| `approved_for_ai_answers` | Legacy chunk-level flag (no longer used as a vector search gate; superseded by document-level governance) |
| `contains_personal_data_warning` | Document contains identifiable data (should not be uploaded) |
| `primary_language` | ISO 639-1 code (e.g. `en`) |
| `available_languages` | Languages this policy is available in: en, ur, pa, ar, bn, gu |
| `translation_status` | `not_required \| pending \| in_progress \| complete` |
| `embedding_status` | `not_started \| pending \| processing \| indexed \| failed` |
| `review_due_date` | ISO date — when the document next needs human review |
| `version` | Semantic version string |
| `metadata` | Extensible dict for future fields |

### What does NOT happen here

- No real file storage (S3/Supabase — Milestone 4B)
- No text extraction or chunking (Milestone 4B)
- No embeddings or pgvector indexing (Milestone 4B)
- No RAG retrieval (Milestone 4C)
- No OpenAI/Claude API calls (Milestone 4C)
- No real Thumhara documents — all sample demo data only
- No real personal data

### Privacy guarantees preserved

- Approved English policies are the source of truth until a translation is formally approved
- Sensitive documents (`is_sensitive: true`) are not approved for AI answers
- Safeguarding and similar topics (`escalation_required: true`) always route to human escalation
- No service-user records, care plans, MAR charts, HR files, payroll records or named case notes should ever be uploaded

### What comes in Milestone 4B

- Real file upload (S3 / Supabase Storage)
- Text extraction (PyMuPDF for PDF, python-docx for DOCX)
- Chunking with metadata (organisation_id, document_id, role access, section)
- Embedding generation and pgvector storage
- Update `embedding_status` on completion
