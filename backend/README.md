# WorkTwin Backend

FastAPI backend for WorkTwin MVP.

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /ask | Placeholder answer endpoint |
| GET | /policies | Staff-safe policy library (Milestone 4A.1) |
| GET | /documents | Admin document registry (all statuses) |
| GET | /documents/{id} | Single document |
| POST | /documents | Create document record |
| PATCH | /documents/{id} | Update document record |
| POST | /documents/{id}/approve | Approve a document |
| POST | /documents/{id}/archive | Archive a document |
| POST | /documents/upload | Upload placeholder (disabled — Milestone 4B) |

## Before Milestone 4B safety gates

The following guarantees are enforced in the current build (Milestone 4A.1):

- **Staff-safe retrieval only** — `/policies` returns only approved documents. Staff
  never see draft, under-review or archived documents.
- **Role-based document visibility** — the `user_role` query parameter on `/policies`
  filters documents to those the caller's role is permitted to see (via `access_roles`).
- **No AI answers from unapproved documents** — `approved_for_ai_answers=False`
  documents are visible in the policy library but the frontend blocks the
  "Ask WorkTwin" CTA. No RAG pipeline is active yet.
- **No embeddings from human-only or unapproved docs** — embedding status is tracked
  per document but no embedding pipeline runs. Documents flagged `escalation_required`
  or `approved_for_ai_answers=False` will be excluded from the embedding queue in 4B.
- **No real file upload** — the `/documents/upload` endpoint returns a placeholder
  response. Secure storage, file validation, metadata stripping and safety checks
  will be implemented in Milestone 4B before upload is enabled.
- **Per-language approval required for multilingual outputs** — `translation_status`
  and per-language approval status are tracked per document. A translation must be
  explicitly approved (human review) before it can be used. The approved English
  version remains the source of truth until then.
- **No personal data in demo files** — all documents in the in-memory store are
  sample policy metadata only. No real staff, service-user, client or care data.

## Next steps (Milestone 4B)

- Secure file storage (S3 or Supabase)
- File validation and metadata stripping
- Text extraction (PyMuPDF / python-docx)
- Chunking with organisation_id, document_id, role access metadata
- Embeddings and pgvector storage
- RAG retrieval pipeline
- LLM response generation with strict grounding prompt
- Authentication and organisation membership verification
