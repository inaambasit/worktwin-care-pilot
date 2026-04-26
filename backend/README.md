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
| GET | /documents/{id}/chunks | Admin/debug — chunk metadata and 250-char previews (Milestone 4D) |
| GET | /documents/{id}/embedding-readiness | Admin — embedding readiness counts and flags (Milestones 4E–4F) |
| POST | /documents/{id}/generate-embeddings | **Admin-only** — controlled embedding generation for dummy/sample docs (Milestone 4F) |
| POST | /documents/search-vector | **Admin/debug** — vector similarity search, no AI answer (Milestone 4G) |
| POST | /documents/answer-debug | **Admin/debug** — source-grounded answer test from retrieved chunks only (Milestone 4H) |

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

## Milestone 4E: pgvector and embedding storage preparation

### What Milestone 4E adds

- Enables the `vector` Postgres extension (pgvector) via SQL migration — safe no-op if already installed
- New `document_embeddings` table: one row per chunk, created at upload time
- Each embedding record carries `organisation_id`, `document_id`, `chunk_id`, `access_roles`, `vertical`, `category`, and all safety flags copied from `document_chunks`
- `embedding_status = not_started` on every record — no embeddings are generated
- `embedding` column is nullable `vector(1536)` — stays NULL until a future milestone
- Upload flow now runs a step 10c after chunking: `_prepare_embedding_records_for_document`
- Upload response includes `embedding_preparation_status`, `embedding_record_count`, and `embedding_note`
- New admin endpoint: `GET /documents/{id}/embedding-readiness` — returns counts and readiness flags only
- New backend-only helpers: `_prepare_embedding_records_for_document`, `_list_embedding_records`, `_get_embedding_readiness`

### What Milestone 4E does NOT do

- No embeddings are generated — no embedding model is called
- No pgvector index (IVFFlat / HNSW) — not needed until embeddings exist
- No RAG pipeline
- No LLM API calls of any kind
- No staff-facing retrieval
- No AI answers
- No real Thumhara/QCS policy documents yet — dummy/sample PDFs only until governance review passes

### SQL migration

File: `backend/sql/005_document_embeddings.sql`

Run **after** `001_document_registry.sql`, `003_document_chunks.sql`, and `004_document_extractions.sql`:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the contents of `backend/sql/005_document_embeddings.sql`
4. Click **Run**

Vector dimensions: `vector(1536)` — matches OpenAI `text-embedding-ada-002` and `text-embedding-3-small`. Change to `vector(3072)` for `text-embedding-3-large` or `vector(768)` for smaller open-source models before generating any embeddings.

### Embedding readiness endpoint

`GET /documents/{id}/embedding-readiness` — returns:

```json
{
  "document_id": "...",
  "chunk_count": 2,
  "embedding_record_count": 2,
  "not_started_count": 2,
  "embedded_count": 0,
  "failed_count": 0,
  "approved_for_ai_answers": false,
  "escalation_required": false,
  "is_ready_for_embedding": true,
  "is_ready_for_ai_answers": false,
  "note": "Embeddings and AI answers are not enabled yet."
}
```

No vectors are returned. No secrets are returned. No extracted text is returned.

### Milestone 4E upload response shape

```json
{
  "upload_status": "success",
  "storage_status": "uploaded",
  "registry_status": "saved",
  "extraction_status": "success",
  "extraction_storage_status": "saved",
  "chunking_status": "prepared",
  "chunk_count": 2,
  "embedding_preparation_status": "prepared",
  "embedding_record_count": 2,
  "embedding_status": "pending",
  "embedding_note": "Embedding records prepared. No embeddings have been generated yet.",
  "document_id": "...",
  ...
}
```

`embedding_preparation_status` values:
- `prepared` — new embedding records created for all chunks
- `already_prepared` — records already existed (safe to re-run)
- `failed` — insert failed (usually means `005_document_embeddings.sql` has not been run)
- `skipped` — no chunks available (chunking failed or produced no text)
- `not_configured` — DB not configured

### Manual test steps (Milestone 4E)

1. Run `005_document_embeddings.sql` in Supabase SQL Editor (after 003 and 004)
2. Upload a dummy PDF via `/admin/documents`
3. Confirm the upload result shows:
   - `chunking_status: prepared`
   - `embedding_preparation_status: prepared`
   - `embedding_record_count > 0`
   - `embedding_status: pending`
   - `embedding_note: "Embedding records prepared. No embeddings have been generated yet."`
