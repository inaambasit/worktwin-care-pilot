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
| PATCH | /documents/{id}/governance | **Admin-only** — update governance fields with safety enforcement (Milestone 4I) |
| GET | /documents/{id}/governance-readiness | **Admin/debug** — governance readiness summary with blocked reasons (Milestone 4I.1) |

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
| `ADMIN_TOKEN` | Secret bearer token — required to call admin/debug endpoints |

### Environment variable to set in Vercel (frontend)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service-name>.onrender.com` |
| `NEXT_PUBLIC_ADMIN_TOKEN` | Must match `ADMIN_TOKEN` set in Render — used by the admin UI only |

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

- `allow_dummy_override: true` — required for dummy/sample documents that have not been through governance approval (i.e. `real_document=false` and `approved_for_embedding=false`)
- `max_chunks` — capped at 20 per request (adjust as needed for testing)

Safety rules (Milestone 4I governance separation applies):
- Chunks with `escalation_required=true` are **always skipped** regardless of governance flags
- Chunks with `is_sensitive=true` are **always skipped** regardless of governance flags
- `approved_for_ai_answers` (chunk-level flag) is **not** checked during embedding — embedding approval is governed by `document_registry.approved_for_embedding` at the document level
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
- **Do not run this on large batches of real documents — governance sign-off is required before embedding real policy documents**
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
- No pgvector index in this milestone — the optional HNSW index was added in Milestone 4G
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

## Milestone 4I: Document governance gate

### What Milestone 4I adds

- SQL migration `007_document_governance.sql`:
  - 14 new governance columns on `document_registry` (all added with `ADD COLUMN IF NOT EXISTS` — safe to re-run on existing tables)
  - New `document_audit_events` table with RLS enabled — backend service role only, no frontend access
- Governance helper functions (backend-only, never exposed to frontend):
  - `_create_audit_event(...)` — fire-and-forget audit logging; errors are swallowed so audit failure never blocks core operations
  - `_get_document_governance_summary(document_id)` — fetches governance fields for one document
  - `_get_document_governance_batch(document_ids)` — single PostgREST `in.(...)` query for multiple document IDs (used by answer-debug filter)
  - `_can_embed_document(document, allow_dummy_override)` — governance gate for embedding generation
  - `_can_use_document_for_answer_debug(document, allow_dummy_override)` — governance gate for source-grounded answer testing
  - `_can_show_document_to_staff(document)` — governance gate for staff-facing policy library
- Upload flow now sets governance defaults on every new document:
  `governance_status="not_reviewed"`, `real_document=False`, `dummy_document=True`, `approved_for_embedding=False`, `approved_for_staff_visibility=False`, `approved_for_source_grounded_answers=False`
- Upload flow emits four audit events: `document_uploaded`, `extraction_saved`, `chunks_prepared`, `embedding_records_prepared`
- Embedding generation (`POST /documents/{id}/generate-embeddings`) now checks document-level governance gate before processing any chunks
- Answer-debug (`POST /documents/answer-debug`) now filters retrieved chunks by document-level governance gate before passing to the LLM
- New admin endpoint: `PATCH /documents/{id}/governance` — updates governance fields with safety enforcement
- Admin UI at `/admin/documents` now shows a **Document Governance** panel (emerald, collapsible) with per-document governance cards and action buttons

### Governance fields added to `document_registry`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `governance_status` | `text` | `not_reviewed` | Overall governance state |
| `real_document` | `boolean` | `false` | True = real policy content from an authoritative source |
| `dummy_document` | `boolean` | `true` | True = sample/test document only |
| `approved_for_embedding` | `boolean` | `false` | Admin must explicitly approve before embeddings can be generated |
| `approved_for_staff_visibility` | `boolean` | `false` | Admin must explicitly approve before document appears in staff policy library |
| `approved_for_source_grounded_answers` | `boolean` | `false` | Admin must explicitly approve before document is used for AI answer generation |
| `requires_human_review_before_embedding` | `boolean` | `true` | Reminder flag — human review required before embedding |
| `requires_human_review_before_staff_visibility` | `boolean` | `true` | Reminder flag — human review required before staff visibility |
| `governance_reviewed_by` | `text` | `null` | Who performed the governance review |
| `governance_reviewed_at` | `timestamptz` | `null` | When the governance review was completed |
| `governance_notes` | `text` | `null` | Free-text governance notes |
| `source_owner` | `text` | `null` | Organisation or person who authored the document |
| `source_licence_notes` | `text` | `null` | Licence or permission notes for third-party content |
| `contains_qcs_or_third_party_content` | `boolean` | `false` | True = content sourced from QCS or another third party |

Allowed `governance_status` values (enforced by backend, not DB constraint):
`not_reviewed` | `pilot_approved` | `approved_for_staff` | `approved_for_ai` | `rejected` | `archived`

