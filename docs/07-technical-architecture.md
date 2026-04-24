# Technical Architecture

## MVP stack

Frontend:
- Next.js
- Tailwind CSS
- shadcn/ui

Backend:
- Python FastAPI

Database:
- PostgreSQL
- pgvector for embeddings

Storage:
- Supabase Storage or AWS S3

AI:
- OpenAI or Claude API

Auth:
- Clerk, Auth0 or Supabase Auth

Hosting:
- Vercel for frontend
- Render/Fly.io/Supabase for early MVP
- AWS later for production

## Core flow

1. Admin uploads a document
2. Backend extracts text
3. Text is chunked into sections
4. Chunks are embedded
5. Embeddings are stored in pgvector
6. Employee asks a question
7. System checks organisation and role permissions
8. Retrieval finds relevant approved chunks
9. LLM answers using retrieved context
10. Response includes source references
11. High-risk questions trigger escalation guidance
12. Employer dashboard receives anonymised topic data

## Data separation

Tenant separation:
- every table includes organisation_id

Permission separation:
- every document can be assigned to roles/departments

Privacy separation:
- private employee memory is separate from employer analytics
- employer analytics must be aggregated/anonymised

## Key tables

- organisations
- users
- documents
- document_chunks
- document_permissions
- conversations
- messages
- private_memory
- learning_paths
- learning_items
- quiz_attempts
- anonymous_insights
- audit_logs