4. Check Supabase Table Editor → `document_embeddings` for rows with `embedding_status = not_started`
5. Confirm the `embedding` column is NULL on all rows
6. Call `GET /documents/{id}/embedding-readiness` and confirm safe metadata is returned
7. Confirm no AI answers, no embeddings, no vectors, no RAG are active

### Important constraints (still apply through Milestone 4E)

- Only dummy or sample PDFs should be uploaded — no real Thumhara/QCS policy documents until governance review is passed
- `approved_for_ai_answers` remains `false` for all uploaded documents
- No RAG retrieval, no LLM calls
- All embedding records are inert placeholders — they cannot be searched or served to staff

## Milestone 4F: Controlled embedding generation

### What Milestone 4F adds

- Controlled embedding generation using OpenAI `text-embedding-3-small` (1536 dimensions)
- New endpoint: `POST /documents/{id}/generate-embeddings` — admin-only, backend-only
- Embedding vectors are stored in `document_embeddings.embedding` (the nullable `vector(1536)` column)
- `document_embeddings.embedding_status` updated to `embedded` per successful chunk
- `document_chunks.embedding_status` updated to `embedded` per chunk
- `document_registry.embedding_status` updated to `indexed` / `partial` / `failed` based on results
- Updated `GET /documents/{id}/embedding-readiness` — now returns `is_ready_for_vector_search` and counts `embedded` status
- Frontend admin control: `⚡ Generate embeddings` button for eligible (non-sensitive, non-escalation) documents
- Frontend shows embedded_count, skipped_count, failed_count, estimated cost note inline

### What Milestone 4F does NOT do

- No RAG pipeline — no vector similarity search
- No AI answers — the `/ask` endpoint still returns a placeholder
- No pgvector IVFFlat/HNSW index — not needed until RAG is wired
- No LLM/chat/completion API calls of any kind
- No real Thumhara/QCS policy documents — dummy/sample PDFs only
- No staff-facing retrieval

### OPENAI_API_KEY — backend only

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Render/backend only.** Never put in frontend code, `.env.local`, or any client-side file. Never log or return in API responses. |

- Model: `text-embedding-3-small`
- Dimensions: 1536 (matches the `vector(1536)` column in `document_embeddings`)
- Do **not** use `text-embedding-3-large` — the column is `vector(1536)`, not `vector(3072)`
- If `OPENAI_API_KEY` is not set, the endpoint returns `status: not_configured` — it does not crash

### Embedding generation endpoint

`POST /documents/{id}/generate-embeddings`

Request body (JSON):

```json
{
  "allow_dummy_override": true,
  "max_chunks": 20
}
```

- `allow_dummy_override: true` — required to process chunks where `approved_for_ai_answers=false`
  (all dummy/sample uploads will have this flag false by default)
- `max_chunks` — capped at 20 per request (adjust as needed for testing)

Safety rules:
- Chunks with `escalation_required=true` are **always skipped**
- Chunks with `is_sensitive=true` are **always skipped**
- Chunks with `approved_for_ai_answers=false` are skipped unless `allow_dummy_override=true`
- Only `not_started` or `failed` embedding records are eligible
- No force-re-embed — already `embedded` records are skipped

### Embedding generation response shape

```json
{
  "document_id": "...",
  "embedding_model": "text-embedding-3-small",
  "embedding_dimensions": 1536,
  "attempted_count": 3,
  "embedded_count": 3,
  "skipped_count": 0,
  "failed_count": 0,
  "total_tokens": 892,
  "estimated_cost_note": "Estimated cost: <$0.01 (model: text-embedding-3-small, ~892 tokens, ~$0.000018 USD)",
  "embedding_status": "indexed",
  "note": "Embeddings generated for retrieval preparation only. AI answers are still disabled."
}
```

`embedding_status` values in this response:
- `indexed` — all eligible chunks embedded successfully
- `partial` — some embedded, some not yet processed
- `failed` — all attempted chunks failed
- `not_configured` — OPENAI_API_KEY missing

### Updated embedding-readiness endpoint

`GET /documents/{id}/embedding-readiness` now returns:

```json
{
  "document_id": "...",
  "chunk_count": 3,
  "embedding_record_count": 3,
  "not_started_count": 0,
  "embedded_count": 3,
  "failed_count": 0,
  "is_ready_for_vector_search": true,
  "is_ready_for_ai_answers": false,
  "note": "Vector search and AI answers are not enabled yet."
}
```

