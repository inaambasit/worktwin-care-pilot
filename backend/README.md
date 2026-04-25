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
| POST | /documents/upload | Safe PDF upload with validation, Supabase storage, text extraction and personal-data risk check (Milestone 4B) |

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

## Milestone 4B: Safe PDF upload

### Supabase project required

| Setting | Value |
|---------|-------|
| Storage bucket | `worktwin-documents` |
| Bucket visibility | Private (not public) |
| Allowed MIME types | `application/pdf` only |
| Max file size | 10 MB |

### Additional environment variables (Render)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Backend only.** Never expose in frontend code, logs or API responses. |
| `SUPABASE_STORAGE_BUCKET` | Defaults to `worktwin-documents` if unset |

### Upload endpoint

`POST /documents/upload` — multipart form data. Required fields: `file`, `organisation_id`, `title`, `category`. All other fields have safe defaults.

Storage path: `{organisation_id}/documents/{document_id}/{safe_filename}`

### What Milestone 4B does

- PDF validation (extension, `%PDF` magic bytes, 10 MB limit)
- Rejects prohibited document types (care plans, MAR charts, payroll, HR cases, named complaints)
- Stores PDF in the private Supabase bucket — no public URL created
- Extracts a short text preview (≤ 2,000 characters) using `pypdf` — full text is not stored
- Runs a basic personal-data risk scan (email, UK phone, postcode, NHS number patterns, DOB labels)
- Creates an in-memory document registry record with `embedding_status = pending`
- Returns extraction and risk results to the admin UI

### What Milestone 4B does NOT do

- No public storage URLs
- No signed URLs (preview access to be added later)
- No full text storage
- No chunking
- No embeddings
- No RAG pipeline
- No LLM API calls
- No real Thumhara/QCS documents (use dummy/sample PDFs for testing only)
- No service-user records, care plans, MAR charts with names, staff HR files, payroll records or private personal data

### If Supabase is not configured

The backend will return HTTP 503 with a JSON body including `storage_status: "not_configured"`. Validation and text extraction still run so you can verify those gates work locally without Supabase credentials.

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
