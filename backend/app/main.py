from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Literal, Optional, List

app = FastAPI(title="WorkTwin API", version="0.1.0")

# ---------------------------------------------------------------------------
# Privacy and safety contract (enforced in the real build, documented here)
#
# - Private employee chat transcripts are NEVER exposed to managers or admins.
# - Employer dashboard insights must be aggregated and anonymised only.
#   Groups below the minimum threshold are suppressed entirely.
# - Sensitive topics (safeguarding, medication incidents, HR, legal, wellbeing)
#   must trigger human escalation guidance — NOT a direct AI answer.
# - All answers must be grounded in approved, organisation-uploaded documents.
#   WorkTwin must not answer from general training knowledge.
# - No performance scoring, sentiment analysis, productivity tracking or
#   surveillance of individual employees is permitted.
# ---------------------------------------------------------------------------


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

    # --- Future privacy / RAG contract fields ---

    # TODO: Set True when the question topic requires human escalation
    # (safeguarding, medication incident, HR, legal, wellbeing).
    # Front-end must suppress the answer and show escalation contacts instead.
    requires_escalation: bool = False

    # TODO: Set False when the question falls outside permitted answer scope
    # (e.g. no approved document covers the topic, or topic is restricted).
    # Front-end must show a "speak to your manager" message instead of an answer.
    allowed_to_answer: bool = True

    # TODO: Confidence score from the RAG retrieval step (0.0 – 1.0).
    # Answers below a minimum threshold should not be returned to the user.
    source_confidence: Optional[float] = None

    # TODO: Broad risk category assigned during question classification.
    # Used to route to escalation contacts and apply topic-level access controls.
    # Values: "standard" | "medication" | "safeguarding" | "hr" | "legal" | "wellbeing"
    risk_category: Literal[
        "standard", "medication", "safeguarding", "hr", "legal", "wellbeing"
    ] = "standard"

    # TODO: Anonymised topic label for aggregated insight logging.
    # This must NEVER include any personally identifying information.
    # Stored against organisation_id only — never against user_id.
    anonymised_insight_topic: Optional[str] = None


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "worktwin-api"}


@app.post("/ask", response_model=AskResponse)
def ask_worktwin(payload: AskRequest):
    """
    Starter placeholder.

    Next build steps:
    1. Authenticate user and verify organisation membership.
    2. Check role permissions and document access controls.
    3. Classify question risk category — route sensitive topics to escalation.
    4. Retrieve relevant approved document chunks via RAG pipeline.
    5. Call LLM with strict system prompt: answer from approved documents only.
    6. Return source-cited answer with confidence score.
    7. Log anonymised topic insight (organisation-level only, never user-level).
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
        requires_escalation=False,
        allowed_to_answer=True,
        source_confidence=None,
        risk_category="standard",
        anonymised_insight_topic=None,
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