### Governance rules (enforced at all times)

1. **Sensitive documents (`is_sensitive=true`) are always blocked** — they cannot be approved for embedding or AI answers regardless of governance status
2. **Escalation-required documents (`escalation_required=true`) are always blocked** — same as sensitive
3. **Real documents require explicit `approved_for_embedding=true`** before embedding generation runs
4. **Real documents require explicit `approved_for_source_grounded_answers=true`** before they are used in answer-debug
5. **Dummy/sample documents** can still be tested with `allow_dummy_override=true` — governance gate allows through
6. **Pre-migration records** (before `007_document_governance.sql` is run) are treated permissively in the answer-debug filter to avoid breaking existing test workflows

### Governance gate behaviour in each endpoint

| Endpoint | Gate function | Block condition |
|----------|--------------|-----------------|
| `POST /documents/{id}/generate-embeddings` | `_can_embed_document` | sensitive or escalation; real doc without `approved_for_embedding`; dummy doc without `allow_dummy_override` |
| `POST /documents/answer-debug` | `_can_use_document_for_answer_debug` | sensitive or escalation; real doc without `approved_for_source_grounded_answers`; dummy doc without `allow_dummy_override` |
| `GET /policies` (staff) | `_can_show_document_to_staff` | sensitive; escalation; real doc without `approved_for_staff_visibility` |

### Audit events

All governance events and pipeline operations are recorded in `document_audit_events`. The table is backend service role only — no frontend access.

| `event_type` | When it fires |
|-------------|--------------|
| `document_uploaded` | Document registry record saved after upload |
| `extraction_saved` | Extracted text saved to `document_extractions` |
| `chunks_prepared` | Chunks saved to `document_chunks` |
| `embedding_records_prepared` | Embedding records saved to `document_embeddings` |
| `embeddings_generated` | Embedding vectors generated successfully |
| `embedding_generation_blocked` | Governance gate blocked embedding generation |
| `answer_debug_tested` | Source-grounded answer debug test completed |
| `governance_status_changed` | `PATCH /documents/{id}/governance` updated governance fields |

Audit failures are swallowed silently — a failed audit write never causes an HTTP 4xx/5xx response.

### SQL migration

File: `backend/sql/007_document_governance.sql`

Run **after** `001_document_registry.sql` through `006_vector_search.sql`:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the contents of `backend/sql/007_document_governance.sql`
4. Click **Run**

The migration is idempotent — `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` mean it is safe to re-run.

### Governance admin endpoint

`PATCH /documents/{id}/governance`

Request body (all fields optional):

```json
{
  "governance_status": "pilot_approved",
  "real_document": true,
  "dummy_document": false,
  "governance_notes": "Reviewed by admin — cleared for embedding test",
  "source_owner": "Thumhara Centre",
  "source_licence_notes": "Internal document — no third-party licence",
  "contains_qcs_or_third_party_content": false,
  "approved_for_embedding": true,
  "approved_for_staff_visibility": false,
  "approved_for_source_grounded_answers": false
}
```

Safety rules enforced by the endpoint:
- `governance_status` must be one of the allowed values (HTTP 400 if not)
- `real_document` and `dummy_document` cannot both be `true` (HTTP 400)
- `approved_for_embedding=true` is blocked if the document is `is_sensitive` or `escalation_required` (HTTP 400)
- `approved_for_source_grounded_answers=true` is blocked for the same reasons

Returns: the updated `DocumentRecord`.

### What Milestone 4I does NOT do

- Staff-facing `/ask` remains a placeholder — AI answers are NOT enabled for staff
- No real Thumhara/QCS documents should be embedded until governance fields are confirmed and `approved_for_embedding=true`
- No changes to the staff policy library UI or the `/ask` endpoint
- No authentication or role-based access control on admin endpoints (planned for a later milestone)

### Manual test steps (Milestone 4I)

1. Run `007_document_governance.sql` in Supabase SQL Editor
2. Upload a dummy PDF — confirm the upload result includes governance defaults in the returned `document` object
3. Check Supabase Table Editor → `document_registry` — confirm the new governance columns exist and are populated with defaults
4. Open `/admin/documents` → **Document Governance** panel (emerald card)
5. Click **Approve for Embedding** on a dummy document — confirm the API response shows `approved_for_embedding: true`
6. Generate embeddings with `allow_dummy_override=true` — confirm they succeed
7. Try clicking **Approve for Embedding** on a sensitive or escalation-required document — confirm it is disabled (lock icon)
8. Use the `PATCH /documents/{id}/governance` endpoint directly to mark a document as `real_document=true`
9. Confirm that generating embeddings for that real document now returns `status: "blocked"` without `approved_for_embedding=true`
10. Check Supabase Table Editor → `document_audit_events` for logged events

