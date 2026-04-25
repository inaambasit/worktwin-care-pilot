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
| GET | /policies | Staff-safe policy library (Milestone 4A.1) — reads from Supabase DB when configured |
| GET | /documents | Admin document registry — reads from Supabase DB when configured (Milestone 4C) |
| GET | /documents/{id} | Single document — DB first, in-memory fallback |
| POST | /documents | Create document record (in-memory) |
| PATCH | /documents/{id} | Update document record |
| POST | /documents/{id}/approve | Approve a document — updates DB when configured |
| POST | /documents/{id}/archive | Archive a document — updates DB when configured |
| POST | /documents/upload | Safe PDF upload — validates, stores in Supabase Storage, persists to DB registry (Milestone 4C) |

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

## Milestone 4C: Persistent document registry

### What Milestone 4C adds

- Supabase Postgres `document_registry` table — document metadata survives restarts
- Backend-only PostgREST / Data API access — no frontend direct DB access
- `GET /documents` reads from DB when configured; falls back to in-memory sample data
- `GET /policies` reads approved records from DB when configured
- `POST /documents/upload` persists the registry record to DB after storage upload
- Upload response includes `registry_status`: `saved` | `failed` | `not_configured`
- Approve and archive endpoints update DB records when configured
- `DocumentRecord` model now includes extraction and personal-data risk fields

### SQL migration

File: `backend/sql/001_document_registry.sql`

Run this **once** in Supabase SQL Editor before uploading real documents:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the contents of `backend/sql/001_document_registry.sql`
4. Click **Run**

Table name: `document_registry`

### Database access — backend only

The service role key is used exclusively by the Render backend via PostgREST calls:

```
{SUPABASE_URL}/rest/v1/document_registry
```

Headers used:
- `apikey: SUPABASE_SERVICE_ROLE_KEY`
- `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`

The key is **never** logged, returned in API responses, or exposed to the frontend.

### Registry vs storage

| Env var | Required for | What it does |
|---------|-------------|--------------|
| `SUPABASE_URL` | Storage + DB | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage + DB | Backend-only secret |
| `SUPABASE_STORAGE_BUCKET` | Storage | Private bucket name |

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the backend attempts DB calls (`_DB_CONFIGURED = True`). The same env vars drive both storage uploads and DB persistence.

### No RAG / embeddings yet

- `embedding_status` is stored as `pending` after every upload
- No chunking, no embeddings, no pgvector, no LLM calls in this milestone
- Do not upload real Thumhara/QCS policy files until dummy persistence test passes

### Manual test steps

1. Run the SQL migration in Supabase SQL Editor
2. Upload a dummy PDF via the admin UI at `/admin/documents`
3. Confirm `registry_status: saved` in the upload result
4. Click **Refresh** — the uploaded document should appear in the registry list
5. Check Supabase Table Editor → `document_registry` for the persisted row
6. Test **Approve** and **Archive** actions — they should update the DB row

### Milestone 4C upload response shape

```json
{
  "upload_status": "success",
  "storage_status": "uploaded",
  "registry_status": "saved",
  "document_id": "...",
  "extraction_status": "success",
  "personal_data_risk": "low",
  "embedding_status": "pending",
  "document": { ... }
}
```

If the DB table is missing, `registry_status` is `"failed"` and `registry_error` contains:
> Document registry table is not configured. Run backend/sql/001_document_registry.sql in Supabase SQL Editor.

## Milestone 4C.1: Registry clarity and demo seed

### What Milestone 4C.1 adds

- `GET /documents` now returns `{ documents, registry_source, registry_warning }` instead of a raw list
  - `registry_source`: `"database"` when reading live from Supabase, `"demo_fallback"` otherwise
  - `registry_warning`: non-null when DB is configured but unavailable (e.g. table missing or DB error)
- Admin documents page shows a live/demo registry indicator pill in the header
- "Live registry" or "Demo sample registry" or "Database unavailable — demo fallback" states are clearly labelled
- Empty-state messaging when the live DB has no documents yet: "No persistent documents yet. Upload a dummy or sample PDF first."
- Optional demo seed SQL: `backend/sql/002_seed_demo_document_registry.sql`

### Milestone 4C is complete when

- `document_registry` table exists in Supabase (run `001_document_registry.sql`)
- An uploaded document persists across backend restarts
- `GET /documents` returns `registry_source: "database"` and the admin page shows the "Live registry" indicator
- `GET /documents` returns `registry_source: "demo_fallback"` (with or without a warning) when the DB is not configured or unavailable

### Important constraints (still apply through Milestone 4C/4C.1)

- Only dummy or sample PDFs should be uploaded — no real Thumhara/QCS policy documents until governance review is passed
- Uploaded documents are **not AI-answerable** — embedding_status remains `pending` and no RAG pipeline is active
- No chunking, no embeddings, no pgvector, no LLM calls

### Optional demo seed

