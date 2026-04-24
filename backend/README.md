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

## First endpoints

- GET /health
- POST /ask
- POST /documents/upload

These are starter placeholders. The next step is to connect:
- authentication
- document storage
- text extraction
- embeddings
- pgvector retrieval
- LLM response generation