## Milestone 4I.1: Governance hardening and real-document readiness checklist

### What Milestone 4I.1 adds

- **Clearer blocked reason messages** — governance gate functions now return plain English explanations:
  - "Document is marked sensitive and cannot be embedded."
  - "Document requires escalation and cannot be used for AI answers."
  - "Real document requires governance approval before embedding."
  - "Dummy document requires allow_dummy_override=true for test embedding."
  - `answer-debug` blocked safety case now returns: "No safe approved chunks available for answer generation."
- **Human-readable audit event summaries** — `PATCH /documents/{id}/governance` now writes specific summaries:
  - "Document approved for embedding."
  - "Document approved for source-grounded answer testing."
  - "Document approved for staff visibility."
  - "Document marked as real pilot document."
  - "Document rejected during governance review."
  - "Document archived."
- **New governance readiness endpoint** — `GET /documents/{id}/governance-readiness` (see below)
- **Frontend: real-document readiness checklist** — guidance checklist visible in the Document Governance panel before approving any document for embedding or staff visibility
- **Frontend: per-document readiness display** — each document card in the governance panel now shows "Embed: Yes/No", "AI test: Yes/No", "Staff: Yes/No" and the main blocked reason (if any)

### What Milestone 4I.1 does NOT change

- Staff-facing `/ask` remains disabled — RAG is still governed-off
- Real Thumhara/QCS documents must not be embedded until human review and governance approval
- No SQL migration required — all changes are code-only
- No change to the audit events table schema

### Governance readiness endpoint

`GET /documents/{id}/governance-readiness`

Admin/debug only. Returns a full readiness summary for a single document. Does **not** expose extracted text, embedding vectors, or secrets.

Example response:

```json
{
  "document_id": "...",
  "title": "Staff Handbook",
  "dummy_document": false,
  "real_document": true,
  "governance_status": "not_reviewed",
  "is_sensitive": false,
  "escalation_required": false,
  "approved_for_embedding": false,
  "approved_for_staff_visibility": false,
  "approved_for_source_grounded_answers": false,
  "can_embed_now": false,
  "can_use_for_answer_debug_now": false,
  "can_show_to_staff_now": false,
  "blocked_reasons": [
    "Real document requires governance approval before embedding.",
    "Real document requires governance approval before source-grounded answer testing.",
    "Document requires approved_for_staff_visibility=true before staff visibility."
  ],
  "next_required_actions": [
    "Approve for embedding via PATCH /documents/{id}/governance (approved_for_embedding=true) after completing human review.",
    "Approve for AI answer testing via PATCH /documents/{id}/governance (approved_for_source_grounded_answers=true) after completing human review.",
    "Approve for staff visibility via PATCH /documents/{id}/governance (approved_for_staff_visibility=true)."
  ],
  "note": "Governance readiness only. Staff-facing AI answers remain disabled."
}
```

```bash
curl "http://localhost:8000/documents/{id}/governance-readiness"
```

### Real document readiness checklist (guidance only)

Before approving any document for embedding or staff visibility, confirm all of the following:

- Approved non-sensitive policy, SOP or training document only
- No service-user records
- No care plans
- No MAR charts with names
- No staff HR or payroll records
- No safeguarding case notes
- No named complaints
- No confidential third-party/QCS content unless licence and use is confirmed
- Human review completed before embedding
- Human review completed before staff visibility
- Document owner and source confirmed

This checklist is shown in the Document Governance panel at `/admin/documents` as a visual reminder.

### Governance rules confirmed (no change to logic)

The following rules were audited in Milestone 4I.1 and confirmed as correctly implemented:

- `is_sensitive=true` permanently blocks: `approved_for_embedding=true`, `approved_for_source_grounded_answers=true`, embedding generation, and answer-debug source use
- `escalation_required=true` permanently blocks the same four operations
- `real_document=true` blocks embedding unless `approved_for_embedding=true`
- `real_document=true` blocks answer-debug source use unless `approved_for_source_grounded_answers=true`
- `dummy_document=true` allows dummy testing only when `allow_dummy_override=true`
- `approved_for_staff_visibility` does NOT automatically approve embedding or AI answer use
- Approving embedding does NOT automatically approve source-grounded answers
- Approving source-grounded answers does NOT automatically approve staff visibility

### Endpoint table update

| Method | Path | Description |
|--------|------|-------------|
| GET | /documents/{id}/governance-readiness | **Admin/debug** — governance readiness summary with blocked reasons and next actions (Milestone 4I.1) |

## Milestone 4I.4: Governance blocking proof — AC32 first controlled real document

### What Milestone 4I.4 proves

