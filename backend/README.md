# WorkTwin Backend

FastAPI backend for WorkTwin MVP.

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The server starts at `http://localhost:8000`.

To match the Render start command exactly (no auto-reload):

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Test endpoints locally

```bash
# Health check
curl http://localhost:8000/health

# Root
curl http://localhost:8000/

# Staff-safe policy library (all approved policies)
curl "http://localhost:8000/policies"

# Filter by role
curl "http://localhost:8000/policies?user_role=Care+Worker"

# Filter by category
curl "http://localhost:8000/policies?category=Medication"
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | Root — service identity and status |
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

## CORS

CORS origins are controlled by the `ALLOWED_ORIGINS` environment variable.

```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

Defaults to `http://localhost:3000,http://localhost:3001` when the variable is not set.
Multiple origins are comma-separated. No wildcard `*` is used in production.

## Render deployment settings

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Environment variables to set in Render

| Variable | Value |
|----------|-------|
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | `https://worktwin-care-pilot.vercel.app` |

### Environment variable to set in Vercel (frontend)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service-name>.onrender.com` |

Replace `<your-render-service-name>` with the subdomain Render assigns when you create the service.

## Safety guarantees (Milestone 4A.1)

- **Staff-safe retrieval only** — `/policies` returns only approved documents.
- **Role-based visibility** — `user_role` query param filters by `access_roles`.
- **No AI answers from unapproved documents** — `approved_for_ai_answers=False` documents are listed but the frontend blocks the "Ask WorkTwin" CTA.
- **No embeddings or RAG pipeline active** — embedding status is tracked per document but no pipeline runs yet.
- **No real file upload** — `/documents/upload` returns a placeholder response.
- **No personal data in demo store** — all in-memory documents are sample policy metadata only.

## Next steps (Milestone 4B)

- Secure file storage (S3 or Supabase)
- File validation and metadata stripping
- Text extraction (PyMuPDF / python-docx)
- Chunking with organisation_id, document_id, role access metadata
- Embeddings and pgvector storage
- RAG retrieval pipeline
- LLM response generation with strict grounding prompt
- Authentication and organisation membership verification