### Cost caution

- `text-embedding-3-small` costs $0.020 per 1 million input tokens
- A 1,200-character chunk ≈ ~300 tokens ≈ $0.000006 per chunk
- 20 chunks ≈ $0.0001 — negligible for testing
- **Do not run this on large batches of real documents until Milestone 4G governance review passes**
- Do not embed real Thumhara/QCS policy documents yet

### Manual test steps (Milestone 4F)

1. Set `OPENAI_API_KEY` in Render environment variables (backend service only)
2. Upload a dummy PDF via the admin UI at `/admin/documents`
3. Confirm `embedding_preparation_status: prepared` in the upload result
4. Use the `⚡ Generate embeddings` button in the admin UI, or:

```bash
# Check readiness first
curl "http://localhost:8000/documents/{id}/embedding-readiness"

# Generate embeddings (allow_dummy_override=true for sample docs)
curl -X POST "http://localhost:8000/documents/{id}/generate-embeddings" \
  -H "Content-Type: application/json" \
  -d '{"allow_dummy_override": true, "max_chunks": 20}'
```

5. Check Supabase Table Editor → `document_embeddings`:
   - `embedding_status` = `embedded`
   - `embedding` column is no longer NULL
   - `embedding_model` = `text-embedding-3-small`
   - `embedding_dimensions` = 1536
6. Check `document_registry.embedding_status` = `indexed` (or `partial`)
7. Confirm the admin UI shows "Indexed ✓" in the Embedding column
8. Confirm AI answers are still disabled (the `/ask` endpoint still returns a placeholder)

### Important constraints (still apply through Milestone 4F)

- Only dummy or sample PDFs — no real Thumhara/QCS policy documents
- AI answers remain disabled — embeddings cannot be searched or served to staff
- No pgvector index created yet — search queries will be O(n) full-table scans until the index is added in 4G
- No RAG pipeline, no LLM calls

## Milestone 4G: Admin-only vector search / retrieval test

### What Milestone 4G adds

- SQL migration `006_vector_search.sql`:
  - Optional HNSW vector index on `document_embeddings.embedding` (cosine distance, pgvector ≥ 0.5.0)
  - Postgres function `match_document_chunks` — cosine similarity search with joins to `document_chunks` and `document_registry`
  - `REVOKE EXECUTE ... FROM PUBLIC` — no anon or authenticated (frontend) access
- Backend helpers (backend-only, never exposed to frontend):
  - `_embed_query_text(query)` — calls OpenAI text-embedding-3-small for a single query string
  - `_vector_search_chunks(...)` — calls `match_document_chunks` via Supabase RPC, applies post-fetch safety filter
  - `_normalise_search_result(row)` — converts RPC rows into safe, truncated API output (350-char chunk preview only)
- New endpoint: `POST /documents/search-vector` — admin/debug only, no AI answer, no LLM
- Frontend admin panel: "Vector Search Test" (collapsible, clearly labelled Admin/debug only) at `/admin/documents`
- Safety filters enforced throughout:
  - `escalation_required=True` chunks always excluded
  - `is_sensitive=True` chunks always excluded
  - `approved_for_ai_answers=False` chunks excluded unless `allow_dummy_override=True`
  - Vectors never returned in API responses
  - Query capped at 500 characters
  - `match_count` capped at 10

### What Milestone 4G does NOT do

- No AI answer generation — no LLM, no chat, no completion endpoint
- No staff-facing RAG — `/ask` is unchanged and still returns a placeholder
- No real Thumhara/QCS documents — dummy/sample PDFs only
- No authentication or authorisation enforcement yet

### Cost: one tiny query embedding only

`text-embedding-3-small` costs $0.020 per 1 million tokens. A single query of ~50 words ≈ ~70 tokens ≈ **$0.0000014** — effectively zero. Each test search costs less than $0.01.

### SQL migration

File: `backend/sql/006_vector_search.sql`

Run **after** `005_document_embeddings.sql`:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the contents of `backend/sql/006_vector_search.sql`
4. Click **Run**

**HNSW index fallback:** If your Supabase project uses pgvector < 0.5.0, comment out the `CREATE INDEX ... USING hnsw ...` block and the search will fall back to a full-table scan (fine for the pilot dataset size).

### Vector search endpoint