`backend/sql/002_seed_demo_document_registry.sql` inserts the 12 sample policy metadata records into the live `document_registry` table.

- Run ONLY in development or demo environments — **not for production client data**
- Requires `001_document_registry.sql` to have been run first
- Uses `ON CONFLICT (id) DO NOTHING` — safe to re-run
- Storage keys are placeholder paths — no real files exist for these records
- `embedding_status` is `not_started` for all records — no actual embeddings

To seed: open Supabase SQL Editor, paste the file contents, click Run.

## Milestone 4D: Extracted text storage and chunking preparation

### What Milestone 4D adds

- Full extracted text is stored server-side in a new `document_extractions` table — never exposed in the staff UI
- Text is split into chunks (~1,000–1,200 characters with 150-character overlap) using a simple, deterministic character-based chunker — no AI, no NLP
- Chunks are stored in a new `document_chunks` table, carrying `organisation_id`, `document_id`, `access_roles`, `vertical`, `category`, and safety flags on every row
- `embedding_status` on each chunk is always `not_started` — no embeddings are generated yet
- `document_registry.metadata` is updated with `chunk_count` after chunking
- Upload response now includes `extraction_storage_status`, `chunking_status`, `chunk_count`, and a `chunking_note`
- New admin/debug endpoint: `GET /documents/{id}/chunks` — returns chunk metadata and 250-character previews; full chunk text is never returned

### What Milestone 4D does NOT do

- No embeddings — no pgvector, no embedding model calls
- No RAG — no retrieval pipeline
- No LLM API calls of any kind
- No staff-facing chunk display
- No AI answers from chunks
- No real Thumhara/QCS policy documents yet — dummy/sample PDFs only until governance review passes

### SQL migrations

| File | Purpose |
|------|---------|
| `backend/sql/003_document_chunks.sql` | Creates `document_chunks` table with RLS |
| `backend/sql/004_document_extractions.sql` | Creates `document_extractions` table with RLS |

Run both in Supabase SQL Editor **after** `001_document_registry.sql`.

### Chunking rules

- Target ~1,200 characters per chunk
- 150-character overlap between adjacent chunks
- Advances by step = `max_chars − overlap_chars` (= 1,050 chars) per iteration
- End of each window snaps to the nearest word boundary within the last 100 characters
- All chunks carry: `organisation_id`, `document_id`, `access_roles`, `vertical`, `category`, `is_sensitive`, `escalation_required`, `approved_for_ai_answers`
- `embedding_status = not_started` on every chunk — no embeddings in this milestone

### Safety guarantees (Milestone 4D)

- Full extracted text is stored in `document_extractions`, not in the API response or the staff UI
- Chunk text is stored in `document_chunks` — accessible only via the admin/debug endpoint (250-char preview only; full text never returned)
- Staff cannot see chunks or extracted text
- `approved_for_ai_answers` is inherited from the document flags at upload time
- Escalation-required and sensitive documents still get chunks, but `embedding_status = not_started` and `approved_for_ai_answers` remains false unless explicitly set

### Milestone 4D upload response shape

```json
{
  "upload_status": "success",
  "storage_status": "uploaded",
  "registry_status": "saved",
  "extraction_status": "success",
  "extraction_storage_status": "saved",
  "chunking_status": "prepared",
  "chunk_count": 42,
  "embedding_status": "pending",
  "chunking_note": "Chunks prepared. Embeddings and AI answers are not enabled yet.",
  "document_id": "...",
  ...
}
```

### Admin/debug chunk endpoint

`GET /documents/{id}/chunks` — returns:

```json
{
  "document_id": "...",
  "chunk_count": 42,
  "chunks": [
    {
      "id": "...",
      "chunk_index": 0,
      "chunk_character_count": 1187,
      "embedding_status": "not_started",
      "approved_for_ai_answers": false,
      "escalation_required": false,
      "chunk_preview": "First 250 characters of the chunk text..."
    }
  ],
  "embedding_note": "Embeddings and AI answers are not enabled yet."
}
```

### Manual test steps (Milestone 4D)

1. Run `003_document_chunks.sql` in Supabase SQL Editor
2. Run `004_document_extractions.sql` in Supabase SQL Editor
3. Upload a dummy PDF via `/admin/documents`
4. Confirm the upload result shows:
   - `storage_status: uploaded`
   - `registry_status: saved`
   - `extraction_storage_status: saved`
   - `chunking_status: prepared`
   - `chunk_count > 0`
   - `embedding_status: pending`
5. Check Supabase Table Editor → `document_extractions` for a row with the full text
6. Check Supabase Table Editor → `document_chunks` for chunk rows
7. Call `GET /documents/{id}/chunks` and confirm 250-char previews are returned
8. Confirm no AI answers, no embeddings, no RAG are enabled

## Next steps (Milestone 4E)

- Embedding generation and pgvector storage
- RAG retrieval pipeline
- LLM response generation with strict source-grounding prompt
- Authentication and organisation membership verification
