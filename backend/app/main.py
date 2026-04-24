from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="WorkTwin API", version="0.1.0")


class AskRequest(BaseModel):
    organisation_id: str
    user_id: str
    user_role: str
    question: str


class Source(BaseModel):
    document_name: str
    section: Optional[str] = None
    page: Optional[int] = None


class AskResponse(BaseModel):
    answer: str
    next_steps: List[str]
    sources: List[Source]
    escalate_if: List[str]
    learning_option: Optional[str] = None


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "worktwin-api"}


@app.post("/ask", response_model=AskResponse)
def ask_worktwin(payload: AskRequest):
    """
    Starter placeholder.

    Next build steps:
    1. authenticate user
    2. check organisation and role permissions
    3. classify question risk
    4. retrieve relevant approved document chunks
    5. call LLM with strict system prompt
    6. return source-cited answer
    7. log anonymised topic insight
    """

    return AskResponse(
        answer=(
            "This is a placeholder response. In the real MVP, WorkTwin will answer "
            "from approved company documents only and cite the source used."
        ),
        next_steps=[
            "Upload approved company policies.",
            "Connect document retrieval.",
            "Add source-cited answer generation.",
        ],
        sources=[
            Source(document_name="Demo Medication Policy", section="Refusal of Medication", page=4)
        ],
        escalate_if=[
            "The situation involves immediate risk.",
            "The policy does not clearly answer the question.",
            "A safeguarding, medication, HR or legal issue is involved.",
        ],
        learning_option="Would you like to practise this with a short scenario?",
    )


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Starter placeholder for document upload.

    Next build steps:
    1. store file securely
    2. extract text
    3. chunk text
    4. create embeddings
    5. store chunks with organisation_id, role access and source metadata
    """

    return {
        "filename": file.filename,
        "status": "received",
        "next_step": "Add secure storage, text extraction and embedding pipeline.",
    }
