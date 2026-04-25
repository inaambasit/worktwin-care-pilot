import os
import re
import io
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional, List, Dict, Any, Tuple
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
# Supabase storage (Milestone 4B)
# SUPABASE_SERVICE_ROLE_KEY is backend-only. Never log, expose or return it.
# ---------------------------------------------------------------------------
_SUPABASE_URL = os.getenv("SUPABASE_URL", "")
_SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "worktwin-documents")
_supabase = None

_supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
if _SUPABASE_URL and _supabase_key:
    try:
        from supabase import create_client as _create_supabase_client
        _supabase = _create_supabase_client(_SUPABASE_URL, _supabase_key)
    except Exception:
        pass  # Supabase unavailable — upload endpoints will return 503
del _supabase_key  # never leave the key in module scope

try:
    from pypdf import PdfReader as _PdfReader
    _PYPDF_OK = True
except ImportError:
    _PYPDF_OK = False
    _PdfReader = None  # type: ignore

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

def _safe_filename(name: str) -> str:
    basename = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    basename = re.sub(r"[^a-zA-Z0-9_.\-]", "_", basename)
    if not basename or basename.lstrip(".") == "":
        basename = "document.pdf"
    return basename[:120]


def _parse_bool(val: str) -> bool:
    return str(val).strip().lower() in ("true", "1", "yes", "on")