AC32 Mobile Phone and Portable Device Use Policy is the first controlled real document registered in the pilot system. Its governance state was used to confirm that embedding approval, answer approval, and staff visibility are fully independent gates.

### AC32 document details

| Field | Value |
|-------|-------|
| Document ID | `1cbbc192-1962-4cd3-be05-5e390e3173c9` |
| Title | Mobile Phone and Portable Device Use Policy |
| Policy reference | AC32 |

### AC32 final governance state (unchanged throughout the proof)

| Flag | Value |
|------|-------|
| `status` | `draft` |
| `real_document` | `true` |
| `dummy_document` | `false` |
| `approved_for_embedding` | `true` |
| `approved_for_source_grounded_answers` | `false` |
| `approved_for_staff_visibility` | `false` |
| `is_sensitive` | `false` |
| `escalation_required` | `false` |
| `embedding_status` | `indexed` |

No governance approvals were changed during the proof.

### What the proof confirmed

- `POST /documents/search-vector` retrieves AC32 chunks — admin-only vector retrieval works for real embedded documents.
- `POST /documents/answer-debug` is blocked for AC32 — `approved_for_source_grounded_answers=false` prevents source-grounded answer testing.
- `GET /policies` (staff) does not include AC32 — `approved_for_staff_visibility=false` keeps it off the staff-facing policy library.
- Staff-facing `/ask` remains a placeholder and does not use AC32 in any way.
- The three approval gates operate independently: embedding approval, answer approval, and staff visibility each require a separate explicit decision.

### What Milestone 4I.4 does NOT change

- No governance flags were modified.
- No code changes were made.
- AC32 remains draft, staff-invisible, and answer-blocked.
- Staff `/ask` is unchanged.

## Milestone 4I.5: Answer-debug approval fix — AC32 source-grounded answer test passed

### What Milestone 4I.5 proves

AC32 Mobile Phone and Portable Device Use Policy (`approved_for_source_grounded_answers` set to `true`) is now confirmed working end-to-end for admin-only source-grounded answer-debug testing. Staff visibility remains off. This milestone documents the bug discovered during that test and its fix.

### The bug and fix

**Bug:** After AC32 governance was updated to `approved_for_source_grounded_answers=true`, `POST /documents/answer-debug` still returned `confidence: blocked_safety` with `sources: []` — even though `GET /documents/{id}/governance-readiness` correctly reported `can_use_for_answer_debug_now: true`.

