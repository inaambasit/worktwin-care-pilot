import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional, List, Dict, Any
from datetime import datetime
import uuid

app = FastAPI(title="WorkTwin API", version="0.1.0")

_default_origins = "http://localhost:3000,http://localhost:3001"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# ---------------------------------------------------------------------------
# Ask endpoint models
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

    requires_escalation: bool = False
    allowed_to_answer: bool = True
    source_confidence: Optional[float] = None
    risk_category: Literal[
        "standard", "policy", "hr", "legal", "wellbeing", "compliance", "vertical_sensitive"
    ] = "standard"
    vertical_subcategory: Optional[str] = None
    anonymised_insight_topic: Optional[str] = None


# ---------------------------------------------------------------------------
# Document Registry models
# ---------------------------------------------------------------------------

DocumentStatus = Literal["draft", "approved", "under_review", "archived"]
DocumentVertical = Literal[
    "care", "finance", "property", "recruitment",
    "healthcare_admin", "training_provider", "general", "custom",
]
EmbeddingStatus = Literal["not_started", "pending", "processing", "indexed", "failed"]
TranslationStatus = Literal["not_required", "pending", "in_progress", "complete"]


class DocumentRecord(BaseModel):
    id: str
    organisation_id: str
    title: str
    description: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None          # pdf | docx | txt
    file_size_bytes: Optional[int] = None
    storage_key: Optional[str] = None        # placeholder path / S3 key
    vertical: DocumentVertical = "care"
    category: str
    tags: List[str] = []
    status: DocumentStatus = "draft"
    access_roles: List[str] = []
    is_sensitive: bool = False
    escalation_required: bool = False
    approved_for_ai_answers: bool = False
    contains_personal_data_warning: bool = False
    primary_language: str = "en"
    available_languages: List[str] = ["en"]
    translation_status: TranslationStatus = "not_required"
    human_review_required: bool = True
    version: str = "1.0"
    review_due_date: Optional[str] = None    # ISO date string YYYY-MM-DD
    embedding_status: EmbeddingStatus = "not_started"
    created_by: str = "admin"
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = {}


class DocumentCreate(BaseModel):
    organisation_id: str = "demo-org"
    title: str
    description: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    storage_key: Optional[str] = None
    vertical: DocumentVertical = "care"
    category: str
    tags: List[str] = []
    status: DocumentStatus = "draft"
    access_roles: List[str] = []
    is_sensitive: bool = False
    escalation_required: bool = False
    approved_for_ai_answers: bool = False
    contains_personal_data_warning: bool = False
    primary_language: str = "en"
    available_languages: List[str] = ["en"]
    translation_status: TranslationStatus = "not_required"
    human_review_required: bool = True
    version: str = "1.0"
    review_due_date: Optional[str] = None
    metadata: Dict[str, Any] = {}


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[DocumentStatus] = None
    access_roles: Optional[List[str]] = None
    is_sensitive: Optional[bool] = None
    escalation_required: Optional[bool] = None
    approved_for_ai_answers: Optional[bool] = None
    contains_personal_data_warning: Optional[bool] = None
    primary_language: Optional[str] = None
    available_languages: Optional[List[str]] = None
    translation_status: Optional[TranslationStatus] = None
    human_review_required: Optional[bool] = None
    version: Optional[str] = None
    review_due_date: Optional[str] = None
    embedding_status: Optional[EmbeddingStatus] = None
    metadata: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# In-memory document registry (placeholder — Milestone 4B will add real storage)
# All documents here are sample demo data only. No real personal data.
# ---------------------------------------------------------------------------

def _ts(d: str) -> str:
    return f"{d}T00:00:00Z"