`POST /documents/search-vector`

Request body:

```json
{
  "query": "What should staff do when a service user refuses medication?",
  "organisation_id": "demo-org",
  "match_count": 5,
  "allow_dummy_override": true
}
```

Response shape:

```json
{
  "query": "What should staff do when a service user refuses medication?",
  "organisation_id": "demo-org",
  "match_count": 5,
  "result_count": 2,
  "results": [
    {
      "document_id": "...",
      "chunk_id": "...",
      "document_title": "Sample Test Document",
      "chunk_index": 0,
      "similarity": 0.8734,
      "category": "Medication",
      "vertical": "care",
      "access_roles": ["All Staff"],
      "approved_for_ai_answers": false,
      "escalation_required": false,
      "is_sensitive": false,
      "chunk_preview": "First 350 characters of the chunk text..."
    }
  ],
  "note": "Vector retrieval only. AI answers are still disabled."
}
```

If `OPENAI_API_KEY` is not set: `{ "status": "not_configured", "note": "..." }`

If `006_vector_search.sql` has not been run: `{ ..., "error": "match_document_chunks function not found. Run backend/sql/006_vector_search.sql..." }`

### Manual test steps (Milestone 4G)

1. Run `006_vector_search.sql` in Supabase SQL Editor
2. Ensure at least one dummy PDF has been uploaded and embeddings generated (`embedding_status = indexed`)
3. Test via curl:

```bash
curl -X POST "http://localhost:8000/documents/search-vector" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What should this test document not contain?",
    "organisation_id": "demo-org",
    "match_count": 5,
    "allow_dummy_override": true
  }'
```

4. Or use the **Vector Search Test** panel at `/admin/documents` (purple collapsible card at the bottom of the page)
5. Confirm `result_count > 0` and `similarity` scores are returned
6. Confirm `chunk_preview` shows only the first 350 characters — full text not returned
7. Confirm no AI answer is generated — the response contains only `note: "Vector retrieval only. AI answers are still disabled."`
8. Confirm `/ask` still returns a placeholder response

### Frontend Vector Search Test panel

Location: `/admin/documents` — collapsible purple card labelled "Vector Search Test (Admin/debug only)"

- Clearly labelled admin/debug only
- Warning: "This tests retrieval only. It does not generate staff answers."
- Inputs: query text, match count (1–10), "Allow dummy/sample documents" checkbox
- Button: "Test vector search"
- Output: result count, per-chunk cards showing document title, chunk index, similarity %, chunk preview, safety flags
- Full extracted text and embeddings never displayed

### Important constraints (still apply through Milestone 4G)

- Only dummy or sample PDFs — no real Thumhara/QCS policy documents
- AI answers remain fully disabled — embeddings cannot be served to staff
- No staff-facing RAG pipeline
- No LLM calls of any kind

## Milestone 4H: Admin-only source-grounded answer generation test

### What Milestone 4H adds

- New backend-only helpers:
  - `_build_source_context(chunks)` — builds a labelled source context string (max 5 chunks, max 4,000 characters)
  - `_format_source_citations(sources)` — formats a citation list for the prompt
  - `_generate_source_grounded_answer(query, context, citations)` — calls ANSWER_MODEL with a strict source-only prompt
  - `_validate_grounded_answer_result(answer, sources)` — derives confidence label
  - `_detect_escalation_topic(query)` — pattern matches sensitive care/HR/safeguarding keywords
- New endpoint: `POST /documents/answer-debug` — admin/debug only
- Frontend admin panel: "Source-Grounded Answer Test" (collapsible, indigo card) at `/admin/documents`
- New `AnswerDebugRequest` Pydantic model
- New `ANSWER_MODEL` env var (default: `gpt-4o-mini`)
- Staff `/ask` endpoint is unchanged — AI answers remain disabled for staff

### What Milestone 4H does NOT do

- No staff-facing AI answers
- No changes to `/ask`
- No real Thumhara/QCS policy documents — dummy/sample only
- No authentication enforcement
- No rate limiting

### Answer model safety rules

The model is instructed to:
- Answer only from the supplied sources — no outside knowledge
- Cite sources using `[Source 1]`, `[Source 2]`, etc.
- If sources are insufficient, say exactly: "I can't answer that from the available approved sources."
- Not mention policies or documents not in the sources
- Include escalation guidance for safeguarding, medication, HR, legal, wellbeing, or named-individual queries
- Use UK English