**Root cause:** The answer-debug route was filtering retrieved chunks using the stale chunk-level `approved_for_ai_answers` flag. For AC32, all chunks carried `approved_for_ai_answers=false` (inherited from the document's state at upload time, before governance approval was granted). The document-level `approved_for_source_grounded_answers=true` was never consulted.

**Fix (commit `e07a30c`):** The answer-debug filter now checks `document_registry.approved_for_source_grounded_answers` at the document level for real documents instead of relying on the chunk-level `approved_for_ai_answers` flag. Chunks with `is_sensitive=true` or `escalation_required=true` remain unconditionally blocked regardless of any governance approval.

### AC32 governance state at Milestone 4I.5

| Field | Value |
|-------|-------|
| Document ID | `1cbbc192-1962-4cd3-be05-5e390e3173c9` |
| `status` | `draft` |
| `real_document` | `true` |
| `dummy_document` | `false` |
| `approved_for_embedding` | `true` |
| `approved_for_source_grounded_answers` | `true` |
| `approved_for_staff_visibility` | `false` |
| `is_sensitive` | `false` |
| `escalation_required` | `false` |

### Live proof results

- `POST /documents/answer-debug` returns `confidence: source_grounded` with AC32 sources.
- `POST /ask` still returns a placeholder response only.
- `GET /documents/{id}/governance-readiness` still shows `can_show_to_staff_now: false`.

### What Milestone 4I.5 does NOT change

- No SQL changes were made.
- No frontend changes were made.
- Staff-facing `/ask` is unchanged — staff cannot see AC32.
- AC32 remains draft and staff-invisible.
- Staff visibility was not approved.

## Milestone 4J: Admin-only AC32 answer quality and safety review

### Context

Milestone 4I governance is closed. AC32 (`approved_for_source_grounded_answers=true`) is confirmed working in admin/debug mode. AC32 remains draft and staff-invisible (`approved_for_staff_visibility=false`). Staff-facing `/ask` remains a placeholder only. No staff-facing RAG has been enabled.

### Purpose

Review answer quality and safety in admin/debug mode before any staff-facing release.

### Admin-only answer-debug tests completed

#### 1. Lost/stolen work phone
- **Result:** passed
- Answer correctly said staff must report the loss as soon as discovered to the named internal contact and that it may require reporting under Data Breach regulations.
- **Note:** named internal contact appears because the policy source includes that name; decide before staff-facing release whether named contacts should be shown or generalised.

#### 2. Mobile phone while driving for work
- **Result:** passed
- Answer correctly said use must only happen where legal and with Bluetooth/hands-free/safe-use technology.
- **Note:** wording should be more cautious before staff-facing release to avoid sounding like broad legal advice.

#### 3. Business mobile phone personal calls/texts
- **Result:** passed
- Answer correctly relied on the source saying the business mobile phone is strictly for business use only.
- **Note:** another source mentions speech calls/text messages, but this appears to relate to business use, not personal use.

#### 4. Personal mobile phone for work purposes
- **Result:** passed
- Answer correctly said personal phone use is only allowed where required for the role, where no business phone is issued, and where Thumhara Centre has approved it.
- **Note:** wording can be polished before staff-facing use.

### Milestone 4J findings

- Source-grounded answering works in admin-only mode.
- AC32 sources are returned.
- Answers are mostly accurate and policy-grounded.
- Staff-facing `/ask` remains placeholder.
- AC32 remains staff-invisible.
- No SQL changes.
- No frontend changes.
- No governance flags changed.

### Issues to address before staff-facing release

- Clean `Â` encoding artefacts from extracted/chunked text or previews.
- Decide whether named internal contacts should appear in staff answers.
- Make safety/legal-adjacent answers more cautious.
- Review stale embedding-readiness wording that still says AI answers are not enabled, even though admin-only answer-debug is enabled.

### What Milestone 4J does NOT do

- No code changes.
- No SQL changes.
- No frontend changes.
- No governance flag changes.
- AC32 is not approved for staff visibility.
- Staff-facing `/ask` is not changed.

## Milestone 4L.1: Backend text-cleaning for PDF extraction artefacts

### What Milestone 4L.1 adds

- New backend helper `_clean_extracted_text(text)` — applied to all extracted page text before storage and chunking on future uploads
- Common PDF mojibake artefacts are cleaned from all returned previews and context:
  - `Â ` (non-breaking space misread as `Â `) → single space
  - `ÂWill`-style prefix artefacts → stripped
  - Copyright mojibake `Â©` → `©` (U+00A9)
  - Other common Windows-1252-decoded-as-UTF-8 artefacts
- `/documents/search-vector` returns cleaner `chunk_preview` output
- `/documents/answer-debug` returns cleaner `source_preview` and `context` output
- `/documents/{id}/chunks` returns cleaner `chunk_preview` output

### What Milestone 4L.1 does NOT do

- Existing `document_chunks`, `document_extractions`, and `document_registry` rows in Supabase are **not rewritten** — stored text in the DB may still contain original artefacts from before this milestone
- The live API cleans returned previews and context; it does not modify stored rows in place
- No SQL migration required
- No frontend changes
- No governance flag changes
- No changes to `/ask`
- AC32 is not approved for staff visibility

### Verification

The copyright symbol fix was verified using a Python UTF-8 check against the live API:

- Live API returned `"Copyright © Quality"` with character code `0xa9` — correct UTF-8
- PowerShell `Invoke-RestMethod` displayed `©` misleadingly, but Python UTF-8 decoding confirmed the API response was correct

### Commits

| Commit | Description |
|--------|-------------|
| `d60886c` | Clean PDF extraction preview artefacts |
| `78e4a4f` | Clean common PDF mojibake symbols |
| `f9793a0` | Use Unicode escapes for PDF symbol cleanup |

## Milestone 4M: Named-contact anonymisation in source-grounded answers

### What Milestone 4M adds

- Prompt-only update to `_generate_source_grounded_answer` in the answer-debug pipeline.
- If the generated answer would include a named individual from the source document, the model is instructed to replace their name with a role, title, or neutral phrase such as:
  - "the nominated manager"
  - "the responsible lead"
  - "the appropriate senior staff member"
- The exception is where the name is purely informational — for example a document author, document title, or source citation.

### What Milestone 4M proved

- Admin-only `POST /documents/answer-debug` still returns `confidence: source_grounded`.
- The lost/stolen work phone answer no longer repeated the named internal contact ("Shagufta Akhtar" in AC32) — the answer used "the nominated manager" instead.
- Admin `source_preview` still shows the raw source text for audit and review purposes.
- Staff-facing `/ask` still returns the placeholder response and does not use AC32 or RAG in any way.

### What Milestone 4M does NOT do

- No changes to `/ask`.
- No staff-facing RAG enabled.
- AC32 is not approved for staff visibility.
- No SQL changes.
- No frontend changes.
- No governance flag changes.
- Escalation contacts are not a DB-backed feature in this milestone — the anonymisation is prompt-only.

### Future note

A later milestone should design proper DB-backed escalation contacts and role-based escalation routing rather than relying solely on prompt wording.

### Commit

| Commit | Description |
|--------|-------------|
| `a691d3f` | Generalise named contacts in answer-debug |

## Milestone 4N: Driving and safety-critical topic caution

### What Milestone 4N adds

- `driving` and `vehicle` added to `_ESCALATION_TOPICS_RE` — queries involving driving or vehicle use are now detected as escalation topics.
- `_generate_source_grounded_answer` prompt extended: driving and vehicle use are listed alongside safeguarding, medication, HR, legal, wellbeing, and named-individual queries as topics that require escalation guidance.
- Prompt wording added covering statutory obligations, legal duties, road safety, driving, vehicle use, and potential criminal liability.

### What Milestone 4N does NOT do

- No SQL changes.
- No frontend changes.
- No `/ask` changes.
- No governance flag changes.
- Staff-facing RAG is not enabled.
- AC32 is not approved for staff visibility.
- No new endpoints.

### Commit

| Commit | Description |
|--------|-------------|
| `7937a57` | Add caution for driving and safety-critical answers |

## Milestone 4N.1: Deterministic safety note appended server-side

### What Milestone 4N.1 adds

- In the `/documents/answer-debug` successful answer path: if `safety_note` is present and not already contained in `answer_text`, it is appended to `answer_text` with two newlines.
- This makes the core escalation caution deterministic — it is no longer left to the LLM to include it.

### What this proved

- Live `answer-debug` for "Can staff use a mobile phone while driving for work?" returns `confidence: source_grounded`.
- `safety_note` is present for the driving query.
- Two-run proof confirmed the answer body always includes:
  > "This query involves a sensitive topic. Please escalate to your line manager or designated lead."
- The model may additionally include legal/safety-critical professional guidance wording, but the backend `safety_note` is now deterministic.

### What Milestone 4N.1 does NOT do

- No SQL changes.
- No frontend changes.
- No `/ask` changes.
- No governance flag changes.
- Staff-facing RAG is not enabled.
- AC32 is not approved for staff visibility.
- No new endpoints.

### Future note

When staff-facing `/ask` is built, the same deterministic safety-note pattern should be applied server-side from day one — not left to prompt-only behaviour.

### Commits

| Commit | Description |
|--------|-------------|
| `9b7d831` | Append safety note to answer-debug responses |

## Milestone 4O.1: Stale wording cleanup — admin-only RAG status

### What Milestone 4O.1 changes

Wording-only corrections in two files. No backend logic, no frontend logic, no SQL, no governance flags, and no `/ask` behaviour were changed.

**`backend/app/main.py` — embedding-readiness note**

Previous wording implied vector search and AI answers were not enabled at all.
Updated to state: admin-only vector search is active; `answer-debug` is available for approved documents; staff-facing RAG is not enabled.

**`backend/app/main.py` — chunk endpoint `embedding_note`**

Previous wording: `"Embeddings and AI answers are not enabled yet."`
Updated to state: embeddings are stored; admin-only vector search and `answer-debug` are available for approved documents; staff-facing RAG is not enabled.

**`frontend/app/ask/page.tsx` — /ask connected notice**

Updated to say explicitly that answers on that page are not sourced from organisation documents and that staff-facing document-grounded answers are not yet enabled.

### Current reality after 4O.1

- Admin-only vector search is active (`POST /documents/search-vector`).
- Admin-only source-grounded answer testing is available via `POST /documents/answer-debug` for approved/governed documents.
- Staff-facing `/ask` remains placeholder only — no RAG, no document-grounded answers.
- AC32 remains draft and staff-invisible (`approved_for_staff_visibility=false`).

### What was proved live

- Render backend returned the updated `embedding_note` from `GET /documents/{AC32_ID}/chunks`.
- Vercel `/ask` page showed the updated connected notice.
- `/ask` still returned the placeholder response.
- `/ask` did not use AC32 or RAG.

### What Milestone 4O.1 does NOT do

- No backend logic changes.
- No frontend logic changes.
- No SQL changes.
- No `/ask` behaviour changes.
- No governance flag changes.
- No staff-facing RAG enabled.
- AC32 is not approved for staff visibility.
- No new endpoints.

### Important note on existing chunk previews

Existing AC32 chunk previews may still show old stored PDF extraction artefacts — Milestone 4L.1 cleaned returned previews and future extractions but did not rewrite existing Supabase rows.

### Commit

| Commit | Description |
|--------|-------------|
| `213a336` | Clarify admin-only document answer wording |

## Milestone 4P: Admin bearer-token protection

**Commit:** `cfc1a3e` Protect admin endpoints with bearer token

### What Milestone 4P adds

All admin and debug endpoints now require an `Authorization: Bearer <token>` header. The token is set via the `ADMIN_TOKEN` environment variable on Render. The frontend admin UI reads the matching `NEXT_PUBLIC_ADMIN_TOKEN` variable and includes it in every admin request.

### Protected endpoints (require Bearer token)

All `/documents` routes except where noted below — including upload, registry, chunking, embeddings, vector search, answer-debug, governance, and governance-readiness.

### Public endpoints (no token required)

| Method | Path | Reason |
|--------|------|--------|
| GET | / | Service identity |
| GET | /health | Uptime monitoring |
| POST | /ask | Staff-facing placeholder |
| GET | /policies | Staff-facing policy library |

### Environment variables

| Variable | Set in | Description |
|----------|--------|-------------|
| `ADMIN_TOKEN` | Render (backend) | Secret token. Never log or return in API responses. |
| `NEXT_PUBLIC_ADMIN_TOKEN` | Vercel (frontend) | Must match `ADMIN_TOKEN`. Admin UI only. |

### What Milestone 4P does NOT do

- No SQL migration required.
- No changes to `/ask` — staff-facing endpoint remains a placeholder.
- No changes to governance flags.
- AC32 remains draft and staff-invisible (`approved_for_staff_visibility=false`).
- Staff-facing RAG is not enabled.

### Live proofs passed

| Test | Expected | Result |
|------|----------|--------|
| `GET /documents` without token | 401 Unauthorized | Passed |
| `GET /health` without token | 200 OK | Passed |
| `POST /ask` without token | 200 OK (placeholder) | Passed |
| `GET /policies` without token | 200 OK | Passed |
| Vercel admin documents page | Loads live registry | Passed |

## Milestone 4Q: AC32 stored chunk reprocess investigation

### Purpose

Investigate whether existing AC32 stored chunks could be reprocessed to remove old PDF extraction artefacts from Supabase rows created before the text-cleaning improvements in Milestone 4L.1.

### Key findings

- Live AC32 chunks still contain old PDF extraction artefacts, including examples like `â¢`, `Â©`, `youâre`, repeated `Page 1/8Page 1/8`, and repeated `Thumhara Centre` strings.
- These artefacts are in existing stored Supabase rows created before Milestone 4L.1's cleaning improvements.
- Milestone 4L.1 improved returned previews and future extraction cleaning but did not rewrite existing stored rows.
- There is no current reprocess endpoint for an existing stored document.
- Re-uploading AC32 would create a duplicate document with a new UUID and must not be used as the cleanup method.

### What a proper future fix would require

- Improved extraction/cleaning logic.
- A protected admin-only `POST /documents/{id}/reprocess` endpoint.
- Controlled cleanup and rebuild of `document_extractions`, `document_chunks`, and `document_embeddings`.
- Regenerating embeddings.
- Proving governance state remains unchanged throughout.

### What Milestone 4Q does NOT do

- No SQL was run during 4Q.
- No code was changed during 4Q.
- AC32 remains draft and staff-invisible (`approved_for_staff_visibility=false`).
- Staff-facing `/ask` remains placeholder only and does not use RAG.

### Decision

Defer AC32 rebuild until before staff-facing RAG or real pilot staff use. Do not manually delete or rebuild rows now.

## Milestone 4R: Staff-facing /ask RAG safety design investigation

### Status

Design investigation only. No code, SQL, governance flags, or endpoints were changed.

### Key decisions

- `/ask` is currently a placeholder only. No RAG is active.
- Staff-facing RAG must not be enabled until a real, clean, fully governed, staff-visible document exists in the system. No such document exists yet.
- AC32 must not be used for staff `/ask` yet: it is staff-invisible (`approved_for_staff_visibility=false`) and its stored chunks contain pre-4L.1 extraction artefacts.
- Dummy and sample documents must never be served to staff `/ask` — they may not be returned as citations or source previews under any circumstances.
- Staff `/ask` must apply stricter gates than admin `answer-debug`. The `allow_dummy_override` bypass that is permitted for admin testing must not exist in the staff path.

### Required document gates for staff /ask

A document must pass **all** of the following before any of its chunks may be retrieved for a staff answer:

| Gate | Required value |
|------|---------------|
| `status` | `approved` |
| `real_document` | `true` |
| `dummy_document` | `false` |
| `is_sensitive` | `false` |
| `escalation_required` | `false` |
| `approved_for_staff_visibility` | `true` |
| `approved_for_source_grounded_answers` | `true` |
| `approved_for_embedding` | `true` |
| `embedding_status` | `indexed` |
| `governance_reviewed_by` | present (non-null) |
| `governance_reviewed_at` | present (non-null) |
| role match | staff user role must match `access_roles` or `access_roles` must include `"All Staff"` |

All gates are AND conditions. Failing any single gate must exclude the document from retrieval.

### Staff response privacy rules

- Responses must return citations and source previews only — no raw chunk text beyond a short preview.
- Must not return: `document_id`, `chunk_id`, similarity scores, storage keys, governance flags, embedding status, raw vectors, or full chunk text.
- Audit logging must not store raw staff query text, `user_id`, staff name or email, or private transcript content.
- Employer dashboard, if built, must show aggregated and anonymised trends only — never individual staff behaviour.

### Recommended scope for Milestone 4S

- Do not build full staff RAG pipeline until at least one safe staff-visible test document pathway exists.
- Next step (4S-prep): prepare one safe staff-visible test policy or SOP document that passes all gates above. AC32 is not suitable; a new or updated document is required.
- Once a qualifying document exists, build the `/ask` RAG path using the gate list above and the privacy rules above.

### What Milestone 4R does NOT do

- No code changes.
- No SQL changes.
- No governance flag changes.
- No changes to `/ask`.
- RAG not enabled.
- AC32 not approved for staff visibility.

## Current milestone status

- PDF upload works (Milestone 4B)
- Document registry persists (Milestone 4C)
- Extracted text and document chunks persist (Milestone 4D)
- Embedding records are prepared per chunk (Milestone 4E)
- Embeddings can be generated for dummy/sample documents (Milestone 4F)
- Admin-only vector search works (Milestone 4G)
- Admin-only source-grounded answer testing works (Milestone 4H)
- **Governance gate active — real documents cannot be embedded without explicit approval (Milestone 4I)**
- **Governance hardened — clearer blocked reasons, human-readable audit summaries, readiness endpoint, readiness checklist (Milestone 4I.1)**
- **Governance blocking proof passed — AC32 is the first controlled real document; embedding/answer/staff-visibility gates confirmed independent (Milestone 4I.4)**
- **Answer-debug approval fix shipped — chunk-level flag no longer blocks document-level approved real documents; AC32 source-grounded answer test passed (Milestone 4I.5)**
- **AC32 answer quality and safety review completed in admin/debug mode — four test queries passed; pre-release issues identified (Milestone 4J)**
- **Backend text-cleaning added — `_clean_extracted_text` applied before storage/chunking; search-vector, answer-debug, and chunks previews are cleaner; existing DB rows not rewritten (Milestone 4L.1)**
- **Named-contact anonymisation added — source-grounded answers replace named individuals with role phrases; prompt-only change; AC32 answer-debug confirmed working (Milestone 4M)**
- **Driving and safety-critical topic caution added — `driving` and `vehicle` added to escalation detection; prompt extended for road safety, statutory obligations, and potential criminal liability (Milestone 4N)**
- **Safety note made deterministic — appended server-side to answer-debug answers when `safety_note` is present; two-run proof confirms caution appears on every driving query (Milestone 4N.1)**
- **Stale wording corrected — embedding-readiness note, chunk `embedding_note`, and `/ask` connected notice now accurately reflect that admin-only vector search and answer-debug are active while staff-facing RAG remains disabled (Milestone 4O.1)**
- **Admin bearer-token protection added — all admin/debug endpoints require `Authorization: Bearer <token>`; public endpoints (`/`, `/health`, `/ask`, `/policies`) remain open; no SQL required (Milestone 4P)**
- **AC32 stored chunk reprocess investigated — existing rows contain pre-4L.1 artefacts; no reprocess endpoint exists; re-upload rejected as cleanup method; rebuild deferred until before staff-facing RAG (Milestone 4Q)**
- **Staff-facing /ask RAG safety design completed — document gates, response privacy rules, and 4S-prep scope defined; no document currently qualifies for staff RAG; AC32 excluded; no code or SQL changes (Milestone 4R)**
- Staff-facing `/ask` remains a placeholder — RAG is governed-disabled
- No real Thumhara/QCS documents should be embedded until `approved_for_embedding=true` is confirmed by a human reviewer

## Next steps (Milestone 4S+)

- **4S-prep:** Prepare one safe, real, staff-visible test policy or SOP document that passes all Milestone 4R document gates. AC32 is not suitable; a new or updated document is required.
- Once a qualifying document is indexed and all gates pass, build the staff `/ask` RAG path using the Milestone 4R gate list and privacy rules.
- Governance sign-off and safety review of real Thumhara/QCS policy documents, then set `real_document=true`, `approved_for_embedding=true`, `approved_for_source_grounded_answers=true`, `approved_for_staff_visibility=true` for approved documents.
- Authentication and organisation membership verification.
- Rate limiting and anonymised query logging (no user-level data, no raw query text stored).
- Role-based access control on admin endpoints.
- AC32 rebuild (reprocess endpoint) before staff-facing RAG if AC32 is later approved for staff visibility.