_documents: List[Dict[str, Any]] = [
    {
        "id": "doc-001",
        "organisation_id": "demo-org",
        "title": "Staff Handbook",
        "description": "Comprehensive guide for all Thumhara Centre staff covering employment terms, conduct standards, key procedures and benefits.",
        "file_name": "staff_handbook_v3.pdf",
        "file_type": "pdf",
        "file_size_bytes": 1468006,
        "storage_key": "placeholder/demo-org/staff_handbook_v3.pdf",
        "vertical": "care",
        "category": "HR",
        "tags": ["onboarding", "conduct", "employment", "benefits"],
        "status": "approved",
        "access_roles": ["All Staff"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en", "ur", "pa"],
        "translation_status": "complete",
        "human_review_required": False,
        "version": "3.0",
        "review_due_date": "2026-01-12",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-01-12"),
        "updated_at": _ts("2025-01-12"),
        "metadata": {},
    },
    {
        "id": "doc-002",
        "organisation_id": "demo-org",
        "title": "Medication Administration Policy",
        "description": "Procedure for safe medication administration including MAR chart guidance, controlled drugs handling and error reporting.",
        "file_name": "medication_admin_policy_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 911360,
        "storage_key": "placeholder/demo-org/medication_admin_policy_v2.pdf",
        "vertical": "care",
        "category": "Medication",
        "tags": ["medication", "MAR", "controlled drugs", "safety"],
        "status": "approved",
        "access_roles": ["Care Worker", "Senior Carer", "Nurse"],
        "is_sensitive": True,
        "escalation_required": True,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": False,
        "version": "2.1",
        "review_due_date": "2026-01-20",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-01-20"),
        "updated_at": _ts("2025-01-20"),
        "metadata": {},
    },
    {
        "id": "doc-003",
        "organisation_id": "demo-org",
        "title": "Safeguarding Policy and Procedure",
        "description": "Adults and children safeguarding policy including reporting routes, designated lead contacts and CQC compliance requirements.",
        "file_name": "safeguarding_policy_v4.pdf",
        "file_type": "pdf",
        "file_size_bytes": 1153433,
        "storage_key": "placeholder/demo-org/safeguarding_policy_v4.pdf",
        "vertical": "care",
        "category": "Safeguarding",
        "tags": ["safeguarding", "CQC", "reporting", "adults", "children"],
        "status": "approved",
        "access_roles": ["All Staff"],
        "is_sensitive": True,
        "escalation_required": True,
        "approved_for_ai_answers": False,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en", "ur"],
        "translation_status": "in_progress",
        "human_review_required": True,
        "version": "4.0",
        "review_due_date": "2026-02-05",
        "embedding_status": "not_started",
        "created_by": "admin",
        "created_at": _ts("2025-02-05"),
        "updated_at": _ts("2025-02-05"),
        "metadata": {},
    },
    {
        "id": "doc-004",
        "organisation_id": "demo-org",
        "title": "Health and Safety Policy",
        "description": "Workplace health and safety policy covering risk assessments, manual handling, COSHH and lone working procedures.",
        "file_name": "health_safety_policy_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 778240,
        "storage_key": "placeholder/demo-org/health_safety_policy_v2.pdf",
        "vertical": "care",
        "category": "Health and Safety",
        "tags": ["H&S", "risk assessment", "manual handling", "COSHH"],
        "status": "under_review",
        "access_roles": ["All Staff"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": False,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": True,
        "version": "2.0",
        "review_due_date": "2026-03-08",
        "embedding_status": "not_started",
        "created_by": "admin",
        "created_at": _ts("2025-03-08"),
        "updated_at": _ts("2025-03-08"),
        "metadata": {},
    },
    {
        "id": "doc-005",
        "organisation_id": "demo-org",
        "title": "Complaints Procedure",
        "description": "Step-by-step procedure for handling service user and family complaints, including timelines, recording requirements and escalation routes.",
        "file_name": "complaints_procedure_v1.pdf",
        "file_type": "pdf",
        "file_size_bytes": 440320,
        "storage_key": "placeholder/demo-org/complaints_procedure_v1.pdf",
        "vertical": "care",
        "category": "Complaints",
        "tags": ["complaints", "feedback", "service users", "families"],
        "status": "approved",
        "access_roles": ["All Staff"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en", "ur", "pa", "ar"],
        "translation_status": "complete",
        "human_review_required": False,
        "version": "1.2",
        "review_due_date": "2026-02-14",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-02-14"),
        "updated_at": _ts("2025-02-14"),
        "metadata": {},
    },
    {
        "id": "doc-006",
        "organisation_id": "demo-org",
        "title": "Infection Control Procedure",
        "description": "Standard precautions for infection prevention and control, PPE guidance, hand hygiene, and outbreak management protocols.",
        "file_name": "infection_control_v3.pdf",
        "file_type": "pdf",
        "file_size_bytes": 696320,
        "storage_key": "placeholder/demo-org/infection_control_v3.pdf",
        "vertical": "care",
        "category": "Health and Safety",
        "tags": ["infection control", "PPE", "hygiene", "outbreak"],
        "status": "approved",
        "access_roles": ["All Staff"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": False,
        "version": "3.1",
        "review_due_date": "2026-03-01",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-03-01"),
        "updated_at": _ts("2025-03-01"),
        "metadata": {},
    },
    {
        "id": "doc-007",
        "organisation_id": "demo-org",
        "title": "Mental Capacity Act Guidance",
        "description": "Practical guidance on applying the Mental Capacity Act 2005 in care settings, including best interests decisions and advocacy.",
        "file_name": "mental_capacity_act_guidance_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 532480,
        "storage_key": "placeholder/demo-org/mental_capacity_act_guidance_v2.pdf",
        "vertical": "care",
        "category": "Training",
        "tags": ["MCA", "mental capacity", "best interests", "DoLS", "advocacy"],
        "status": "approved",
        "access_roles": ["Care Worker", "Senior Carer", "Nurse"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "pending",
        "human_review_required": False,
        "version": "2.0",
        "review_due_date": "2025-11-22",
        "embedding_status": "pending",
        "created_by": "admin",
        "created_at": _ts("2024-11-22"),
        "updated_at": _ts("2024-11-22"),
        "metadata": {},
    },
    {
        "id": "doc-008",
        "organisation_id": "demo-org",
        "title": "Incident Reporting Procedure",
        "description": "Process for reporting accidents, near misses, and incidents including RIDDOR obligations, Datix recording and duty of candour.",
        "file_name": "incident_reporting_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 348160,
        "storage_key": "placeholder/demo-org/incident_reporting_v2.pdf",
        "vertical": "care",
        "category": "Health and Safety",
        "tags": ["incident", "accident", "RIDDOR", "duty of candour"],
        "status": "approved",
        "access_roles": ["All Staff"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": False,
        "version": "2.0",
        "review_due_date": "2026-04-03",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-04-03"),
        "updated_at": _ts("2025-04-03"),
        "metadata": {},
    },
    {
        "id": "doc-009",
        "organisation_id": "demo-org",
        "title": "Disciplinary and Grievance Policy",
        "description": "Formal procedure for handling disciplinary matters and employee grievances, in line with ACAS Code of Practice.",
        "file_name": "disciplinary_grievance_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 624640,
        "storage_key": "placeholder/demo-org/disciplinary_grievance_v2.pdf",
        "vertical": "care",
        "category": "HR",
        "tags": ["disciplinary", "grievance", "ACAS", "HR"],
        "status": "approved",
        "access_roles": ["Manager", "HR Coordinator"],
        "is_sensitive": True,
        "escalation_required": True,
        "approved_for_ai_answers": False,
        "contains_personal_data_warning": True,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": True,
        "version": "2.0",
        "review_due_date": "2026-01-10",
        "embedding_status": "not_started",
        "created_by": "admin",
        "created_at": _ts("2025-01-10"),
        "updated_at": _ts("2025-01-10"),
        "metadata": {},
    },
    {
        "id": "doc-010",
        "organisation_id": "demo-org",
        "title": "End of Life Care Policy",
        "description": "Guidance on providing compassionate end of life care, including DNACPR decisions, Lasting Power of Attorney and family communication.",
        "file_name": "end_of_life_care_v1.pdf",
        "file_type": "pdf",
        "file_size_bytes": 491520,
        "storage_key": "placeholder/demo-org/end_of_life_care_v1.pdf",
        "vertical": "care",
        "category": "Training",
        "tags": ["end of life", "DNACPR", "palliative", "LPA"],
        "status": "under_review",
        "access_roles": ["Senior Carer", "Nurse", "Manager"],
        "is_sensitive": True,
        "escalation_required": False,
        "approved_for_ai_answers": False,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": True,
        "version": "1.0",
        "review_due_date": "2026-03-15",
        "embedding_status": "not_started",
        "created_by": "admin",
        "created_at": _ts("2025-03-15"),
        "updated_at": _ts("2025-03-15"),
        "metadata": {},
    },
    {
        "id": "doc-011",
        "organisation_id": "demo-org",
        "title": "Rota and Leave Management SOP",
        "description": "Standard operating procedure for rota planning, annual leave requests, shift swaps and absence recording.",
        "file_name": "rota_leave_sop_draft.docx",
        "file_type": "docx",
        "file_size_bytes": 215040,
        "storage_key": "placeholder/demo-org/rota_leave_sop_draft.docx",
        "vertical": "care",
        "category": "HR",
        "tags": ["rota", "leave", "absence", "shift"],
        "status": "draft",
        "access_roles": ["Manager", "HR Coordinator"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": False,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en"],
        "translation_status": "not_required",
        "human_review_required": True,
        "version": "0.1",
        "review_due_date": "2026-04-22",
        "embedding_status": "not_started",
        "created_by": "admin",
        "created_at": _ts("2025-04-22"),
        "updated_at": _ts("2025-04-22"),
        "metadata": {},
    },
    {
        "id": "doc-012",
        "organisation_id": "demo-org",
        "title": "New Staff Induction Checklist",
        "description": "Structured onboarding checklist for new starters covering mandatory training, policy sign-offs, DBS checks and buddy assignment.",
        "file_name": "induction_checklist_v2.pdf",
        "file_type": "pdf",
        "file_size_bytes": 184320,
        "storage_key": "placeholder/demo-org/induction_checklist_v2.pdf",
        "vertical": "care",
        "category": "Onboarding",
        "tags": ["induction", "onboarding", "DBS", "mandatory training"],
        "status": "approved",
        "access_roles": ["All Staff", "Manager"],
        "is_sensitive": False,
        "escalation_required": False,
        "approved_for_ai_answers": True,
        "contains_personal_data_warning": False,
        "primary_language": "en",
        "available_languages": ["en", "ur", "pa", "bn"],
        "translation_status": "in_progress",
        "human_review_required": False,
        "version": "2.0",
        "review_due_date": "2026-06-01",
        "embedding_status": "indexed",
        "created_by": "admin",
        "created_at": _ts("2025-03-20"),
        "updated_at": _ts("2025-03-20"),
        "metadata": {},
    },
]


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _find_doc(doc_id: str) -> Optional[Dict[str, Any]]:
    return next((d for d in _documents if d["id"] == doc_id), None)


# ---------------------------------------------------------------------------
# Root and health check
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "worktwin-api",
        "status": "ok",
        "message": "WorkTwin backend is running",
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "worktwin-api"}


# ---------------------------------------------------------------------------
# Ask endpoint
# ---------------------------------------------------------------------------

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
            Source(document_name="Demo Company Policy", section="See relevant policy section", page=None)
        ],
        escalate_if=[
            "The situation involves immediate risk.",
            "The policy does not clearly answer the question.",
            "A safeguarding, medication, HR, legal, compliance or wellbeing issue is involved.",
        ],
        learning_option="Would you like to practise this with a short scenario?",
        requires_escalation=False,
        allowed_to_answer=True,
        source_confidence=None,
        risk_category="standard",
        vertical_subcategory=None,
        anonymised_insight_topic=None,
    )


# ---------------------------------------------------------------------------
# Document Registry endpoints (Milestone 4A — in-memory placeholder)
# ---------------------------------------------------------------------------

@app.get("/documents", response_model=List[DocumentRecord])
def list_documents(
    status: Optional[str] = None,
    category: Optional[str] = None,
    vertical: Optional[str] = None,
):
    docs = _documents
    if status:
        docs = [d for d in docs if d["status"] == status]
    if category:
        docs = [d for d in docs if d["category"] == category]
    if vertical:
        docs = [d for d in docs if d["vertical"] == vertical]
    return docs


@app.get("/documents/{doc_id}", response_model=DocumentRecord)
def get_document(doc_id: str):
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.post("/documents", response_model=DocumentRecord, status_code=201)
def create_document(payload: DocumentCreate):
    now = _now()
    doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now,
        **payload.model_dump(),
    }
    _documents.append(doc)
    return doc


@app.patch("/documents/{doc_id}", response_model=DocumentRecord)
def update_document(doc_id: str, payload: DocumentUpdate):
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    updates = payload.model_dump(exclude_none=True)
    doc.update(updates)
    doc["updated_at"] = _now()
    return doc


@app.post("/documents/{doc_id}/approve", response_model=DocumentRecord)
def approve_document(doc_id: str):
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["status"] = "approved"
    doc["updated_at"] = _now()
    return doc


@app.post("/documents/{doc_id}/archive", response_model=DocumentRecord)
def archive_document(doc_id: str):
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["status"] = "archived"
    doc["updated_at"] = _now()
    return doc


# ---------------------------------------------------------------------------
# Staff-safe policy library endpoint (Milestone 4A.1)
# Returns only approved documents visible to the supplied user_role.
# This endpoint is intentionally narrower than /documents (admin).
# ---------------------------------------------------------------------------

@app.get("/policies", response_model=List[DocumentRecord])
def list_policies(
    user_role: Optional[str] = None,
    vertical: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
):
    """
    Staff-safe policy library.

    Safety guarantees enforced here (pre-RAG):
    - Only approved documents are returned.
    - Documents are filtered by the caller's role — a staff member only
      receives policies their role is permitted to see.
    - No embedding status, storage keys or internal pipeline metadata
      are used to determine visibility; only explicit access_roles.
    - No AI answers are served from this endpoint — it is read-only metadata.
    - Documents with approved_for_ai_answers=False or escalation_required=True
      are still listed here so staff can read the policy, but the frontend
      must block the "Ask WorkTwin" CTA for those documents.
    """
    docs = [d for d in _documents if d["status"] == "approved"]
    if user_role:
        docs = [
            d for d in docs
            if "All Staff" in d["access_roles"] or user_role in d["access_roles"]
        ]
    if vertical:
        docs = [d for d in docs if d["vertical"] == vertical]
    if category:
        docs = [d for d in docs if d["category"] == category]
    if language:
        docs = [d for d in docs if language in d["available_languages"]]
    return docs


# ---------------------------------------------------------------------------
# Legacy document upload placeholder (kept for backward compatibility)
# ---------------------------------------------------------------------------

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Placeholder for file upload.

    Next build steps (Milestone 4B):
    1. Store file securely (S3 / Supabase).
    2. Extract text (PyMuPDF / python-docx).
    3. Chunk text with metadata (organisation_id, document_id, role access).
    4. Create embeddings and store in pgvector.
    """
    return {
        "filename": file.filename,
        "status": "received",
        "next_step": "Add secure storage, text extraction and embedding pipeline (Milestone 4B).",
    }