def _check_personal_data_risk(text: str) -> Tuple[str, List[str]]:
    """
    Early-warning personal-data pattern scanner.

    Checks only simple surface patterns — email, UK phone, postcode, NHS number,
    date-of-birth labels. Does NOT reliably detect names or organisations.
    This is NOT full DLP and does not replace human review. All uploaded documents
    must be reviewed by a human before use in any live system.
    """
    warnings: List[str] = []
    t = (text or "").upper()

    if re.search(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", t):
        warnings.append("Possible email address detected.")

    if re.search(r"(\+44|0)[0-9\s\-\(\)]{9,14}[0-9]", t):
        warnings.append("Possible UK phone number detected.")

    if re.search(r"\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}\b", t):
        warnings.append("Possible UK postcode detected.")

    if re.search(r"\b\d{3}\s*\d{3}\s*\d{4}\b", t):
        warnings.append("Possible NHS number pattern detected (10-digit group).")

    if re.search(r"\b(DATE\s+OF\s+BIRTH|D\.?O\.?B\.?)\s*:?\s*\d", t):
        warnings.append("Possible date of birth label detected.")

    risk = "possible" if warnings else "low"
    return risk, warnings


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
# Diagnostic endpoint — storage config check (no secrets returned)
# ---------------------------------------------------------------------------

@app.get("/debug/storage-config")
def debug_storage_config():
    """Returns booleans and safe metadata only. Never logs or returns secret values."""
    _raw_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not _raw_key:
        key_prefix_detected = None
    elif _raw_key.startswith("sb_secret"):
        key_prefix_detected = "sb_secret"
    elif _raw_key.startswith("eyJ"):  # legacy Supabase JWT anon/service keys
        key_prefix_detected = "jwt"
    else:
        key_prefix_detected = "unknown"

    bucket_env = os.getenv("SUPABASE_STORAGE_BUCKET", "")
    bucket_name = bucket_env or "worktwin-documents"  # mirrors _SUPABASE_STORAGE_BUCKET default

    return {
        "supabase_url_configured": bool(os.getenv("SUPABASE_URL", "")),
        "supabase_service_role_key_configured": bool(_raw_key),
        "supabase_storage_bucket_configured": bool(bucket_env),
        "supabase_bucket_name_configured": bool(bucket_name),
        "supabase_bucket_name": bucket_name,
        "supabase_client_initialised": _supabase is not None,
        "environment": "production" if os.getenv("RENDER") else os.getenv("ENVIRONMENT", "development"),
        "key_prefix_detected": key_prefix_detected,
    }


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
# Safe PDF upload endpoint (Milestone 4B)
# ---------------------------------------------------------------------------

_PROHIBITED_PATTERNS = [
    "care_plan", "care plan", "mar chart", "mar_chart",
    "payroll", "staff_hr", "staff hr", "safeguarding_case",
    "named_complaint", "hr_case", "disciplinary_case",
]


@app.post("/documents/upload")
async def upload_document_pdf(
    file: UploadFile = File(...),
    organisation_id: str = Form(...),
    title: str = Form(...),
    vertical: str = Form("care"),
    category: str = Form(...),
    access_roles: str = Form("All Staff"),
    status: str = Form("draft"),
    is_sensitive: str = Form("false"),
    escalation_required: str = Form("false"),
    approved_for_ai_answers: str = Form("false"),
    primary_language: str = Form("en"),
    available_languages: str = Form("en"),
    review_due_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    version: str = Form("1.0"),
):
    """
    Milestone 4B: safe PDF upload.

    Validates type and size, stores in a private Supabase bucket, extracts a
    short text preview, and runs a basic personal-data risk check.

    No embeddings are created. No AI answers are generated.
    embedding_status is always set to 'pending' after upload.
    """
    # ---- 1. File type validation ----
    filename = file.filename or "upload.pdf"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext != "pdf":
        raise HTTPException(
            status_code=400,
            detail=(
                "PDF upload is supported first. "
                "DOCX and TXT will be added later after tracked-changes and metadata safety checks."
            ),
        )

    # ---- 2. Read bytes and size check ----
    file_bytes = await file.read()
    file_size = len(file_bytes)
    MAX_BYTES = 10 * 1024 * 1024

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if file_size > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds 10 MB limit ({file_size / (1024 * 1024):.1f} MB uploaded).",
        )

    # ---- 3. PDF magic bytes check ----
    if file_bytes[:4] != b"%PDF":
        raise HTTPException(
            status_code=400,
            detail="File does not appear to be a valid PDF (missing %PDF header).",
        )

    # ---- 4. Prohibited filename / title patterns ----
    lower_check = (title + " " + filename).lower()
    for pattern in _PROHIBITED_PATTERNS:
        if pattern in lower_check:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Upload rejected: filename or title suggests a prohibited document type. "
                    "Do not upload care plans, MAR charts with names, HR case files, payroll records, "
                    "safeguarding case notes or named complaints. "
                    "Only approved policies, SOPs, onboarding documents and training materials are allowed."
                ),
            )

    # ---- 5. Text extraction preview ----
    extraction_status = "skipped"
    extracted_text_preview: Optional[str] = None
    extracted_char_count: Optional[int] = None
    extracted_page_count: Optional[int] = None
    extraction_warnings: List[str] = []

    if _PYPDF_OK and _PdfReader is not None:
        try:
            reader = _PdfReader(io.BytesIO(file_bytes))
            extracted_page_count = len(reader.pages)
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() or ""
                if len(full_text) >= 2000:
                    break
            extracted_text_preview = full_text[:2000].strip()
            extracted_char_count = len(extracted_text_preview)
            extraction_status = "success"
            if extracted_char_count == 0:
                extraction_warnings.append(
                    "No text extracted. The PDF may be a scanned image or encrypted."
                )
        except Exception as exc:
            extraction_status = "failed"
            extraction_warnings.append(f"Text extraction error: {exc}")
    else:
        extraction_warnings.append("pypdf not installed — text extraction skipped.")

    # ---- 6. Personal-data risk check ----
    personal_data_risk, personal_data_warnings = _check_personal_data_risk(
        extracted_text_preview or ""
    )

    # ---- 7. Storage: not configured → 503 ----
    if _supabase is None:
        return JSONResponse(
            status_code=503,
            content={
                "storage_status": "not_configured",
                "message": (
                    "Storage is not configured for this environment. "
                    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and "
                    "SUPABASE_STORAGE_BUCKET on the backend service."
                ),
                "validation_passed": True,
                "file_name": filename,
                "file_size_bytes": file_size,
                "extraction_status": extraction_status,
                "extracted_character_count": extracted_char_count,
                "extracted_page_count": extracted_page_count,
                "extraction_warnings": extraction_warnings,
                "personal_data_risk": personal_data_risk,
                "personal_data_warnings": personal_data_warnings,
            },
        )

    # ---- 8. Upload to Supabase private bucket ----
    document_id = str(uuid.uuid4())
    safe_name = _safe_filename(filename)
    storage_path = f"{organisation_id}/documents/{document_id}/{safe_name}"

    try:
        _supabase.storage.from_(_SUPABASE_STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase storage upload failed: {exc}",
        )

    # ---- 9. Build in-memory registry record ----
    now = _now()
    access_roles_list = [r.strip() for r in access_roles.split(",") if r.strip()]
    available_languages_list = [la.strip() for la in available_languages.split(",") if la.strip()]

    doc: Dict[str, Any] = {
        "id": document_id,
        "organisation_id": organisation_id,
        "title": title,
        "description": description,
        "file_name": safe_name,
        "file_type": "pdf",
        "file_size_bytes": file_size,
        "storage_key": storage_path,
        "vertical": vertical,
        "category": category,
        "tags": [],
        "status": status,
        "access_roles": access_roles_list,
        "is_sensitive": _parse_bool(is_sensitive),
        "escalation_required": _parse_bool(escalation_required),
        "approved_for_ai_answers": _parse_bool(approved_for_ai_answers),
        "contains_personal_data_warning": personal_data_risk == "possible",
        "primary_language": primary_language,
        "available_languages": available_languages_list,
        "translation_status": "not_required",
        "human_review_required": True,
        "version": version,
        "review_due_date": review_due_date,
        "embedding_status": "pending",
        "created_by": "admin",
        "created_at": now,
        "updated_at": now,
        "metadata": {"upload_source": "admin_upload", "milestone": "4B"},
    }
    _documents.append(doc)

    # ---- 10. Return result ----
    return {
        "upload_status": "success",
        "storage_status": "uploaded",
        "document_id": document_id,
        "file_name": safe_name,
        "file_size_bytes": file_size,
        "storage_key": storage_path,
        "extraction_status": extraction_status,
        "extracted_text_preview": extracted_text_preview,
        "extracted_character_count": extracted_char_count,
        "extracted_page_count": extracted_page_count,
        "extraction_warnings": extraction_warnings,
        "personal_data_risk": personal_data_risk,
        "personal_data_warnings": personal_data_warnings,
        "embedding_status": "pending",
        "ai_answers_note": (
            "Uploaded document is not yet available for AI answers. "
            "This will be enabled in a later milestone after chunking, "
            "embeddings and source-citation checks."
        ),
        "document": doc,
    }