Confidence values:
- `source_grounded` — answer generated from retrieved sources
- `insufficient_sources` — no matching chunks, or model said it cannot answer
- `blocked_safety` — chunks matched but all excluded by safety rules (escalation_required or is_sensitive)

### Environment variables (Render — backend only)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Backend only.** Never in frontend code, logs, or API responses. |
| `ANSWER_MODEL` | Optional. Defaults to `gpt-4o-mini`. Set in Render env vars if you want to use a different model. |

### Answer debug endpoint

`POST /documents/answer-debug`

Request body:

```json
{
  "query": "What should this test document not contain?",
  "organisation_id": "demo-org",
  "match_count": 5,
  "allow_dummy_override": true
}
```

Response shape:

```json
{
  "query": "What should this test document not contain?",
  "organisation_id": "demo-org",
  "answer": "According to [Source 1], the test document should not contain...",
  "confidence": "source_grounded",
  "result_count": 3,
  "sources": [
    {
      "source_label": "[Source 1]",
      "document_id": "...",
      "chunk_id": "...",
      "document_title": "Sample Test Document",
      "chunk_index": 0,
      "similarity": 0.8734,
      "category": "Onboarding",
      "vertical": "care",
      "source_preview": "First 350 characters of the chunk..."
    }
  ],
  "safety_note": null,
  "model": "gpt-4o-mini",
  "estimated_cost_note": "<$0.01 (~312 tokens, model: gpt-4o-mini)",
  "note": "Admin-only source-grounded answer test. Staff AI answers are still disabled."
}
```

If `OPENAI_API_KEY` is not set: `{ "status": "not_configured", "note": "..." }`

### Manual curl test

```bash
curl -X POST https://worktwin-care-pilot-api.onrender.com/documents/answer-debug \
  -H "Content-Type: application/json" \
  -d '{"query":"What should this test document not contain?","organisation_id":"demo-org","match_count":5,"allow_dummy_override":true}'
```

Expected response:
- Concise answer citing `[Source 1]`, `[Source 2]`, etc.
- `confidence: "source_grounded"`
- `sources` array with `source_label`, `document_title`, `similarity`, `source_preview`
- `note` confirming staff AI answers are still disabled

### Frontend Source-Grounded Answer Test panel

Location: `/admin/documents` — collapsible indigo card labelled "Source-Grounded Answer Test (Admin/debug only)"

- Clearly labelled admin/debug only
- Warning: "This tests answer generation from retrieved chunks only. It is not enabled for staff."
- Inputs: query text, match count (1–5), "Allow dummy/sample documents" checkbox
- Button: "Generate source-grounded test answer"
- Output: confidence badge, answer text, safety note (if applicable), sources used (with previews), model name, estimated cost note
- Vectors never displayed. Full extracted text never displayed.
- Not wired to the staff `/ask` page in any way.

### Manual test steps (Milestone 4H)

1. Ensure Milestones 4E–4G are complete: SQL migrations run, dummy PDF uploaded, embeddings generated
2. Set `OPENAI_API_KEY` in Render env vars (backend service only)
3. Optionally set `ANSWER_MODEL` (defaults to `gpt-4o-mini`)
4. Use the **Source-Grounded Answer Test** panel at `/admin/documents`
   — or test via the curl command above
5. Confirm:
   - Answer cites `[Source 1]` etc.
   - `confidence: "source_grounded"`
   - `sources` array is populated
   - `note` says "Staff AI answers are still disabled"
   - `/ask` still returns a placeholder response

### Governance warning before staff release

Before enabling AI answers for staff (Milestone 4I+), ALL of the following must be completed:

- Governance sign-off and safety review of answer quality
- Real Thumhara/QCS policy documents reviewed, approved, and embedded
- Authentication and organisation membership verification wired
- Rate limiting and anonymised query logging enabled
- Staff-facing UI changes reviewed by a safeguarding lead
- End-to-end test with representative real queries

Do not expose `/documents/answer-debug` to staff or make it publicly accessible.

## Next steps (Milestone 4I)

- Governance sign-off and safety review before embedding real Thumhara/QCS policy documents
- Staff-facing RAG pipeline (retrieve then generate answer from approved documents only)
- Authentication and organisation membership verification
- Rate limiting and anonymised query logging (no user-level data)
- Upgrade `/ask` endpoint to use source-grounded answer pipeline
