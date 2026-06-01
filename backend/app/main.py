import os
import re
import io
from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional, List, Dict, Any, Tuple
from datetime import datetime
import uuid
import time
import threading

from app.staff_context import staff_context_from_header
from app.jwt_auth import validate_staff_jwt
from app.membership import resolve_staff_context

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
_SUPABASE_HTTP_KEY: str = ""   # used only for HTTP storage fallback; never logged or returned
_SUPABASE_DB_KEY: str = ""     # used only for PostgREST DB calls; never logged or returned
_STORAGE_METHOD: str = "none"  # "supabase_client" | "http_fallback" | "none"

_raw_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
if _SUPABASE_URL and _raw_service_key:
    _SUPABASE_DB_KEY = _raw_service_key  # store for PostgREST calls in both code paths
    try:
        from supabase import create_client as _create_supabase_client
        _supabase = _create_supabase_client(_SUPABASE_URL, _raw_service_key)
        _STORAGE_METHOD = "supabase_client"
    except Exception:
        pass  # fall through to HTTP fallback below

    if _supabase is None:
        # Python client could not initialise (e.g. sb_secret_ key format).
        # Use the Supabase Storage REST API directly instead.
        _SUPABASE_HTTP_KEY = _raw_service_key
        _STORAGE_METHOD = "http_fallback"

del _raw_service_key  # remove temp; _SUPABASE_HTTP_KEY / _SUPABASE_DB_KEY hold the values when needed
_DB_CONFIGURED: bool = bool(_SUPABASE_URL and _SUPABASE_DB_KEY)

# ---------------------------------------------------------------------------
# Milestone 4F — OpenAI embedding configuration (backend-only)
# OPENAI_API_KEY is never logged, returned in API responses, or exposed to
# the frontend under any circumstances.
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
MAX_EMBEDDING_CHUNKS_PER_REQUEST = 20
MAX_EMBEDDING_CHARACTERS_PER_CHUNK = 2000

# ---------------------------------------------------------------------------
# Milestone 4G — vector search / query embedding constants
# ---------------------------------------------------------------------------
MAX_QUERY_CHARS = 500       # cap query length before embedding
MAX_SEARCH_RESULTS = 10     # cap match_count on the search endpoint

_OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
_OPENAI_CONFIGURED: bool = bool(_OPENAI_API_KEY)

# ---------------------------------------------------------------------------
# Milestone 4H — answer model configuration (backend-only)
# ANSWER_MODEL and OPENAI_API_KEY are never logged, returned, or exposed.
# ---------------------------------------------------------------------------
ANSWER_MODEL: str = os.getenv("ANSWER_MODEL", "gpt-4o-mini")
MAX_ANSWER_CHUNKS: int = 5          # max source chunks fed to answer model
MAX_SOURCE_CONTEXT_CHARS: int = 6000  # total character cap for source context

# ---------------------------------------------------------------------------
# Milestone 4P.4 — Admin bearer-token guard
# ADMIN_TOKEN is backend-only; never logged, returned, or exposed to clients.
# ---------------------------------------------------------------------------
_ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "")

# ---------------------------------------------------------------------------
# Milestone 4S.41 — allowed organisation ID allowlist
# Populated from ALLOWED_ORGANISATION_IDS env var, comma-separated.
# Defaults to demo-org only when absent or empty.
# Never logged, returned, or used to confirm organisation existence to callers.
# ---------------------------------------------------------------------------
_raw_allowed_orgs = os.getenv("ALLOWED_ORGANISATION_IDS", "demo-org")
_ALLOWED_ORGANISATION_IDS: frozenset = frozenset(
    org.strip() for org in _raw_allowed_orgs.split(",") if org.strip()
) or frozenset({"demo-org"})
del _raw_allowed_orgs

# ---------------------------------------------------------------------------
# Milestone 4S.90N -- Admin session check: roles permitted to use admin proxy
# Never logged, returned in non-admin responses, or used to confirm role existence.
# ---------------------------------------------------------------------------
_ADMIN_SESSION_ALLOWED_ROLES: frozenset = frozenset({"organisation_admin", "worktwin_dev_admin"})

# ---------------------------------------------------------------------------
# Milestone 4S.103C-1 -- Staff session check: roles permitted to access staff routes
# Never logged, returned in non-staff responses, or used to confirm role existence.
# ---------------------------------------------------------------------------
_STAFF_SESSION_ALLOWED_ROLES: frozenset = frozenset({
    "staff",
    "senior_care_staff",
    "registered_manager",
})

# Cache-Control header applied to all session-check responses.
_NO_STORE_HEADERS: dict = {"Cache-Control": "no-store"}

# ---------------------------------------------------------------------------
# Milestone 4S.104E-6d — Cache-Control: no-store on staff-facing responses.
# /policies returns organisation- and role-scoped policy metadata; /ask returns
# source-grounded answers. Neither must be cached by browsers or shared proxies.
# This mirrors the per-response no-store guarantee already applied to
# /staff/session-check (_NO_STORE_HEADERS), but is applied via middleware so the
# header is present on EVERY response for these paths — success, safe fallback,
# and auth/error responses (401/403/429/5xx) alike — including those raised as
# HTTPException, which bypass any header set on an injected Response object.
# Scoped strictly to these exact paths; no other endpoint is affected.
# ---------------------------------------------------------------------------
_NO_STORE_PATHS: frozenset = frozenset({"/policies", "/ask"})


@app.middleware("http")
async def _no_store_on_staff_endpoints(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in _NO_STORE_PATHS:
        response.headers["Cache-Control"] = _NO_STORE_HEADERS["Cache-Control"]
    return response


def _get_pilot_staff_context() -> tuple:
    """Return (organisation_id, user_id, user_role) derived from server-side env vars."""
    return (
        os.getenv("PILOT_ORGANISATION_ID", "demo-org"),
        os.getenv("PILOT_USER_ID", "pilot-staff-demo"),
        os.getenv("PILOT_USER_ROLE", "Care Worker"),
    )


def _require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    if not _ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin auth not configured.")
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or token != _ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorised.")


# ---------------------------------------------------------------------------
# Milestone 4S.39 — /ask in-memory rate limiter
# Counters are kept in process memory only and are never exposed via any API.
# No question text, answer text, source text, vectors, or IP addresses stored.
# ---------------------------------------------------------------------------
ASK_USER_RATE_LIMIT = 20
ASK_USER_RATE_WINDOW_SECONDS = 15 * 60
ASK_ORG_RATE_LIMIT = 100
ASK_ORG_RATE_WINDOW_SECONDS = 60 * 60

_rate_buckets: Dict[str, list] = {}  # keyed by "user:<org>:<uid>" or "org:<org>"
_rate_lock = threading.Lock()


def _check_rate_bucket(key: str, limit: int, window: int) -> int:
    """Sliding-window counter. Returns seconds to wait if over limit, else 0."""
    now = time.monotonic()
    cutoff = now - window
    with _rate_lock:
        timestamps = _rate_buckets.get(key)
        if timestamps is None:
            _rate_buckets[key] = [now]
            return 0
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)
        if len(timestamps) >= limit:
            return max(1, int(timestamps[0] + window - now) + 1)
        timestamps.append(now)
        return 0


try:
    from pypdf import PdfReader as _PdfReader
    _PYPDF_OK = True
except ImportError:
    _PYPDF_OK = False
    _PdfReader = None  # type: ignore


def _clean_extracted_text(text: str) -> str:
    # Remove common PDF encoding artefacts without touching content.
    # Â  is the UTF-8 NBSP (U+00A0) misread as Latin-1 — replace with space.
    text = text.replace("\u00C2\u00A9", "\u00A9")  # © copyright sign
    text = text.replace("\u00C2\u00AE", "\u00AE")  # ® registered sign
    text = text.replace("\u00C2\u00A3", "\u00A3")  # £ pound sign
    text = text.replace("Â ", " ")
    text = text.replace(" ", " ")
    # Stray U+00C2 before an ASCII word character (cp1252 artefact, e.g. "ÂWill")
    text = re.sub(r"Â(?=\w)", "", text)
    # Strip C0/C1 control characters (keep \t=0x09, \n=0x0a, \r=0x0d)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
    return text


def _http_upload_to_supabase(storage_path: str, file_bytes: bytes) -> None:
    """
    Upload to Supabase Storage via REST API (HTTP fallback path).
    Used when the Python supabase client cannot initialise (e.g. sb_secret_ keys).
    _SUPABASE_HTTP_KEY is backend-only and is never logged or returned here.
    """
    import httpx
    url = f"{_SUPABASE_URL}/storage/v1/object/{_SUPABASE_STORAGE_BUCKET}/{storage_path}"
    headers = {
        "apikey": _SUPABASE_HTTP_KEY,
        "Authorization": f"Bearer {_SUPABASE_HTTP_KEY}",
        "Content-Type": "application/pdf",
    }
    resp = httpx.post(url, content=file_bytes, headers=headers, timeout=30)
    if resp.status_code == 409:
        resp = httpx.put(url, content=file_bytes, headers=headers, timeout=30)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Supabase Storage HTTP upload failed: status {resp.status_code}")


# ---------------------------------------------------------------------------
# Supabase document_registry DB helpers (Milestone 4C)
# PostgREST / Data API calls — _SUPABASE_DB_KEY is backend-only, never logged or returned.
# ---------------------------------------------------------------------------

_DB_TABLE_MISSING_MSG = (
    "Document registry table is not configured. "
    "Run backend/sql/001_document_registry.sql in Supabase SQL Editor."
)


def _db_headers() -> Dict[str, str]:
    return {
        "apikey": _SUPABASE_DB_KEY,
        "Authorization": f"Bearer {_SUPABASE_DB_KEY}",
        "Content-Type": "application/json",
    }


def _is_table_missing_error(status: int, body: str) -> bool:
    low = body.lower()
    return status in (400, 404, 422) and (
        "does not exist" in low or "relation" in low or "document_registry" in low
    )


def _create_registry_record(record: Dict[str, Any]) -> Dict[str, Any]:
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    headers = {**_db_headers(), "Prefer": "return=representation"}
    payload = {k: v for k, v in record.items() if v is not None}
    resp = _httpx.post(url, json=payload, headers=headers, timeout=15)
    if resp.status_code in (200, 201):
        data = resp.json()
        return data[0] if isinstance(data, list) else data
    if _is_table_missing_error(resp.status_code, resp.text):
        raise RuntimeError(_DB_TABLE_MISSING_MSG)
    raise RuntimeError(f"DB insert failed: HTTP {resp.status_code}")


def _list_registry_records(
    organisation_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    vertical: Optional[str] = None,
) -> List[Dict[str, Any]]:
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params: Dict[str, str] = {"order": "created_at.desc", "limit": "500"}
    if organisation_id:
        params["organisation_id"] = f"eq.{organisation_id}"
    if status:
        params["status"] = f"eq.{status}"
    if category:
        params["category"] = f"eq.{category}"
    if vertical:
        params["vertical"] = f"eq.{vertical}"
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code == 200:
        return resp.json()
    if _is_table_missing_error(resp.status_code, resp.text):
        raise RuntimeError(_DB_TABLE_MISSING_MSG)
    raise RuntimeError(f"DB list failed: HTTP {resp.status_code}")


def _get_registry_record(document_id: str) -> Optional[Dict[str, Any]]:
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params = {"id": f"eq.{document_id}", "limit": "1"}
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code == 200:
        data = resp.json()
        return data[0] if data else None
    return None


def _update_registry_record(document_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params = {"id": f"eq.{document_id}"}
    headers = {**_db_headers(), "Prefer": "return=representation"}
    resp = _httpx.patch(url, json=updates, params=params, headers=headers, timeout=15)
    if resp.status_code in (200, 201):
        data = resp.json()
        if isinstance(data, list):
            return data[0] if data else None
        return data
    if resp.status_code == 204:
        return _get_registry_record(document_id)
    return None


# ---------------------------------------------------------------------------
# Milestone 4I — Governance helpers
# Audit events, governance gate checks, document-level governance queries.
# Backend/service role only. Never expose audit events or governance decisions
# to the frontend beyond what is already included in DocumentRecord fields.
# ---------------------------------------------------------------------------

def _create_audit_event(
    organisation_id: str,
    event_type: str,
    document_id: Optional[str] = None,
    event_summary: Optional[str] = None,
    actor: str = "admin",
    actor_role: str = "admin",
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Insert a row into document_audit_events.
    Non-critical: errors are swallowed — audit failure must never block core operations.
    If the audit table does not yet exist (007 migration not run), this is a silent no-op.
    """
    if not _DB_CONFIGURED:
        return
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_audit_events"
    headers = {**_db_headers(), "Prefer": "return=minimal"}
    payload: Dict[str, Any] = {
        "organisation_id": organisation_id,
        "event_type": event_type,
        "actor": actor,
        "actor_role": actor_role,
        "metadata": metadata or {},
        "created_at": _now(),
    }
    if document_id:
        payload["document_id"] = document_id
    if event_summary:
        payload["event_summary"] = event_summary
    try:
        _httpx.post(url, json=payload, headers=headers, timeout=10)
    except Exception:
        pass  # audit events are non-critical


def _audit_admin_document_cross_org_denied(
    session_org: str,
    doc_id: str,
    doc_org: str,
) -> None:
    _create_audit_event(
        organisation_id=session_org,
        event_type="admin_document_cross_org_denied",
        document_id=doc_id,
        event_summary="Admin attempted to access a document from a different organisation",
        metadata={
            "route": f"documents/{doc_id}",
            "reason": "cross_org_document_access_denied",
            "document_organisation_id": doc_org,
        },
    )


def _get_document_governance_summary(document_id: str) -> Optional[Dict[str, Any]]:
    """Return governance fields for a single document. None if not found or DB not configured."""
    if not _DB_CONFIGURED:
        return None
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params = {
        "id": f"eq.{document_id}",
        "limit": "1",
        "select": (
            "id,governance_status,real_document,dummy_document,"
            "approved_for_embedding,approved_for_staff_visibility,"
            "approved_for_source_grounded_answers,"
            "requires_human_review_before_embedding,"
            "requires_human_review_before_staff_visibility,"
            "is_sensitive,escalation_required"
        ),
    }
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code == 200:
        data = resp.json()
        return data[0] if data else None
    return None


def _get_document_governance_batch(document_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch governance fields for multiple documents. Returns dict keyed by id string."""
    if not _DB_CONFIGURED or not document_ids:
        return {}
    import httpx as _httpx
    ids_str = ",".join(document_ids)
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params = {
        "id": f"in.({ids_str})",
        "limit": "100",
        "select": (
            "id,governance_status,real_document,dummy_document,"
            "approved_for_embedding,approved_for_staff_visibility,"
            "approved_for_source_grounded_answers,"
            "is_sensitive,escalation_required"
        ),
    }
    try:
        resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
        if resp.status_code == 200:
            return {row["id"]: row for row in resp.json()}
    except Exception:
        pass
    return {}


def _can_embed_document(
    document: Dict[str, Any],
    allow_dummy_override: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Governance gate for embedding generation.
    Returns (allowed, blocked_reason).

    Rules (in priority order):
    1. Always block if is_sensitive=True or escalation_required=True.
    2. Real documents (real_document=True) block unless approved_for_embedding=True.
    3. Dummy/legacy documents block unless allow_dummy_override=True.
    """
    if document.get("is_sensitive", False):
        return False, "Document is marked sensitive and cannot be embedded."
    if document.get("escalation_required", False):
        return False, "Document requires escalation and cannot be embedded."

    is_real = document.get("real_document", False)

    if is_real:
        if not document.get("approved_for_embedding", False):
            return False, "Real document requires governance approval before embedding."
        return True, None

    # Dummy or legacy record (real_document missing / False)
    if not allow_dummy_override:
        return False, "Dummy document requires allow_dummy_override=true for test embedding."
    return True, None


def _can_use_document_for_answer_debug(
    document: Dict[str, Any],
    allow_dummy_override: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Governance gate for source-grounded answer debug.
    Returns (allowed, blocked_reason).

    Rules:
    1. Always block if is_sensitive=True or escalation_required=True.
    2. Real documents block unless approved_for_source_grounded_answers=True.
    3. Dummy/legacy documents block unless allow_dummy_override=True.
    """
    if document.get("is_sensitive", False):
        return False, "Document is marked sensitive and cannot be used for AI answers."
    if document.get("escalation_required", False):
        return False, "Document requires escalation and cannot be used for AI answers."

    is_real = document.get("real_document", False)

    if is_real:
        if not document.get("approved_for_source_grounded_answers", False):
            return False, "Real document requires governance approval before source-grounded answer testing."
        return True, None

    # Dummy or legacy
    if not allow_dummy_override:
        return False, "Dummy document requires allow_dummy_override=true for answer debug testing."
    return True, None


def _can_show_document_to_staff(document: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Governance gate for staff visibility.
    Returns (allowed, blocked_reason).
    All seven conditions must hold:
      is_sensitive=False, escalation_required=False,
      contains_qcs_or_third_party_content not True,
      real_document=True, dummy_document=False,
      status=approved, approved_for_staff_visibility=True.
    """
    if document.get("is_sensitive", False):
        return False, "Document is marked sensitive and cannot be shown to staff."
    if document.get("escalation_required", False):
        return False, "Document requires escalation and cannot be shown to staff."
    # Hard-block: QCS/third-party content is never surfaced to staff regardless of other flags.
    if document.get("contains_qcs_or_third_party_content") is True:
        return False, "Document contains QCS or third-party content and cannot be shown to staff."
    if not document.get("real_document", False):
        return False, "Document is not marked as a real document and cannot be shown to staff."
    if document.get("dummy_document", True):
        return False, "Dummy/sample documents cannot be shown to staff."
    if document.get("status") != "approved":
        return False, "Document must have status=approved before it is visible to staff."
    if not document.get("approved_for_staff_visibility", False):
        return False, (
            "Document requires approved_for_staff_visibility=true before staff visibility. "
            "Set via PATCH /documents/{id}/governance."
        )
    return True, None


def _can_use_document_for_vector_search(
    document: Dict[str, Any],
    allow_dummy_override: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Governance gate for admin-only vector retrieval (search-vector endpoint).
    Returns (allowed, blocked_reason).

    Rules:
    1. Always block if is_sensitive=True or escalation_required=True.
    2. Real documents require approved_for_embedding=True (not approved_for_source_grounded_answers).
    3. Dummy/legacy documents require allow_dummy_override=True.

    This gate is intentionally weaker than answer-debug: embedding approval is sufficient
    for retrieval testing; AI answer approval is a separate, higher governance step.
    """
    if document.get("is_sensitive", False):
        return False, "Document is marked sensitive and cannot be used for vector search."
    if document.get("escalation_required", False):
        return False, "Document requires escalation and cannot be used for vector search."

    is_real = document.get("real_document", False)

    if is_real:
        if not document.get("approved_for_embedding", False):
            return False, "Real document requires approved_for_embedding=true before vector retrieval."
        return True, None

    # Dummy or legacy
    if not allow_dummy_override:
        return False, "Dummy document requires allow_dummy_override=true for vector search testing."
    return True, None


# ---------------------------------------------------------------------------
# Milestone 4S.5 — staff /ask governance gate and eligibility fetch
# These functions are strictly staff-facing and enforce ALL eleven conditions.
# Never return governance fields or internal flags to the staff response.
# ---------------------------------------------------------------------------

def _fetch_staff_ask_document_eligibility_batch(
    document_ids: List[str],
) -> Dict[str, Dict[str, Any]]:
    """
    Fetch all fields needed for the staff /ask gate in one DB call.
    Separate from _get_document_governance_batch (answer-debug path) because
    the staff gate requires embedding_status, governance_reviewed_by/at,
    status, and access_roles which that function does not select.
    Returns dict keyed by document id string. Returns {} on any failure — fail-safe.
    Never returned to clients.
    """
    if not _DB_CONFIGURED or not document_ids:
        return {}
    import httpx as _httpx
    ids_str = ",".join(document_ids)
    url = f"{_SUPABASE_URL}/rest/v1/document_registry"
    params = {
        "id": f"in.({ids_str})",
        "limit": "100",
        "select": (
            "id,status,real_document,dummy_document,is_sensitive,escalation_required,"
            "approved_for_staff_visibility,approved_for_source_grounded_answers,"
            "approved_for_embedding,governance_reviewed_by,governance_reviewed_at,"
            "embedding_status,access_roles,contains_qcs_or_third_party_content"
        ),
    }
    try:
        resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
        if resp.status_code == 200:
            return {row["id"]: row for row in resp.json()}
    except Exception:
        pass
    return {}


def _can_use_document_for_staff_ask(
    document: Dict[str, Any],
    user_role: str,
) -> Tuple[bool, Optional[str]]:
    """
    Strictest governance gate — staff /ask RAG only.
    Composes _can_show_document_to_staff (conditions 1–7, includes QCS block) then
    adds RAG-specific conditions plus an access_roles check.
    All conditions must hold; returns (False, reason) on the first failure.
    Never call this with None — caller must skip rows with no eligibility record.
    """
    # Conditions 1–7: reuse existing staff visibility gate (includes QCS hard-block)
    ok, reason = _can_show_document_to_staff(document)
    if not ok:
        return False, reason

    # Fail closed: only explicit contains_qcs_or_third_party_content=False is safe for Ask.
    # True is already caught above; None/missing is treated as unknown/unsafe.
    if document.get("contains_qcs_or_third_party_content") is not False:
        return False, "contains_qcs_or_third_party_content must be explicitly False for staff /ask."

    # Must be approved for source-grounded AI answers
    if not document.get("approved_for_source_grounded_answers", False):
        return False, "approved_for_source_grounded_answers must be True for staff /ask."

    # Must be approved for embedding
    if not document.get("approved_for_embedding", False):
        return False, "approved_for_embedding must be True for staff /ask."

    # Governance reviewer must be recorded
    if not document.get("governance_reviewed_by"):
        return False, "governance_reviewed_by must be set for staff /ask."

    # Governance review timestamp must be recorded
    if not document.get("governance_reviewed_at"):
        return False, "governance_reviewed_at must be set for staff /ask."

    # Embeddings must be fully indexed
    if document.get("embedding_status") != "indexed":
        return False, "embedding_status must be indexed for staff /ask."

    # Access roles: document must be visible to this user's role or All Staff
    access_roles = document.get("access_roles") or []
    if "All Staff" not in access_roles and user_role not in access_roles:
        return False, f"User role '{user_role}' not in document access_roles."

    return True, None


# Staff /ask safe fallback — returned when no usable approved source is found
# or when an internal error prevents answer generation.
_STAFF_FALLBACK_ANSWER = (
    "I can't find an answer in our approved documents right now. "
    "Please speak to your line manager or designated lead."
)
_STAFF_ESCALATION_ANSWER = (
    "Please escalate this to your line manager or designated lead. "
    "WorkTwin does not provide direct answers on safeguarding, medication, "
    "HR, legal, or wellbeing topics."
)
_STANDARD_ESCALATE_IF = [
    "The situation involves immediate risk.",
    "The policy does not clearly answer the question.",
    "A safeguarding, medication, HR, legal, compliance or wellbeing issue is involved.",
]


def _staff_fallback_response(
    requires_escalation: bool = True,
    risk_category: str = "standard",
    answer: Optional[str] = None,
    next_steps: Optional[List[str]] = None,
    vertical_subcategory: Optional[str] = None,
    contact_routes: Optional[List[str]] = None,
) -> "AskResponse":
    """Return a safe AskResponse with no source content."""
    return AskResponse(
        answer=answer or _STAFF_FALLBACK_ANSWER,
        next_steps=next_steps or ["Please speak to your line manager or designated lead."],
        sources=[],
        escalate_if=_STANDARD_ESCALATE_IF,
        requires_escalation=requires_escalation,
        allowed_to_answer=False,
        risk_category=risk_category,
        learning_option=None,
        vertical_subcategory=vertical_subcategory,
        contact_routes=contact_routes or [],
    )


# ---------------------------------------------------------------------------
# Milestone 4D — text chunking and extraction storage helpers
# No AI, no embeddings, no external LLM calls.
# Backend / service role only — never exposed to staff UI.
# ---------------------------------------------------------------------------

def _chunk_text(text: str, max_chars: int = 1200, overlap_chars: int = 150) -> List[str]:
    """
    Deterministic character-based chunker. No AI, no NLP, no external calls.
    Advances by (max_chars - overlap_chars) per step, snapping the end to a
    word boundary within the last 100 characters of each window.
    """
    if not text:
        return []
    step = max(max_chars - overlap_chars, 100)
    chunks: List[str] = []
    pos = 0
    text_len = len(text)
    while pos < text_len:
        end = min(pos + max_chars, text_len)
        if end < text_len:
            wb = text.rfind(' ', max(pos, end - 100), end)
            if wb > pos:
                end = wb + 1
        chunk = text[pos:end].strip()
        if chunk:
            chunks.append(chunk)
        pos += step
    return chunks


def _create_extraction_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert a row into document_extractions.
    Full extracted text is stored here — backend/admin only, never returned in API responses.
    """
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_extractions"
    headers = {**_db_headers(), "Prefer": "return=representation"}
    payload = {k: v for k, v in record.items() if v is not None}
    resp = _httpx.post(url, json=payload, headers=headers, timeout=30)
    if resp.status_code in (200, 201):
        data = resp.json()
        return data[0] if isinstance(data, list) else data
    raise RuntimeError(f"Extraction record insert failed: HTTP {resp.status_code}")


def _create_document_chunks(chunks_data: List[Dict[str, Any]], batch_size: int = 100) -> int:
    """
    Bulk-insert chunk rows into document_chunks in batches.
    No embeddings are stored — embedding_status is always 'not_started' at this stage.
    """
    if not chunks_data:
        return 0
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    headers = {**_db_headers(), "Prefer": "return=minimal"}
    total = 0
    for i in range(0, len(chunks_data), batch_size):
        batch = chunks_data[i:i + batch_size]
        resp = _httpx.post(url, json=batch, headers=headers, timeout=60)
        if resp.status_code not in (200, 201, 204):
            raise RuntimeError(f"Chunk batch insert failed: HTTP {resp.status_code}")
        total += len(batch)
    return total


def _list_document_chunks(document_id: str) -> List[Dict[str, Any]]:
    """Fetch chunk metadata (no chunk_text) for a document. Admin/debug use only."""
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    params = {
        "document_id": f"eq.{document_id}",
        "order": "chunk_index.asc",
        "limit": "1000",
        "select": "id,document_id,chunk_index,chunk_character_count,source_page_start,source_page_end,embedding_status,approved_for_ai_answers,escalation_required,is_sensitive,status,vertical,category",
    }
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code == 200:
        return resp.json()
    return []


# ---------------------------------------------------------------------------
# Milestone 4E — embedding record preparation helpers
# No embeddings are generated. No external API is called.
# Backend / service role only — never exposed to staff UI.
# ---------------------------------------------------------------------------

def _prepare_embedding_records_for_document(document_id: str) -> Dict[str, Any]:
    """
    Create one document_embeddings row per chunk for a document.
    Copies organisation_id, access_roles, vertical, category and safety flags
    from document_chunks. Sets embedding_status = 'not_started'.
    Uses upsert-ignore so re-runs are safe.
    No vectors are generated or stored.
    """
    import httpx as _httpx

    if not _DB_CONFIGURED:
        return {"status": "not_configured", "embedding_record_count": 0}

    # Fetch chunks with all fields needed for embedding records
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    params = {
        "document_id": f"eq.{document_id}",
        "order": "chunk_index.asc",
        "limit": "1000",
        "select": "id,organisation_id,document_id,access_roles,vertical,category,approved_for_ai_answers,escalation_required,is_sensitive",
    }
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code != 200:
        return {
            "status": "failed",
            "embedding_record_count": 0,
            "error": f"Chunk fetch failed: HTTP {resp.status_code}",
        }

    chunks = resp.json()
    if not chunks:
        return {"status": "prepared", "embedding_record_count": 0}

    # Check how many embedding records already exist for this document
    existing = _list_embedding_records(document_id)
    if len(existing) >= len(chunks):
        return {"status": "already_prepared", "embedding_record_count": len(existing)}

    now_ts = _now()
    records = [
        {
            "organisation_id": c.get("organisation_id"),
            "document_id": document_id,
            "chunk_id": c["id"],
            "embedding_status": "not_started",
            "approved_for_ai_answers": c.get("approved_for_ai_answers", False),
            "escalation_required": c.get("escalation_required", False),
            "is_sensitive": c.get("is_sensitive", False),
            "access_roles": c.get("access_roles") or [],
            "vertical": c.get("vertical"),
            "category": c.get("category"),
            "created_at": now_ts,
            "updated_at": now_ts,
            "metadata": {"milestone": "4E"},
        }
        for c in chunks
    ]

    emb_url = f"{_SUPABASE_URL}/rest/v1/document_embeddings"
    headers = {**_db_headers(), "Prefer": "resolution=ignore-duplicates,return=minimal"}

    try:
        resp2 = _httpx.post(
            emb_url + "?on_conflict=chunk_id",
            json=records,
            headers=headers,
            timeout=60,
        )
        if resp2.status_code not in (200, 201, 204):
            error_msg = f"HTTP {resp2.status_code}"
            if _is_table_missing_error(resp2.status_code, resp2.text):
                error_msg = (
                    "Embedding table not configured. "
                    "Run backend/sql/005_document_embeddings.sql in Supabase SQL Editor."
                )
            return {"status": "failed", "embedding_record_count": 0, "error": error_msg}
    except Exception as exc:
        return {"status": "failed", "embedding_record_count": 0, "error": str(exc)}

    return {"status": "prepared", "embedding_record_count": len(records)}


def _list_embedding_records(document_id: str) -> List[Dict[str, Any]]:
    """
    Fetch embedding record metadata (no vector data) for a document.
    Admin/debug use only — never returned in staff-facing endpoints.
    """
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_embeddings"
    params = {
        "document_id": f"eq.{document_id}",
        "order": "created_at.asc",
        "limit": "1000",
        # Explicitly exclude the embedding column to avoid transmitting vector data.
        "select": (
            "id,organisation_id,document_id,chunk_id,embedding_model,"
            "embedding_dimensions,embedding_status,embedding_error,"
            "approved_for_ai_answers,escalation_required,is_sensitive,"
            "access_roles,vertical,category,created_at,updated_at,metadata"
        ),
    }
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code == 200:
        return resp.json()
    return []


def _get_embedding_readiness(document_id: str) -> Dict[str, Any]:
    """
    Aggregate embedding readiness for a document.
    Returns counts and flags only — no vectors, no secrets, no extracted text.
    Updated in Milestone 4F: uses embedded status, adds is_ready_for_vector_search.
    """
    records = _list_embedding_records(document_id)
    chunks = _list_document_chunks(document_id)

    not_started_count = sum(1 for r in records if r.get("embedding_status") == "not_started")
    embedded_count = sum(1 for r in records if r.get("embedding_status") == "embedded")
    failed_count = sum(1 for r in records if r.get("embedding_status") == "failed")

    # Ready for vector search when all chunks have been embedded successfully.
    is_ready_for_vector_search = (
        len(chunks) > 0
        and len(records) == len(chunks)
        and embedded_count == len(records)
        and failed_count == 0
    )

    return {
        "document_id": document_id,
        "chunk_count": len(chunks),
        "embedding_record_count": len(records),
        "not_started_count": not_started_count,
        "embedded_count": embedded_count,
        "failed_count": failed_count,
        "is_ready_for_vector_search": is_ready_for_vector_search,
        "is_ready_for_ai_answers": False,
        "note": "Admin-only vector search is active. Source-grounded answer testing is available via /documents/answer-debug for approved documents. Staff-facing RAG is not enabled.",
    }


# ---------------------------------------------------------------------------
# Milestone 4F — embedding generation helpers
# All OpenAI API calls are backend-only.
# _OPENAI_API_KEY is never logged, returned, or transmitted outside this module.
# ---------------------------------------------------------------------------

def _safe_embedding_error(exc: Exception) -> str:
    """Return a short, safe error string that cannot leak API keys."""
    msg = str(exc)[:300]
    msg = re.sub(r'sk-[A-Za-z0-9_\-]{10,}', '[key-redacted]', msg)
    return msg


# 4S.90N-F1A: Upload pipeline error messages -- never expose raw exception text.
_UPLOAD_ERROR_MESSAGES: Dict[str, str] = {
    "storage": "Document storage upload failed.",
    "registry": "Registry save failed.",
    "extraction_storage": "Extraction storage failed.",
    "chunking": "Chunking failed.",
}


def _safe_upload_error_message(kind: str) -> str:
    """Return a generic safe upload error message. Never exposes raw exception text."""
    return _UPLOAD_ERROR_MESSAGES.get(kind, "Upload pipeline step failed.")


def _safe_extraction_warning() -> str:
    """Return a generic safe extraction warning. Never exposes raw exception text."""
    return "Text extraction failed."


def _fetch_chunk_texts(chunk_ids: List[str]) -> Dict[str, str]:
    """Fetch chunk_text for the given chunk IDs from document_chunks (backend-only)."""
    import httpx as _httpx
    if not chunk_ids:
        return {}
    ids_str = ",".join(chunk_ids)
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    params = {"id": f"in.({ids_str})", "select": "id,chunk_text", "limit": "1000"}
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=30)
    if resp.status_code != 200:
        return {}
    return {row["id"]: (row.get("chunk_text") or "") for row in resp.json()}


def _update_embedding_record_by_id(record_id: str, updates: Dict[str, Any]) -> None:
    """Patch a single document_embeddings row. Used during embedding generation."""
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_embeddings"
    params = {"id": f"eq.{record_id}"}
    headers = {**_db_headers(), "Prefer": "return=minimal"}
    _httpx.patch(url, json={**updates, "updated_at": _now()}, params=params, headers=headers, timeout=15)


def _update_chunk_embedding_status_by_id(chunk_id: str, status: str) -> None:
    """Patch document_chunks.embedding_status for a single chunk."""
    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    params = {"id": f"eq.{chunk_id}"}
    headers = {**_db_headers(), "Prefer": "return=minimal"}
    _httpx.patch(
        url,
        json={"embedding_status": status, "updated_at": _now()},
        params=params,
        headers=headers,
        timeout=15,
    )


def _call_openai_embeddings(texts: List[str]) -> Tuple[List[List[float]], int]:
    """
    Call the OpenAI Embeddings API with a batch of texts.
    Returns (list_of_vectors, total_tokens_used).
    _OPENAI_API_KEY is backend-only and is never logged or returned.
    Raises on any API error.
    """
    from openai import OpenAI as _OpenAI
    client = _OpenAI(api_key=_OPENAI_API_KEY)
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    vectors = [item.embedding for item in response.data]
    total_tokens = response.usage.total_tokens
    return vectors, total_tokens


def _format_vector_for_pgvector(vector: List[float]) -> str:
    """Format a float list as a pgvector-compatible text literal: [v1,v2,...]"""
    return f"[{','.join(str(round(v, 8)) for v in vector)}]"


# ---------------------------------------------------------------------------
# Milestone 4G — vector search helpers
# Query embedding and retrieval — backend-only, no AI answers, no LLM calls.
# _OPENAI_API_KEY is never logged, returned, or transmitted outside this module.
# ---------------------------------------------------------------------------

def _embed_query_text(query: str) -> List[float]:
    """
    Embed a single query string using text-embedding-3-small.
    _OPENAI_API_KEY is backend-only and never returned or logged.
    Raises on any API error.
    """
    from openai import OpenAI as _OpenAI
    client = _OpenAI(api_key=_OPENAI_API_KEY)
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query[:MAX_QUERY_CHARS]],
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


def _vector_search_chunks(
    organisation_id: str,
    query: str,
    match_count: int = 5,
    threshold: float = 0.0,
    allow_dummy_override: bool = False,
) -> List[Dict[str, Any]]:
    """
    Embeds the query and calls match_document_chunks via Supabase RPC.
    Returns filtered rows (escalation_required and is_sensitive always excluded).
    Vectors are never returned.
    Raises RuntimeError on embedding or RPC failure.
    """
    import httpx as _httpx

    vector = _embed_query_text(query)
    vector_str = _format_vector_for_pgvector(vector)

    url = f"{_SUPABASE_URL}/rest/v1/rpc/match_document_chunks"
    payload = {
        "query_embedding": vector_str,
        "match_organisation_id": organisation_id,
        "match_threshold": threshold,
        "match_count": match_count,
    }
    resp = _httpx.post(url, json=payload, headers=_db_headers(), timeout=30)
    if resp.status_code != 200:
        body = resp.text[:300]
        if resp.status_code == 404 or "Could not find" in body or "match_document_chunks" in body:
            raise RuntimeError(
                "match_document_chunks function not found. "
                "Run backend/sql/006_vector_search.sql in Supabase SQL Editor."
            )
        raise RuntimeError(f"Vector search RPC failed: HTTP {resp.status_code}")

    rows = resp.json()
    if not isinstance(rows, list):
        raise RuntimeError("Unexpected response format from match_document_chunks.")

    # Post-fetch safety filter — escalation and sensitivity always enforced.
    # approved_for_ai_answers is NOT checked here: that is an AI-answer gate,
    # not a vector retrieval gate. Document-level governance (approved_for_embedding)
    # is applied by the caller (search-vector) after fetching governance records.
    filtered = []
    for row in rows:
        if row.get("escalation_required", False):
            continue
        if row.get("is_sensitive", False):
            continue
        filtered.append(row)

    return filtered


def _normalise_search_result(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a raw RPC row into the safe, API-returnable result shape.
    chunk_text is truncated to a 350-character preview — full text never returned.
    Vectors are never included.
    """
    return {
        "document_id": str(row.get("document_id") or ""),
        "chunk_id": str(row.get("chunk_id") or ""),
        "document_title": row.get("document_title") or "",
        "chunk_index": int(row.get("chunk_index") or 0),
        "similarity": round(float(row.get("similarity") or 0), 4),
        "category": row.get("category") or "",
        "vertical": row.get("vertical") or "",
        "access_roles": list(row.get("access_roles") or []),
        "approved_for_ai_answers": bool(row.get("approved_for_ai_answers", False)),
        "escalation_required": bool(row.get("escalation_required", False)),
        "is_sensitive": bool(row.get("is_sensitive", False)),
        "chunk_preview": _clean_extracted_text(row.get("chunk_text") or "")[:800],
    }


# ---------------------------------------------------------------------------
# Milestone 4H — source-grounded answer generation helpers
# All answer model calls are backend-only.
# OPENAI_API_KEY and ANSWER_MODEL are never logged, returned, or transmitted.
# ---------------------------------------------------------------------------

# Per-topic escalation patterns — first match wins.
# Covers all six required categories plus legacy terms from prior milestone.
# Raw query text is NEVER stored; only the resolved topic label is audited.
_TOPIC_PATTERNS: List[Tuple[str, "re.Pattern[str]"]] = [
    # fire_emergency must precede safeguarding: "fire incident" contains "incident"
    # which would otherwise match the safeguarding pattern first.
    ("fire_emergency", re.compile(
        r'\b(fire\s+(?:incident|emergency|exit|alarm|evacuation|safety|procedure|risk|hazard|door)|'
        r'blocked\s+(?:fire\s+)?exit|fire\s+exit\s+blocked|'
        r'evacuation\s+route|fire\s+drill|fire\s+warden|fire\s+marshal)\b',
        re.IGNORECASE,
    )),
    # incident and accident removed: they caused pure fire/health-safety queries to
    # match safeguarding first.  Real safeguarding queries always contain at least one
    # explicit safeguarding keyword (safeguarding, abuse, neglect, harm, etc.).
    # Standalone incident/accident queries fall through to accident_incident below.
    ("safeguarding", re.compile(
        r'\b(safeguard(?:ing)?|abus(?:e[sd]?|ing)|neglect|harm|exploitation|'
        r'being\s+hurt|service\s+user.*hurt|hurt.*service\s+user|'
        r'hurting\s+someone|vulnerable\s+adult|child\s+protection|'
        r'adult\s+at\s+risk|maltreatment|disclosure)\b',
        re.IGNORECASE,
    )),
    ("whistleblowing", re.compile(
        r'\b(whistle\s*blow(?:ing)?|raising\s+(?:a\s+)?concern|raise\s+(?:a\s+)?concern|'
        r'unsafe\s+practice|freedom\s+to\s+speak\s+up|speak\s+up|'
        r'report\s+(?:a\s+)?concern|malpractice)\b',
        re.IGNORECASE,
    )),
    ("medication", re.compile(
        r'\b(medication|medicine|medic(?:ines)?|dose|dosage|'
        r'missed\s+dose|overdose|mar\b|mar\s+sheet|'
        r'controlled\s+drug|prescription|administer(?:ing)?|'
        r'drug\s+error|wrong\s+medication)\b',
        re.IGNORECASE,
    )),
    ("wellbeing", re.compile(
        r'\b(wellbeing|well-being|mental\s+health|self[\s-]harm|'
        r'suicide|suicidal|self[\s-]injur|emotional\s+distress|'
        r'psychological\s+harm)\b',
        re.IGNORECASE,
    )),
    ("hr", re.compile(
        r'\b(disciplinary|grievance|payroll|sickness\s+absence|sickness|'
        r'redundancy|dismissal|capability|performance\s+management|'
        r'tribunal|annual\s+leave|holiday\s+pay|complaint|'
        r'bullying|bullied|harass(?:ment|ed|ing)?|discriminat(?:ion|e[sd]?|ing)?|'
        r'\bhr\b|human\s+resources|employment\s+contract)\b',
        re.IGNORECASE,
    )),
    ("legal", re.compile(
        r'\b(legal|solicitor|lawyer|cqc|regulator|regulatory|'
        r'compliance|ofsted|inspection|litigation|gdpr|data\s+protection|'
        r'ico|information\s+commissioner|named\s+individual|personal\s+data|'
        r'health\s+and\s+safety|driving|vehicle|'
        r'confidential(?:ity)?|shar(?:e|ing)\s+(?:confidential\s+)?information|'
        r'information\s+(?:handling|sharing))\b',
        re.IGNORECASE,
    )),
    ("violence_aggression", re.compile(
        r'\b(violen(?:ce|t)|aggress(?:ion|ive(?:ly)?)|threaten(?:ing)?|threats?|'
        r'intimid(?:ation|ating)|serious\s+distress|staff\s+safety|immediate\s+risk)\b',
        re.IGNORECASE,
    )),
    # Placed after all other patterns so safeguarding/medication/legal retain first-match priority.
    ("accident_incident", re.compile(
        r'\b(fall(?:s|en|ing)?|slip(?:s|ped|ping)?|trip(?:ped|ping)?|'
        r'near[\s-]miss|injur(?:y|ies|ed|ing)|accident|incident|'
        r'collaps(?:e[sd]?|ing))\b',
        re.IGNORECASE,
    )),
]

# Per-topic response configs — answer, next_steps, risk_category, vertical_subcategory.
# These are deterministic strings: no LLM, no RAG, no source content.
_TOPIC_RESPONSE: Dict[str, Dict[str, Any]] = {
    "fire_emergency": {
        "answer": (
            "Your site fire and emergency procedure must come first. "
            "WorkTwin is not a substitute for your fire procedure or evacuation plan. "
            "If there is immediate danger, raise the alarm, follow your evacuation routes "
            "and call 999 immediately. "
            "WorkTwin cannot advise on fire fighting, evacuation decisions or emergency responses directly. "
            "Report to your Registered Manager or line manager as soon as it is safe to do so."
        ),
        "next_steps": [
            "Follow your site fire and emergency procedure immediately.",
            "If there is immediate danger, raise the alarm, follow evacuation routes and call 999.",
            "Use clearly marked emergency exits — do not use lifts.",
            "Report to your Registered Manager or line manager as soon as it is safe.",
            "Record the incident in line with your organisation's accident and incident reporting procedure.",
        ],
        "contact_routes": [
            "Registered Manager",
            "Line Manager / Designated Lead",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "fire_emergency",
    },
    "safeguarding": {
        "answer": (
            "This may be a safeguarding concern. I cannot advise on this directly. "
            "Please contact your safeguarding lead, registered manager or designated lead immediately. "
            "If someone is in immediate danger, follow emergency procedures."
        ),
        "next_steps": [
            "Contact your safeguarding lead or registered manager immediately.",
            "If someone is in immediate danger, call emergency services.",
            "Follow your organisation's safeguarding procedure.",
            "Do not take action without guidance from a qualified lead.",
        ],
        "contact_routes": [
            "Safeguarding Lead",
            "Registered Manager",
            "Local authority safeguarding team (if immediate risk)",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "safeguarding",
    },
    "whistleblowing": {
        "answer": (
            "This may be a raising concerns or whistleblowing matter. I cannot advise on this directly. "
            "Please raise it with the appropriate manager, freedom-to-speak-up contact or designated lead "
            "using your organisation's process."
        ),
        "next_steps": [
            "Raise your concern with a line manager or designated lead.",
            "Use your organisation's freedom-to-speak-up or whistleblowing procedure.",
            "You can raise concerns anonymously if your organisation allows it.",
        ],
        "contact_routes": [
            "Registered Manager",
            "Freedom to Speak Up / nominated concerns lead",
            "External regulator (e.g. CQC) if appropriate",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "whistleblowing",
    },
    "medication": {
        "answer": (
            "Medication queries must be handled by a suitably trained and authorised person. "
            "I cannot advise on medication, dosing or administration directly. "
            "Please speak to your registered manager, medication lead or, in an emergency, "
            "a medical professional immediately."
        ),
        "next_steps": [
            "Contact your medication lead or registered manager.",
            "In an emergency involving medication, call 999 or 111.",
            "Record any medication incident in line with your organisation's procedure.",
        ],
        "contact_routes": [
            "Medication Lead",
            "Registered Manager",
            "Pharmacist or GP (routine query)",
            "NHS 111 (urgent non-emergency)",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "medication",
    },
    "wellbeing": {
        "answer": (
            "This relates to mental health or personal wellbeing. I cannot advise on this directly. "
            "Please speak to your line manager, designated wellbeing lead, or occupational health contact. "
            "If you or someone else is in immediate danger, contact emergency services."
        ),
        "next_steps": [
            "Speak to your line manager or wellbeing lead.",
            "If immediate danger exists, call 999.",
            "Ask your HR team about an employee assistance programme (EAP) if available.",
        ],
        "contact_routes": [
            "Line Manager",
            "Wellbeing Lead",
            "Occupational Health (if available)",
            "Employee Assistance Programme (EAP) if available",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "wellbeing",
        "vertical_subcategory": "wellbeing",
    },
    "hr": {
        "answer": (
            "This is an HR or employment matter. I cannot advise on disciplinary, grievance, payroll "
            "or employment queries directly. Please speak to your HR team or line manager."
        ),
        "next_steps": [
            "Contact your HR team or people team.",
            "Refer to your contract of employment or staff handbook.",
            "Speak to your line manager or designated lead.",
        ],
        "contact_routes": [
            "HR team / People team",
            "Line Manager",
            "Staff handbook (HR section)",
        ],
        "risk_category": "hr",
        "vertical_subcategory": "hr",
    },
    "legal": {
        "answer": (
            "This relates to a legal, regulatory or compliance matter. I cannot advise on this directly. "
            "Please speak to your registered manager, compliance lead or seek independent legal advice "
            "as appropriate."
        ),
        "next_steps": [
            "Contact your compliance lead or registered manager.",
            "Seek independent legal advice if required.",
            "Refer to your organisation's regulatory compliance procedure.",
        ],
        "contact_routes": [
            "Compliance Lead",
            "Registered Manager",
            "Independent legal advice (where appropriate)",
        ],
        "risk_category": "legal",
        "vertical_subcategory": "legal_compliance",
    },
    "accident_incident": {
        "answer": (
            "This may involve an accident, incident, injury, fall or urgent care concern. "
            "WorkTwin cannot advise on care or emergency response directly. "
            "Please contact your registered manager, line manager or designated lead immediately "
            "and follow your organisation's accident, incident reporting and emergency procedures. "
            "If there is immediate danger, serious injury, severe pain, collapse, breathing difficulty, "
            "confusion or any other urgent concern, seek urgent help or contact emergency services."
        ),
        "next_steps": [
            "Contact your registered manager, line manager or designated lead immediately.",
            "Follow your organisation's accident and incident reporting procedure.",
            "Seek emergency help or call 999 if there is immediate risk, serious injury or urgent concern.",
        ],
        "contact_routes": [
            "Registered Manager",
            "Line Manager / Designated Lead",
            "First Aider or appropriate trained lead (if available)",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "accident_incident",
    },
    "violence_aggression": {
        "answer": (
            "This involves a situation of violence, aggression, threatening behaviour or immediate risk to safety. "
            "WorkTwin cannot advise on this directly. "
            "Please contact your registered manager or line manager immediately and follow your organisation's "
            "violence, aggression and lone-worker procedures. "
            "If someone is in immediate danger, contact emergency services."
        ),
        "next_steps": [
            "Contact your registered manager or line manager immediately.",
            "Follow your organisation's violence, aggression and lone-worker procedure.",
            "If someone is in immediate danger, call 999.",
            "Record and report the incident in line with your organisation's procedure.",
        ],
        "contact_routes": [
            "Registered Manager",
            "Line Manager / Designated Lead",
            "Emergency services - 999 (if immediate danger)",
        ],
        "risk_category": "vertical_sensitive",
        "vertical_subcategory": "violence_aggression",
    },
}


def _classify_escalation_topic(query: str) -> Optional[str]:
    """Return the topic category name if the query matches a high-risk pattern, else None."""
    for topic, pattern in _TOPIC_PATTERNS:
        if pattern.search(query):
            return topic
    return None


# ---------------------------------------------------------------------------
# Focused safety-note patterns — answer-debug only.
# These do NOT short-circuit answer generation; the answer remains source-grounded.
# Head injury and fire/exit queries stay in the RAG path but receive a precise
# safety note that is more actionable than the generic escalation notice.
# Raw query text is never stored.
# ---------------------------------------------------------------------------
_HEAD_INJURY_PAT = re.compile(
    r'\b(head\s+injur(?:y|ies|ed)|hits?\s+(?:their|his|her|the)?\s*head|'
    r'bangs?\s+(?:their|his|her|the)?\s*head|head\s+(?:wound|trauma|impact)|'
    r'hit\s+(?:their|his|her|the)?\s*head|struck\s+(?:their|his|her|the)?\s*head|'
    r'serious\s+(?:head\s+)?injur(?:y|ies))\b',
    re.IGNORECASE,
)
_FIRE_EXIT_PAT = re.compile(
    r'\b(fire\s+(?:incident|emergency|exit|alarm|evacuation|safety|procedure|risk|hazard)|'
    r'blocked\s+(?:fire\s+)?exit|fire\s+exit\s+blocked|'
    r'evacuation\s+route|fire\s+drill|fire\s+door)\b',
    re.IGNORECASE,
)

_HEAD_INJURY_SAFETY_NOTE = (
    "Head injury or serious injury requires urgent caution. "
    "If the person is unconscious, confused, in severe pain, has a suspected fracture, "
    "or you have any urgent medical concern, call 999 immediately and get urgent medical help. "
    "Inform your manager as soon as possible. "
    "Do not delay emergency action for paperwork."
)
_FIRE_EXIT_SAFETY_NOTE = (
    "Your site fire and emergency procedure must be followed first. "
    "WorkTwin is not a substitute for your fire procedure. "
    "If there is immediate danger, call 999 and follow your evacuation routes. "
    "Inform your manager."
)


def _classify_focused_safety_note(query: str) -> Optional[str]:
    """Return a topic-specific safety note for head injury or fire/exit queries, else None.

    These queries remain source-grounded; this note is appended alongside the answer
    in answer-debug and takes priority over the generic escalation safety note.
    Never short-circuits RAG. Never called from staff /ask.
    """
    if _HEAD_INJURY_PAT.search(query):
        return _HEAD_INJURY_SAFETY_NOTE
    if _FIRE_EXIT_PAT.search(query):
        return _FIRE_EXIT_SAFETY_NOTE
    return None


# ---------------------------------------------------------------------------
# Specialist area definitions for answer-debug hardening — Milestone 4S.96L.
# Each entry: (area_name, query_pattern, source_pattern).
# query_pattern: identifies queries that require this specialist policy area.
# source_pattern: matches document_title or category in the filtered source set.
# First-match wins. Raw query text is never stored; only the resolved area name.
# ---------------------------------------------------------------------------
_SPECIALIST_AREAS: List[Tuple[str, "re.Pattern[str]", "re.Pattern[str]"]] = [
    (
        "safeguarding",
        re.compile(
            r'\b(safeguard(?:ing)?|abus(?:e[sd]?|ing)|neglect|harm|exploitation|'
            r'vulnerable\s+adult)\b',
            re.IGNORECASE,
        ),
        re.compile(r'\b(safeguard(?:ing)?)\b', re.IGNORECASE),
    ),
    (
        "medication",
        re.compile(
            r'\b(medication|medicine|medic(?:ines)?|dose|dosage|'
            r'missed\s+dose|overdose|mar\b|prescription|administer(?:ing)?)\b',
            re.IGNORECASE,
        ),
        re.compile(r'\b(medication|medicine|medicines|mar)\b', re.IGNORECASE),
    ),
    (
        "complaints",
        re.compile(
            r'\b(formal\s+complaint|family\s+complaint|complaint)\b',
            re.IGNORECASE,
        ),
        re.compile(r'\b(complaint|complaints|compliment|suggestion)\b', re.IGNORECASE),
    ),
    (
        "accident_incident",
        re.compile(
            r'\b(accident|fall(?:en)?|near\s+miss|injur(?:y|ies|ied))\b',
            re.IGNORECASE,
        ),
        re.compile(r'\b(accident|incident|near\s+miss|reporting)\b', re.IGNORECASE),
    ),
    (
        "confidentiality_data",
        re.compile(
            r'\b(confidential(?:ity)?|confidential\s+information|data\s+protection|'
            r'personal\s+data|gdpr|shar(?:e|ing)\s+(?:confidential\s+)?information|'
            r'information\s+(?:handling|sharing))\b',
            re.IGNORECASE,
        ),
        re.compile(
            r'\b(confidential(?:ity)?|information\s+handling|data\s+protection|'
            r'personal\s+data|gdpr)\b',
            re.IGNORECASE,
        ),
    ),
    (
        "hr_raising_concerns",
        re.compile(
            r'\b(bullying|bullied|harass(?:ment|ed|ing)?|discriminat(?:ion|e[sd]?|ing)?|'
            r'grievance|disciplinary|whistleblowing|whistle\s*blow(?:ing)?|'
            r'raising\s+(?:a\s+)?concern|speaking\s+up)\b',
            re.IGNORECASE,
        ),
        re.compile(
            r'\b(raising\s+concerns?|speaking\s+up|whistleblowing|'
            r'whistle\s*blow(?:ing)?|\bhr\b|human\s+resources|grievance|disciplinary)\b',
            re.IGNORECASE,
        ),
    ),
]


def _required_specialist_area(query: str) -> Optional[str]:
    """Return the specialist policy area required by a high-risk query, else None."""
    for area, query_pat, _ in _SPECIALIST_AREAS:
        if query_pat.search(query):
            return area
    return None


def _source_set_covers_specialist_area(
    filtered_rows: List[Dict[str, Any]],
    required_area: str,
) -> bool:
    """Return True if any filtered source document matches the required specialist area.

    Checks document_title and category from RPC row metadata. Returns True for
    unknown areas so the check is fail-open for areas not listed in _SPECIALIST_AREAS.
    """
    source_pat = next(
        (sp for area, _, sp in _SPECIALIST_AREAS if area == required_area), None
    )
    if source_pat is None:
        return True
    for row in filtered_rows:
        title = row.get("document_title") or ""
        category = row.get("category") or ""
        if source_pat.search(title) or source_pat.search(category):
            return True
    return False


def _reorder_rows_specialist_first(
    rows: List[Dict[str, Any]],
    required_area: Optional[str],
) -> List[Dict[str, Any]]:
    """Move specialist-matching rows to the front, preserving all rows.

    Rows whose document_title or category match the required area's source
    pattern are placed first; remaining rows follow in original order.
    Returns the original list unchanged when required_area is None or unknown.
    """
    if required_area is None:
        return rows
    source_pat = next(
        (sp for area, _, sp in _SPECIALIST_AREAS if area == required_area), None
    )
    if source_pat is None:
        return rows
    specialist, other = [], []
    for row in rows:
        title = row.get("document_title") or ""
        category = row.get("category") or ""
        if source_pat.search(title) or source_pat.search(category):
            specialist.append(row)
        else:
            other.append(row)
    return specialist + other


def _build_source_context(
    chunks: List[Dict[str, Any]],
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Build a labelled source context string and a safe citation list.
    Caps context at MAX_SOURCE_CONTEXT_CHARS and uses at most MAX_ANSWER_CHUNKS chunks.
    Never returns vectors, secrets, or full extracted text.
    chunk_preview (from normalised rows) or chunk_text (from raw rows) are both accepted.
    """
    limited = chunks[:MAX_ANSWER_CHUNKS]
    sources: List[Dict[str, Any]] = []
    parts: List[str] = []
    total_chars = 0

    for i, chunk in enumerate(limited):
        label = f"[Source {i + 1}]"
        preview = _clean_extracted_text(chunk.get("chunk_preview") or chunk.get("chunk_text") or "")[:800]
        if not preview:
            continue
        remaining = MAX_SOURCE_CONTEXT_CHARS - total_chars
        if remaining <= 0:
            break
        text = preview[:remaining]
        block = f"{label}\nDocument: {chunk.get('document_title', 'Unknown')}\n{text}"
        parts.append(block)
        total_chars += len(text)
        sources.append({
            "source_label": label,
            "document_id": str(chunk.get("document_id") or ""),
            "chunk_id": str(chunk.get("chunk_id") or ""),
            "document_title": chunk.get("document_title") or "",
            "chunk_index": int(chunk.get("chunk_index") or 0),
            "similarity": round(float(chunk.get("similarity") or 0), 4),
            "category": chunk.get("category") or "",
            "vertical": chunk.get("vertical") or "",
            "source_preview": preview,
        })

    context_str = "\n\n---\n\n".join(parts)
    return context_str, sources


def _format_source_citations(sources: List[Dict[str, Any]]) -> str:
    """Format a brief citation list for inclusion in the answer prompt."""
    return "\n".join(
        f"{s['source_label']} — {s['document_title']} (chunk {s['chunk_index']})"
        for s in sources
    )


def _generate_source_grounded_answer(
    query: str,
    context: str,
    citations: str,
) -> Dict[str, Any]:
    """
    Call ANSWER_MODEL with a strict source-grounding prompt.
    Returns {"answer": str, "model": str, "estimated_cost_note": str}.
    Tries the OpenAI Responses API first; falls back to Chat Completions if unavailable.
    OPENAI_API_KEY and ANSWER_MODEL are backend-only — never logged or returned.
    """
    from openai import OpenAI as _OpenAI
    client = _OpenAI(api_key=_OPENAI_API_KEY)

    system_prompt = (
        "You are a helpful workplace policy assistant for a UK care provider. "
        "Answer questions exclusively from the supplied source documents. "
        "Write in plain, conversational English — explain what the policy says clearly, "
        "as if talking to a colleague, not drafting a compliance document. Rules:\n"
        "- Answer only from the provided sources. Do not use outside knowledge.\n"
        "- Citations are mandatory. Every answer must include at least one [Source 1], [Source 2], etc. label. "
        "Place the citation directly after the sentence or step it supports. "
        "An answer with no citation label is invalid.\n"
        "- Do not use markdown. Do not use bold markers (**text**), headings (#), bullet dashes (-), "
        "or any other markdown formatting. "
        "Write short plain-English paragraphs or simple numbered steps (1. 2. 3.) only.\n"
        "- If sources are insufficient, say exactly: "
        "\"I can't answer that from the available approved sources.\"\n"
        "- Do not mention policies or procedures not present in the sources.\n"
        "- Be complete and factual. When the source lists specific items, such as what to record or what steps to follow, include all of them. Do not summarise a source list into fewer items than the source provides.\n"
        "- Do not give legal, clinical, safeguarding, or HR advice beyond the source wording.\n"
        "- Do not invent generic escalation phrases such as "
        "\"Please escalate this to your line manager or designated lead.\" "
        "If a source document explicitly instructs staff to contact a manager or "
        "nominated lead — particularly when staff are unsure about a decision — "
        "reproduce that wording as the answer. That referral instruction is the "
        "answer, not an add-on. Only say "
        "\"I can't answer that from the available approved sources.\" "
        "if the sources contain no relevant information at all.\n"
        "- Use UK English.\n"
        "- If the answer would include a named individual from the source document, "
        "replace their name with their role, title, or a neutral phrase such as "
        "\"the nominated manager\", \"the responsible lead\", or "
        "\"the appropriate senior staff member\", unless the name is purely "
        "informational (e.g. document author, document title, or source citation)."
    )

    user_message = (
        f"Question: {query}\n\n"
        f"Sources:\n{context}\n\n"
        f"Source index:\n{citations}"
    )

    input_tokens = 0
    output_tokens = 0

    if hasattr(client, "responses"):
        try:
            resp = client.responses.create(
                model=ANSWER_MODEL,
                instructions=system_prompt,
                input=user_message,
                max_output_tokens=400,
            )
            answer_text = (resp.output_text or "").strip()
            input_tokens = getattr(resp.usage, "input_tokens", 0)
            output_tokens = getattr(resp.usage, "output_tokens", 0)
        except Exception:
            resp_cc = client.chat.completions.create(
                model=ANSWER_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=400,
                temperature=0,
            )
            answer_text = (resp_cc.choices[0].message.content or "").strip()
            input_tokens = getattr(resp_cc.usage, "prompt_tokens", 0)
            output_tokens = getattr(resp_cc.usage, "completion_tokens", 0)
    else:
        resp_cc = client.chat.completions.create(
            model=ANSWER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=400,
            temperature=0,
        )
        answer_text = (resp_cc.choices[0].message.content or "").strip()
        input_tokens = getattr(resp_cc.usage, "prompt_tokens", 0)
        output_tokens = getattr(resp_cc.usage, "completion_tokens", 0)

    total_tokens = input_tokens + output_tokens
    if total_tokens > 0:
        # gpt-4o-mini approximate pricing: $0.15/1M input, $0.60/1M output
        cost_usd = (input_tokens * 0.15 + output_tokens * 0.60) / 1_000_000
        cost_note = (
            f"<$0.01 (~{total_tokens} tokens, model: {ANSWER_MODEL})"
            if cost_usd < 0.01
            else f"~${cost_usd:.4f} USD (~{total_tokens} tokens, model: {ANSWER_MODEL})"
        )
    else:
        cost_note = f"Model: {ANSWER_MODEL}."

    return {"answer": answer_text, "model": ANSWER_MODEL, "estimated_cost_note": cost_note}


def _sanitise_answer_text(text: str) -> str:
    """Strip markdown formatting from LLM answer text. Preserves [Source N] citations."""
    if not text:
        return text
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    lines = []
    for line in text.split('\n'):
        line = re.sub(r'^#{1,6}\s+', '', line)
        line = re.sub(r'^-\s+', '', line)
        lines.append(line)
    return '\n'.join(lines)


def _answer_contains_visible_source_label(answer: str, sources: List[Dict[str, Any]]) -> bool:
    """Return True only if the answer text includes at least one [Source n] label from the retrieved sources."""
    if not answer or not sources:
        return False
    labels = {str(s.get("source_label") or "").strip() for s in sources}
    labels = {label for label in labels if label}
    return any(label in answer for label in labels)


def _validate_grounded_answer_result(
    answer: str,
    sources: List[Dict[str, Any]],
) -> str:
    """
    Derive confidence label from the answer and retrieved sources.
    Returns: "source_grounded" | "insufficient_sources"
    "source_grounded" requires at least one visible [Source n] label in the answer.
    "blocked_safety" is determined upstream (before answer generation) when all
    raw RPC matches were excluded by safety rules.
    """
    if not sources:
        return "insufficient_sources"
    if "can't answer that from the available approved sources" in answer.lower():
        return "insufficient_sources"
    if not _answer_contains_visible_source_label(answer, sources):
        return "insufficient_sources"
    return "source_grounded"


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
    question: str = Field(..., max_length=500)


def _check_ask_rate_limit(organisation_id: str, user_id: str) -> None:
    user_key = f"user:{organisation_id}:{user_id}"
    org_key = f"org:{organisation_id}"
    retry = _check_rate_bucket(user_key, ASK_USER_RATE_LIMIT, ASK_USER_RATE_WINDOW_SECONDS)
    if retry:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before asking again.",
            headers={"Retry-After": str(retry)},
        )
    retry = _check_rate_bucket(org_key, ASK_ORG_RATE_LIMIT, ASK_ORG_RATE_WINDOW_SECONDS)
    if retry:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before asking again.",
            headers={"Retry-After": str(retry)},
        )


class Source(BaseModel):
    document_name: str
    section: Optional[str] = None
    page: Optional[int] = None
    source_label: Optional[str] = None    # e.g. "[Source 1]" — citation label


class AskResponse(BaseModel):
    answer: str
    next_steps: List[str]
    sources: List[Source]
    escalate_if: List[str]
    learning_option: Optional[str] = None

    requires_escalation: bool = False
    allowed_to_answer: bool = True
    risk_category: Literal[
        "standard", "policy", "hr", "legal", "wellbeing", "compliance", "vertical_sensitive"
    ] = "standard"
    vertical_subcategory: Optional[str] = None
    contact_routes: List[str] = []


# ---------------------------------------------------------------------------
# Document Registry models
# ---------------------------------------------------------------------------

DocumentStatus = Literal["draft", "approved", "under_review", "archived"]
DocumentVertical = Literal[
    "care", "finance", "property", "recruitment",
    "healthcare_admin", "training_provider", "general", "custom",
]
EmbeddingStatus = Literal["not_started", "pending", "processing", "partial", "indexed", "failed"]
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
    extraction_status: Optional[str] = None
    extracted_text_preview: Optional[str] = None
    extracted_character_count: Optional[int] = None
    extracted_page_count: Optional[int] = None
    personal_data_risk: Optional[str] = None
    personal_data_warnings: List[str] = []
    created_by: str = "admin"
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = {}
    # Milestone 4I — governance fields (all optional; absent on pre-migration records)
    governance_status: Optional[str] = "not_reviewed"
    governance_reviewed_by: Optional[str] = None
    governance_reviewed_at: Optional[str] = None
    governance_notes: Optional[str] = None
    real_document: Optional[bool] = False
    dummy_document: Optional[bool] = True
    source_owner: Optional[str] = None
    source_licence_notes: Optional[str] = None
    contains_qcs_or_third_party_content: Optional[bool] = False
    requires_human_review_before_embedding: Optional[bool] = True
    requires_human_review_before_staff_visibility: Optional[bool] = True
    approved_for_embedding: Optional[bool] = False
    approved_for_staff_visibility: Optional[bool] = False
    approved_for_source_grounded_answers: Optional[bool] = False

    @model_validator(mode='before')
    @classmethod
    def _coerce_db_nulls(cls, values: Any) -> Any:
        # PostgreSQL arrays/JSONB return JSON null when the column has no stored value.
        # Pydantic v2 treats null-but-present differently from absent: it does NOT
        # fall back to the field default, it raises ValidationError.  That causes
        # FastAPI response-model validation to fail with HTTP 500 even though the
        # underlying DB write succeeded.  Coerce null → appropriate defaults here so
        # the response serialisation path is always safe.
        if not isinstance(values, dict):
            return values
        for _field, _default in (
            ('tags', []),
            ('access_roles', []),
            ('personal_data_warnings', []),
            ('available_languages', ['en']),
            ('metadata', {}),
        ):
            if values.get(_field) is None:
                values = {**values, _field: _default}
        # Multipart upload stores vertical as the raw form string, which may be
        # title-cased (e.g. 'Care') if the browser sent it that way.  DocumentVertical
        # requires lowercase literals, so normalise here before validation runs.
        # Truly invalid values (e.g. 'foo') still fail DocumentVertical validation
        # because 'foo' is not a member of the Literal — only the case is corrected.
        if isinstance(values.get('vertical'), str):
            values = {**values, 'vertical': values['vertical'].lower()}
        return values


# Milestone 4S.31 — staff-safe response shape for GET /policies.
# Strips admin/storage/governance fields; exposes only what the Policy Library UI needs.
# Milestone 4S.45 — removed internal governance booleans and access control fields.
class StaffPolicyRecord(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    category: str
    tags: List[str] = []
    status: DocumentStatus = "draft"
    primary_language: str = "en"
    available_languages: List[str] = ["en"]
    translation_status: TranslationStatus = "not_required"
    version: str = "1.0"
    review_due_date: Optional[str] = None


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


class DocumentListResponse(BaseModel):
    documents: List[DocumentRecord]
    registry_source: Literal["database", "demo_fallback"]
    registry_warning: Optional[str] = None


class GenerateEmbeddingsRequest(BaseModel):
    """
    Request body for POST /documents/{id}/generate-embeddings (Milestone 4F).
    Admin-only — do not expose this endpoint to staff or public routes.
    """
    allow_dummy_override: bool = False
    max_chunks: int = 20


class VectorSearchRequest(BaseModel):
    """
    Request body for POST /documents/search-vector (Milestone 4G).
    Admin/debug-only — do not expose to staff or public routes.
    No AI answer is generated. No LLM is called.
    """
    query: str
    organisation_id: str = "demo-org"
    match_count: int = 5
    allow_dummy_override: bool = False


class AnswerDebugRequest(BaseModel):
    """
    Request body for POST /documents/answer-debug (Milestone 4H).
    Admin/debug-only — do not expose to staff or public routes.
    Generates a source-grounded answer from retrieved chunks only.
    Staff AI answers remain disabled. No real Thumhara/QCS docs yet.
    """
    query: str
    organisation_id: str = "demo-org"
    match_count: int = 5
    allow_dummy_override: bool = False


class GovernanceUpdateRequest(BaseModel):
    """
    Request body for PATCH /documents/{id}/governance (Milestone 4I).
    Admin-only. All fields are optional — only provided fields are updated.

    Safety rules enforced by the endpoint:
    - Setting is_sensitive=True or escalation_required=True forces
      approved_for_embedding and approved_for_source_grounded_answers to False.
    - approved_for_embedding and approved_for_source_grounded_answers cannot be
      set True when the effective is_sensitive or escalation_required is True
      (effective values include changes made in the same request).
    - real_document=True automatically sets dummy_document=False and vice versa.
    - governance_status must be one of: not_reviewed, pilot_approved,
      approved_for_staff, approved_for_ai, rejected, archived.
    """
    governance_status: Optional[str] = None
    real_document: Optional[bool] = None
    dummy_document: Optional[bool] = None
    governance_notes: Optional[str] = None
    governance_reviewed_by: Optional[str] = None
    governance_reviewed_at: Optional[str] = None
    source_owner: Optional[str] = None
    source_licence_notes: Optional[str] = None
    contains_qcs_or_third_party_content: Optional[bool] = None
    is_sensitive: Optional[bool] = None
    escalation_required: Optional[bool] = None
    approved_for_embedding: Optional[bool] = None
    approved_for_staff_visibility: Optional[bool] = None
    approved_for_source_grounded_answers: Optional[bool] = None


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
def debug_storage_config(_: None = Depends(_require_admin)):
    """Returns booleans and safe metadata only. Never logs or returns secret values."""
    if os.getenv("DEBUG_ENDPOINTS_ENABLED", "").lower() != "true":
        raise HTTPException(status_code=404, detail="Not Found")

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
        "storage_upload_method": _STORAGE_METHOD,
    }


# ---------------------------------------------------------------------------
# Ask endpoint
# ---------------------------------------------------------------------------

@app.post("/ask", response_model=AskResponse)
def ask_worktwin(payload: AskRequest, authorization: Optional[str] = Header(default=None)):
    """
    Staff-facing RAG endpoint — Milestone 4S.5.

    Returns source-grounded answers from staff-visible, approved, governed documents only.
    Escalation topics short-circuit without retrieval or LLM calls.
    Safe fallback is returned when no qualifying source is found.

    Safety guarantees:
    - Only documents passing all eleven governance gates are used as sources.
    - AC32 (draft, approved_for_staff_visibility=False) is structurally excluded.
    - Dummy/sample documents are structurally excluded (real_document=False or dummy_document=True).
    - Sensitive and escalation-required documents are always excluded.
    - Raw query text is never stored in audit logs.
    - document_id, chunk_id, similarity score, governance flags, embedding status
      and full chunk text are never returned to the staff response.
    - OpenAI key and admin token are never returned or logged.
    """
    if os.getenv("PILOT_AUTH_MODE", "") == "true":
        ctx = staff_context_from_header(authorization)
        organisation_id = ctx.organisation_id
        user_id = ctx.user_id
        user_role = ctx.role
    else:
        organisation_id, user_id, user_role = _get_pilot_staff_context()

    _check_ask_rate_limit(organisation_id, user_id)

    if organisation_id not in _ALLOWED_ORGANISATION_IDS:
        return _staff_fallback_response()

    import httpx as _httpx

    # ------------------------------------------------------------------
    # Guard: infrastructure must be configured
    # ------------------------------------------------------------------
    if not _OPENAI_CONFIGURED or not _DB_CONFIGURED:
        return _staff_fallback_response()

    # ------------------------------------------------------------------
    # Query prep
    # ------------------------------------------------------------------
    query_clean = payload.question.strip()
    if len(query_clean) < 3:
        return _staff_fallback_response()

    # ------------------------------------------------------------------
    # Escalation short-circuit — no retrieval, no LLM
    # Topic is audited; raw query text is never stored.
    # ------------------------------------------------------------------
    _escalation_topic = _classify_escalation_topic(query_clean)
    if _escalation_topic is not None:
        _create_audit_event(
            organisation_id=organisation_id,
            event_type="staff_ask_escalated",
            metadata={
                "query_length": len(query_clean),
                "user_role": user_role,
                "escalation_topic": _escalation_topic,
            },
        )
        _topic_cfg = _TOPIC_RESPONSE[_escalation_topic]
        return _staff_fallback_response(
            requires_escalation=True,
            risk_category=_topic_cfg["risk_category"],
            answer=_topic_cfg["answer"],
            next_steps=_topic_cfg["next_steps"],
            vertical_subcategory=_topic_cfg["vertical_subcategory"],
            contact_routes=_topic_cfg.get("contact_routes", []),
        )

    # ------------------------------------------------------------------
    # Embed query
    # ------------------------------------------------------------------
    try:
        query_vector = _embed_query_text(query_clean)
    except Exception:
        return _staff_fallback_response()

    vector_str = _format_vector_for_pgvector(query_vector)

    # ------------------------------------------------------------------
    # Vector search via RPC
    # ------------------------------------------------------------------
    rpc_url = f"{_SUPABASE_URL}/rest/v1/rpc/match_document_chunks"
    rpc_payload = {
        "query_embedding": vector_str,
        "match_organisation_id": organisation_id,
        "match_threshold": 0.0,
        "match_count": MAX_ANSWER_CHUNKS,
    }
    try:
        rpc_resp = _httpx.post(rpc_url, json=rpc_payload, headers=_db_headers(), timeout=30)
    except Exception:
        return _staff_fallback_response()

    if rpc_resp.status_code != 200:
        return _staff_fallback_response()

    raw_rows = rpc_resp.json()
    if not isinstance(raw_rows, list):
        return _staff_fallback_response()

    # ------------------------------------------------------------------
    # Fetch staff eligibility for all document IDs returned by RPC
    # ------------------------------------------------------------------
    unique_doc_ids = list({str(r.get("document_id", "")) for r in raw_rows if r.get("document_id")})
    elig_map = _fetch_staff_ask_document_eligibility_batch(unique_doc_ids)

    # ------------------------------------------------------------------
    # Apply strict staff gate — all eleven conditions must hold
    # Rows with no eligibility record (unknown doc) are always excluded.
    # ------------------------------------------------------------------
    filtered_rows: List[Dict[str, Any]] = []
    for row in raw_rows:
        doc_id_str = str(row.get("document_id", ""))
        elig = elig_map.get(doc_id_str)
        if elig is None:
            continue  # no governance record → exclude
        ok, _ = _can_use_document_for_staff_ask(elig, user_role)
        if ok:
            filtered_rows.append(row)

    # ------------------------------------------------------------------
    # No usable approved source found
    # ------------------------------------------------------------------
    if not filtered_rows:
        _create_audit_event(
            organisation_id=organisation_id,
            event_type="staff_ask_no_source",
            metadata={
                "query_length": len(query_clean),
                "rpc_result_count": len(raw_rows),
                "user_role": user_role,
            },
        )
        return _staff_fallback_response()

    # ------------------------------------------------------------------
    # Build source context and generate answer
    # ------------------------------------------------------------------
    normalised = [_normalise_search_result(r) for r in filtered_rows]
    context_str, sources = _build_source_context(normalised)
    citations_str = _format_source_citations(sources)

    try:
        answer_result = _generate_source_grounded_answer(
            query=query_clean,
            context=context_str,
            citations=citations_str,
        )
    except Exception:
        return _staff_fallback_response()

    answer_text = _sanitise_answer_text(answer_result["answer"])
    confidence = _validate_grounded_answer_result(answer_text, sources)

    # ------------------------------------------------------------------
    # Fail-closed: ungrounded model answers must never reach staff.
    # Audit event — no raw query text, no user_id.
    # ------------------------------------------------------------------
    if confidence != "source_grounded":
        _create_audit_event(
            organisation_id=organisation_id,
            event_type="staff_ask_ungrounded",
            metadata={
                "query_length": len(query_clean),
                "result_count": len(filtered_rows),
                "confidence": confidence,
                "user_role": user_role,
            },
        )
        return _staff_fallback_response()

    # ------------------------------------------------------------------
    # Audit event — no raw query text, no user_id
    # ------------------------------------------------------------------
    _create_audit_event(
        organisation_id=organisation_id,
        event_type="staff_ask_answered",
        metadata={
            "query_length": len(query_clean),
            "result_count": len(filtered_rows),
            "confidence": confidence,
            "user_role": user_role,
        },
    )

    # ------------------------------------------------------------------
    # Map sources to safe staff shape.
    # Strips: document_id, chunk_id, similarity, chunk_index,
    #         category, vertical, governance flags, source_preview.
    # Exposes: document_name (title), source_label only.
    # ------------------------------------------------------------------
    staff_sources = [
        Source(
            document_name=s["document_title"],
            source_label=s["source_label"],
            section=None,
            page=None,
        )
        for s in sources
    ]

    return AskResponse(
        answer=answer_text,
        next_steps=["Review the cited policy for full details."],
        sources=staff_sources,
        escalate_if=_STANDARD_ESCALATE_IF,
        requires_escalation=False,
        allowed_to_answer=True,
        risk_category="standard",
        learning_option=None,
    )


# ---------------------------------------------------------------------------
# Document Registry endpoints (Milestone 4A — in-memory placeholder)
# ---------------------------------------------------------------------------

@app.get("/documents", response_model=DocumentListResponse)
def list_documents(
    status: Optional[str] = None,
    category: Optional[str] = None,
    vertical: Optional[str] = None,
    organisation_id: Optional[str] = None,
    x_worktwin_admin_org: Optional[str] = Header(default=None),
    _: None = Depends(_require_admin),
):
    """
    Returns documents with registry source metadata.

    registry_source: "database" when reading live from Supabase,
                     "demo_fallback" when using in-memory sample data.
    registry_warning: non-null when DB is configured but unavailable.
    Never exposes secrets or internal keys.
    """
    # Internal proxy header (set by Next.js admin proxy from validated session) takes
    # precedence over any caller-supplied organisation_id query param.
    if x_worktwin_admin_org:
        organisation_id = x_worktwin_admin_org

    registry_warning: Optional[str] = None

    if _DB_CONFIGURED:
        try:
            records = _list_registry_records(
                organisation_id=organisation_id,
                status=status,
                category=category,
                vertical=vertical,
            )
            return DocumentListResponse(
                documents=records,
                registry_source="database",
            )
        except RuntimeError as exc:
            registry_warning = str(exc)

    # Demo fallback — DB not configured or unavailable
    docs = _documents
    if organisation_id:
        docs = [d for d in docs if d.get("organisation_id") == organisation_id]
    if status:
        docs = [d for d in docs if d["status"] == status]
    if category:
        docs = [d for d in docs if d["category"] == category]
    if vertical:
        docs = [d for d in docs if d["vertical"] == vertical]
    return DocumentListResponse(
        documents=docs,
        registry_source="demo_fallback",
        registry_warning=registry_warning,
    )


@app.get("/documents/{doc_id}", response_model=DocumentRecord)
def get_document(
    doc_id: str,
    x_worktwin_admin_org: Optional[str] = Header(default=None),
    _: None = Depends(_require_admin),
):
    if _DB_CONFIGURED:
        try:
            record = _get_registry_record(doc_id)
            if record is not None:
                if x_worktwin_admin_org and record.get("organisation_id") != x_worktwin_admin_org:
                    _audit_admin_document_cross_org_denied(
                        session_org=x_worktwin_admin_org,
                        doc_id=doc_id,
                        doc_org=record.get("organisation_id", ""),
                    )
                    raise HTTPException(status_code=404, detail="Document not found")
                return record
        except HTTPException:
            raise
        except Exception:
            pass  # fall through to in-memory on DB errors
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if x_worktwin_admin_org and doc.get("organisation_id") != x_worktwin_admin_org:
        _audit_admin_document_cross_org_denied(
            session_org=x_worktwin_admin_org,
            doc_id=doc_id,
            doc_org=doc.get("organisation_id", ""),
        )
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.post("/documents", response_model=DocumentRecord, status_code=201)
def create_document(payload: DocumentCreate, _: None = Depends(_require_admin)):
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
def update_document(doc_id: str, payload: DocumentUpdate, _: None = Depends(_require_admin)):
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    updates = payload.model_dump(exclude_none=True)
    doc.update(updates)
    doc["updated_at"] = _now()
    return doc


@app.post("/documents/{doc_id}/approve", response_model=DocumentRecord)
def approve_document(doc_id: str, _: None = Depends(_require_admin)):
    if _DB_CONFIGURED:
        try:
            updated = _update_registry_record(doc_id, {"status": "approved", "updated_at": _now()})
            if updated is not None:
                return updated
        except Exception:
            pass
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["status"] = "approved"
    doc["updated_at"] = _now()
    return doc


@app.post("/documents/{doc_id}/archive", response_model=DocumentRecord)
def archive_document(doc_id: str, _: None = Depends(_require_admin)):
    if _DB_CONFIGURED:
        try:
            updated = _update_registry_record(doc_id, {"status": "archived", "updated_at": _now()})
            if updated is not None:
                return updated
        except Exception:
            pass
    doc = _find_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["status"] = "archived"
    doc["updated_at"] = _now()
    return doc


@app.get("/documents/{doc_id}/chunks")
def list_document_chunks_admin(doc_id: str, _: None = Depends(_require_admin)):
    """
    Admin/debug endpoint — Milestone 4D.
    Returns chunk metadata and 250-character previews only.
    Full chunk text is never returned. No embeddings are stored or returned.
    """
    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    import httpx as _httpx
    url = f"{_SUPABASE_URL}/rest/v1/document_chunks"
    params = {
        "document_id": f"eq.{doc_id}",
        "order": "chunk_index.asc",
        "limit": "1000",
        "select": "id,chunk_index,chunk_text,chunk_character_count,source_page_start,source_page_end,embedding_status,approved_for_ai_answers,escalation_required",
    }
    resp = _httpx.get(url, params=params, headers=_db_headers(), timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chunks: HTTP {resp.status_code}")

    raw: List[Dict[str, Any]] = resp.json()
    chunks_out = [
        {
            "id": c.get("id"),
            "document_id": doc_id,
            "chunk_index": c.get("chunk_index"),
            "chunk_character_count": c.get("chunk_character_count"),
            "source_page_start": c.get("source_page_start"),
            "source_page_end": c.get("source_page_end"),
            "embedding_status": c.get("embedding_status"),
            "approved_for_ai_answers": c.get("approved_for_ai_answers"),
            "escalation_required": c.get("escalation_required"),
            "chunk_preview": _clean_extracted_text(c.get("chunk_text") or "")[:250],
        }
        for c in raw
    ]

    return {
        "document_id": doc_id,
        "chunk_count": len(chunks_out),
        "chunks": chunks_out,
        "embedding_note": "Embeddings stored. Admin-only vector search and source-grounded answer testing (/documents/answer-debug) are available for approved documents. Staff-facing RAG is not enabled.",
    }


# ---------------------------------------------------------------------------
# Embedding readiness endpoint (Milestone 4E)
# ---------------------------------------------------------------------------

@app.get("/documents/{doc_id}/embedding-readiness")
def get_document_embedding_readiness(doc_id: str, _: None = Depends(_require_admin)):
    """
    Admin-safe embedding readiness metadata — updated in Milestone 4F.
    Returns counts and readiness flags only.
    No vectors, no secrets, no extracted text, no full chunk content returned.
    """
    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    return _get_embedding_readiness(doc_id)


# ---------------------------------------------------------------------------
# Milestone 4F — Controlled embedding generation endpoint
# ADMIN-ONLY. No auth enforced yet — do not expose to staff or public routes.
# Generates OpenAI text-embedding-3-small vectors for dummy/sample documents.
# Does NOT enable AI answers, RAG, or vector search.
# ---------------------------------------------------------------------------

@app.post("/documents/{doc_id}/generate-embeddings")
def generate_document_embeddings(doc_id: str, payload: GenerateEmbeddingsRequest, _: None = Depends(_require_admin)):
    """
    Admin-only endpoint — Milestone 4F.

    Generates OpenAI text-embedding-3-small embeddings for document chunks and
    stores the resulting vectors in document_embeddings. Prepares for future
    vector search only. AI answers remain fully disabled.

    Safety rules enforced by this endpoint:
    - OPENAI_API_KEY must be configured on the backend (Render env var). Never frontend.
    - Chunks with escalation_required=True are always skipped.
    - Chunks with is_sensitive=True are always skipped.
    - Chunks with approved_for_ai_answers=False are skipped unless
      allow_dummy_override=True (for testing with dummy/sample PDFs only).
    - Only not_started or failed embedding records are eligible.
    - max_chunks caps how many chunks are processed in a single request.
    - No LLM, no chat, no completion endpoint is called — embeddings only.
    """
    if not _OPENAI_CONFIGURED:
        return {
            "status": "not_configured",
            "note": (
                "OPENAI_API_KEY is not set in the backend environment. "
                "Add it to Render environment variables (backend only). "
                "Never put it in frontend code or return it from any endpoint."
            ),
        }

    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    # Verify the document exists
    doc_record = _get_registry_record(doc_id)
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    # --- Milestone 4I: Document-level governance gate ---
    # Check before any per-chunk processing. Returns blocked_reason if not permitted.
    can_embed, blocked_reason = _can_embed_document(doc_record, payload.allow_dummy_override)
    if not can_embed:
        _create_audit_event(
            organisation_id=doc_record.get("organisation_id", "unknown"),
            event_type="embedding_generation_blocked",
            document_id=doc_id,
            event_summary=blocked_reason,
            metadata={
                "allow_dummy_override": payload.allow_dummy_override,
                "blocked_reason": blocked_reason,
                "real_document": doc_record.get("real_document", False),
                "dummy_document": doc_record.get("dummy_document", True),
                "governance_status": doc_record.get("governance_status", "not_reviewed"),
            },
        )
        return {
            "document_id": doc_id,
            "status": "blocked",
            "blocked_reason": blocked_reason,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "attempted_count": 0,
            "embedded_count": 0,
            "skipped_count": 0,
            "failed_count": 0,
            "total_tokens": 0,
            "estimated_cost_note": f"Model: {EMBEDDING_MODEL}. Blocked — no embeddings generated.",
            "embedding_status": doc_record.get("embedding_status", "not_started"),
            "note": "Governance gate: embedding blocked for this document. See blocked_reason.",
        }

    # Fetch all embedding records for this document
    all_records = _list_embedding_records(doc_id)
    if not all_records:
        return {
            "document_id": doc_id,
            "status": "no_records",
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "attempted_count": 0,
            "embedded_count": 0,
            "skipped_count": 0,
            "failed_count": 0,
            "total_tokens": 0,
            "estimated_cost_note": f"Model: {EMBEDDING_MODEL}. No embedding records found.",
            "embedding_status": doc_record.get("embedding_status", "not_started"),
            "note": "No embedding records found. Upload a document first to prepare embedding records.",
        }

    # --- Safety filter and eligibility check ---
    max_to_process = min(max(1, payload.max_chunks), MAX_EMBEDDING_CHUNKS_PER_REQUEST)

    eligible: List[Dict[str, Any]] = []
    filtered_out = 0

    for rec in all_records:
        rec_status = rec.get("embedding_status", "not_started")
        if rec_status not in ("not_started", "failed"):
            filtered_out += 1
            continue
        if rec.get("escalation_required", False):
            filtered_out += 1
            continue
        if rec.get("is_sensitive", False):
            filtered_out += 1
            continue
        eligible.append(rec)

    # Cap at max_chunks — deferred records count as skipped for this request
    to_process = eligible[:max_to_process]
    capped_out = len(eligible) - len(to_process)

    if not to_process:
        return {
            "document_id": doc_id,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "attempted_count": 0,
            "embedded_count": 0,
            "skipped_count": filtered_out + capped_out,
            "failed_count": 0,
            "total_tokens": 0,
            "estimated_cost_note": f"Model: {EMBEDDING_MODEL}. No eligible chunks to embed.",
            "embedding_status": doc_record.get("embedding_status", "not_started"),
            "note": (
                "No eligible chunks found. Chunks with escalation_required=True or "
                "is_sensitive=True are always skipped. "
                "All other not_started or failed chunks are eligible once the document "
                "passes the approved_for_embedding governance gate."
            ),
        }

    # --- Fetch chunk texts ---
    chunk_ids_to_fetch = [rec["chunk_id"] for rec in to_process]
    chunk_texts = _fetch_chunk_texts(chunk_ids_to_fetch)

    # Build ordered lists of texts and matching records, skipping empty chunks
    texts_to_embed: List[str] = []
    records_for_texts: List[Dict[str, Any]] = []
    empty_text_skipped = 0

    for rec in to_process:
        raw_text = chunk_texts.get(rec["chunk_id"], "").strip()
        if not raw_text:
            empty_text_skipped += 1
            continue
        if len(raw_text) > MAX_EMBEDDING_CHARACTERS_PER_CHUNK:
            raw_text = raw_text[:MAX_EMBEDDING_CHARACTERS_PER_CHUNK]
        texts_to_embed.append(raw_text)
        records_for_texts.append(rec)

    skipped_count = filtered_out + capped_out + empty_text_skipped
    attempted_count = len(texts_to_embed)
    embedded_count = 0
    failed_count = 0
    total_tokens = 0
    api_error_note: Optional[str] = None

    # --- Call OpenAI and persist vectors ---
    if texts_to_embed:
        try:
            vectors, total_tokens = _call_openai_embeddings(texts_to_embed)

            for rec, vector in zip(records_for_texts, vectors):
                try:
                    vector_str = _format_vector_for_pgvector(vector)
                    _update_embedding_record_by_id(rec["id"], {
                        "embedding": vector_str,
                        "embedding_model": EMBEDDING_MODEL,
                        "embedding_dimensions": EMBEDDING_DIMENSIONS,
                        "embedding_status": "embedded",
                        "embedding_error": None,
                    })
                    _update_chunk_embedding_status_by_id(rec["chunk_id"], "embedded")
                    embedded_count += 1
                except Exception:
                    try:
                        _update_embedding_record_by_id(rec["id"], {
                            "embedding_status": "failed",
                            "embedding_error": "Failed to save embedding vector to database.",
                        })
                    except Exception:
                        pass
                    failed_count += 1

        except Exception as exc:
            safe_err = _safe_embedding_error(exc)
            api_error_note = safe_err
            for rec in records_for_texts:
                try:
                    _update_embedding_record_by_id(rec["id"], {
                        "embedding_status": "failed",
                        "embedding_error": safe_err,
                    })
                except Exception:
                    pass
            failed_count = attempted_count

    # --- Derive new document_registry.embedding_status ---
    refreshed = _list_embedding_records(doc_id)
    total_rec = len(refreshed)
    all_emb = sum(1 for r in refreshed if r.get("embedding_status") == "embedded")
    all_fail = sum(1 for r in refreshed if r.get("embedding_status") == "failed")

    if total_rec > 0 and all_emb == total_rec:
        new_registry_status = "indexed"
    elif all_emb > 0:
        new_registry_status = "partial"
    elif all_fail == total_rec and total_rec > 0:
        new_registry_status = "failed"
    else:
        new_registry_status = doc_record.get("embedding_status", "pending")

    try:
        _update_registry_record(doc_id, {
            "embedding_status": new_registry_status,
            "updated_at": _now(),
        })
    except Exception:
        pass

    # Audit event for successful embedding generation
    if embedded_count > 0:
        _create_audit_event(
            organisation_id=doc_record.get("organisation_id", "unknown"),
            event_type="embeddings_generated",
            document_id=doc_id,
            event_summary=f"{embedded_count} chunks embedded, {skipped_count} skipped, {failed_count} failed",
            metadata={
                "embedded_count": embedded_count,
                "skipped_count": skipped_count,
                "failed_count": failed_count,
                "total_tokens": total_tokens,
                "embedding_model": EMBEDDING_MODEL,
                "allow_dummy_override": payload.allow_dummy_override,
            },
        )

    # --- Estimated cost note ---
    if total_tokens > 0:
        cost_usd = total_tokens * 0.020 / 1_000_000
        if cost_usd < 0.01:
            estimated_cost_note = (
                f"Estimated cost: <$0.01 "
                f"(model: {EMBEDDING_MODEL}, ~{total_tokens} tokens, ~${cost_usd:.6f} USD)"
            )
        else:
            estimated_cost_note = (
                f"Estimated cost: ~${cost_usd:.4f} USD "
                f"({total_tokens} tokens, model: {EMBEDDING_MODEL})"
            )
    else:
        estimated_cost_note = f"Model: {EMBEDDING_MODEL}. ~$0.020 per 1M tokens."

    result: Dict[str, Any] = {
        "document_id": doc_id,
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "attempted_count": attempted_count,
        "embedded_count": embedded_count,
        "skipped_count": skipped_count,
        "failed_count": failed_count,
        "total_tokens": total_tokens,
        "estimated_cost_note": estimated_cost_note,
        "embedding_status": new_registry_status,
        "note": (
            "Embeddings generated for retrieval preparation only. "
            "AI answers are still disabled."
        ),
    }
    if api_error_note:
        result["api_error"] = api_error_note
    return result


# ---------------------------------------------------------------------------
# Milestone 4G — Admin/debug vector retrieval endpoint
# POST /documents/search-vector
# No AI answer is generated. No LLM is called. No /ask endpoint is changed.
# ---------------------------------------------------------------------------

@app.post("/documents/search-vector")
def search_vector(
    payload: VectorSearchRequest,
    _: None = Depends(_require_admin),
    x_worktwin_admin_org: Optional[str] = Header(default=None),
):
    """
    Admin/debug-only vector retrieval endpoint — Milestone 4G.

    Embeds the query with text-embedding-3-small and searches document_embeddings
    using pgvector cosine similarity via the match_document_chunks Postgres function.
    Returns retrieved chunk metadata and previews only — no AI answer, no LLM.

    Tenant scoping: x-worktwin-admin-org (set by the Next.js admin proxy from the
    validated session) always overrides payload.organisation_id so the admin proxy
    cannot fall back to the demo-org default. Direct/internal callers without the
    header may still use payload.organisation_id for backwards compatibility.

    Safety rules enforced:
    - OPENAI_API_KEY must be configured on the backend (Render env var). Never frontend.
    - Chunks with escalation_required=True are always excluded.
    - Chunks with is_sensitive=True are always excluded.
    - Real documents require approved_for_embedding=True (document-level governance check).
    - Dummy documents require allow_dummy_override=True.
    - approved_for_source_grounded_answers is NOT required for vector retrieval.
    - approved_for_staff_visibility is NOT required for vector retrieval.
    - Query is capped at 500 characters before embedding.
    - match_count is capped at 10.
    - Vectors are never returned in API responses.
    - No LLM, no chat, no completion endpoint is called.
    - /ask endpoint behaviour is unchanged.

    Requires backend/sql/006_vector_search.sql to have been run in Supabase SQL Editor.
    """
    # x-worktwin-admin-org (from the authenticated Next.js proxy) takes precedence
    # over any caller-supplied payload.organisation_id / the "demo-org" default.
    effective_org = x_worktwin_admin_org or payload.organisation_id

    if not _OPENAI_CONFIGURED:
        return {
            "status": "not_configured",
            "note": (
                "OPENAI_API_KEY is not set in the backend environment. "
                "Add it to Render environment variables (backend only). "
                "Never put it in frontend code or return it from any endpoint."
            ),
        }

    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    query_clean = payload.query.strip()[:MAX_QUERY_CHARS]
    if not query_clean:
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    safe_count = max(1, min(payload.match_count, MAX_SEARCH_RESULTS))

    try:
        rows = _vector_search_chunks(
            organisation_id=effective_org,
            query=query_clean,
            match_count=safe_count,
            threshold=0.0,
            allow_dummy_override=payload.allow_dummy_override,
        )
    except Exception as exc:
        safe_err = _safe_embedding_error(exc)
        return {
            "query": query_clean,
            "organisation_id": effective_org,
            "match_count": safe_count,
            "result_count": 0,
            "results": [],
            "note": "Vector retrieval only. AI answers are still disabled.",
            "error": safe_err,
        }

    # Document-level governance filter: require approved_for_embedding=True for real documents.
    # approved_for_source_grounded_answers and approved_for_staff_visibility are NOT required here.
    if rows and _DB_CONFIGURED:
        unique_doc_ids = list({str(r.get("document_id", "")) for r in rows if r.get("document_id")})
        doc_gov_map = _get_document_governance_batch(unique_doc_ids)
        gov_filtered: List[Dict[str, Any]] = []
        for row in rows:
            doc_id_str = str(row.get("document_id", ""))
            gov = doc_gov_map.get(doc_id_str)
            if gov is None:
                gov_filtered.append(row)  # no governance record → allow (legacy/pre-migration)
                continue
            ok, _ = _can_use_document_for_vector_search(gov, payload.allow_dummy_override)
            if ok:
                gov_filtered.append(row)
        rows = gov_filtered

    results = [_normalise_search_result(r) for r in rows]

    return {
        "query": query_clean,
        "organisation_id": effective_org,
        "match_count": safe_count,
        "result_count": len(results),
        "results": results,
        "note": "Vector retrieval only. AI answers are still disabled.",
    }


# ---------------------------------------------------------------------------
# Milestone 4H — Admin/debug source-grounded answer test endpoint
# POST /documents/answer-debug
# Admin/debug only. Staff AI answers remain disabled. /ask is unchanged.
# Uses retrieved chunks only — no general knowledge, no invented policy detail.
# ---------------------------------------------------------------------------

@app.post("/documents/answer-debug")
def answer_debug(
    payload: AnswerDebugRequest,
    _: None = Depends(_require_admin),
    x_worktwin_admin_org: Optional[str] = Header(default=None),
):
    """
    Admin/debug-only source-grounded answer test — Milestone 4H.

    Embeds the query, retrieves chunks via pgvector, sends only those chunks to
    ANSWER_MODEL, and returns a source-grounded answer with citations.

    Tenant scoping: x-worktwin-admin-org (set by the Next.js admin proxy from the
    validated session) always overrides payload.organisation_id so the admin proxy
    cannot fall back to the demo-org default. Direct/internal callers without the
    header may still use payload.organisation_id for backwards compatibility.

    Safety rules enforced:
    - OPENAI_API_KEY must be configured on the backend. Never frontend.
    - escalation_required=True chunks always excluded from context.
    - is_sensitive=True chunks always excluded from context.
    - approved_for_ai_answers=False chunks excluded unless allow_dummy_override=True.
    - Query capped at 500 characters. match_count capped at 5.
    - Model answers only from supplied sources — never from general knowledge.
    - If no relevant chunks: returns insufficient_sources without calling the model.
    - If all matches safety-blocked: returns blocked_safety without calling the model.
    - Vectors never returned. Full extracted text never returned.
    - Staff /ask endpoint is unchanged.
    - No real Thumhara/QCS documents yet — dummy/sample only.
    """
    import httpx as _httpx

    # x-worktwin-admin-org (from the authenticated Next.js proxy) takes precedence
    # over any caller-supplied payload.organisation_id / the "demo-org" default.
    effective_org = x_worktwin_admin_org or payload.organisation_id

    if not _OPENAI_CONFIGURED:
        return {
            "status": "not_configured",
            "note": (
                "OPENAI_API_KEY is not set in the backend environment. "
                "Add it to Render environment variables (backend only). "
                "Never put it in frontend code or return it from any endpoint."
            ),
        }

    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    query_clean = payload.query.strip()[:MAX_QUERY_CHARS]
    if not query_clean:
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    safe_count = max(1, min(payload.match_count, MAX_ANSWER_CHUNKS))
    is_escalation_topic = _classify_escalation_topic(query_clean) is not None
    _focused_note = _classify_focused_safety_note(query_clean)
    safety_note: Optional[str] = (
        _focused_note
        if _focused_note is not None
        else (
            "This query involves a sensitive topic. Please escalate to your line manager or designated lead."
            if is_escalation_topic else None
        )
    )

    # Embed query once — key never logged or returned
    try:
        query_vector = _embed_query_text(query_clean)
    except Exception as exc:
        safe_err = _safe_embedding_error(exc)
        raise HTTPException(status_code=500, detail=f"Query embedding failed: {safe_err}")

    vector_str = _format_vector_for_pgvector(query_vector)

    # Call RPC to get raw matches (before safety filter)
    rpc_url = f"{_SUPABASE_URL}/rest/v1/rpc/match_document_chunks"
    rpc_payload = {
        "query_embedding": vector_str,
        "match_organisation_id": effective_org,
        "match_threshold": 0.0,
        "match_count": safe_count,
    }
    rpc_resp = _httpx.post(rpc_url, json=rpc_payload, headers=_db_headers(), timeout=30)
    if rpc_resp.status_code != 200:
        body = rpc_resp.text[:300]
        if rpc_resp.status_code == 404 or "Could not find" in body or "match_document_chunks" in body:
            raise HTTPException(
                status_code=503,
                detail=(
                    "match_document_chunks function not found. "
                    "Run backend/sql/006_vector_search.sql in Supabase SQL Editor."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=f"Vector search RPC failed: HTTP {rpc_resp.status_code}",
        )

    raw_rows = rpc_resp.json()
    if not isinstance(raw_rows, list):
        raise HTTPException(status_code=500, detail="Unexpected response from match_document_chunks.")

    # Fetch document governance upfront so chunk-level filter can honour
    # approved_for_source_grounded_answers on real documents (Milestone 4I.5).
    doc_gov_map: Dict[str, Dict[str, Any]] = {}
    if raw_rows and _DB_CONFIGURED:
        unique_doc_ids = list({str(r.get("document_id", "")) for r in raw_rows if r.get("document_id")})
        doc_gov_map = _get_document_governance_batch(unique_doc_ids)

    # Apply chunk-level safety filter — always enforce regardless of allow_dummy_override.
    # approved_for_source_grounded_answers=True at the document level supersedes the
    # stale chunk-level approved_for_ai_answers flag for real documents.
    filtered_rows: List[Dict[str, Any]] = []
    for row in raw_rows:
        if row.get("escalation_required", False):
            continue
        if row.get("is_sensitive", False):
            continue
        doc_id_str = str(row.get("document_id", ""))
        gov = doc_gov_map.get(doc_id_str)
        doc_level_approved = gov is not None and gov.get("approved_for_source_grounded_answers", False)
        if not doc_level_approved and not payload.allow_dummy_override and not row.get("approved_for_ai_answers", False):
            continue
        filtered_rows.append(row)

    # Document-level governance filter — applied on top of chunk-level filter.
    # Reuses the already-fetched doc_gov_map; no second DB call needed.
    if filtered_rows:
        gov_filtered: List[Dict[str, Any]] = []
        for row in filtered_rows:
            doc_id_str = str(row.get("document_id", ""))
            gov = doc_gov_map.get(doc_id_str)
            if gov is None:
                gov_filtered.append(row)  # no governance record → allow (legacy/pre-migration)
                continue
            ok, _ = _can_use_document_for_answer_debug(gov, payload.allow_dummy_override)
            if ok:
                gov_filtered.append(row)
        filtered_rows = gov_filtered

    _no_source_answer = "I can't answer that from the available approved sources."
    _admin_note = "Admin-only source-grounded answer test. Staff AI answers are still disabled."

    # Case 1: nothing matched the query at all
    if not raw_rows:
        return {
            "query": query_clean,
            "organisation_id": effective_org,
            "answer": _no_source_answer,
            "confidence": "insufficient_sources",
            "result_count": 0,
            "sources": [],
            "safety_note": safety_note,
            "model": "internal",
            "note": _admin_note,
        }

    # Case 2: matches found but all excluded by safety rules
    if not filtered_rows:
        return {
            "query": query_clean,
            "organisation_id": effective_org,
            "answer": "This question needs to be escalated to a human lead.",
            "confidence": "blocked_safety",
            "result_count": len(raw_rows),
            "sources": [],
            "safety_note": safety_note or "No safe approved chunks available for answer generation.",
            "model": "internal",
            "note": _admin_note,
        }

    # Case 2b: specialist area hardening — 4S.96L.
    # High-risk queries that require a specialist policy area are blocked before
    # model generation if the filtered approved source set does not contain a
    # document matching that area. _generate_source_grounded_answer is never
    # called in this path.
    required_area = _required_specialist_area(query_clean)
    if required_area is not None and not _source_set_covers_specialist_area(
        filtered_rows, required_area
    ):
        _create_audit_event(
            organisation_id=effective_org,
            event_type="answer_debug_specialist_blocked",
            document_id=None,
            event_summary=(
                f"Answer debug blocked: required_policy_area={required_area}; "
                "no matching specialist source in approved set"
            ),
            metadata={
                "query_length": len(query_clean),
                "required_policy_area": required_area,
                "result_count": len(filtered_rows),
                "allow_dummy_override": payload.allow_dummy_override,
                "is_escalation_topic": is_escalation_topic,
            },
        )
        return {
            "query": query_clean,
            "organisation_id": effective_org,
            "answer": _no_source_answer,
            "confidence": "insufficient_sources",
            "result_count": 0,
            "sources": [],
            "safety_note": safety_note or (
                "This query involves a sensitive topic. "
                "Please escalate to your line manager or designated lead."
            ),
            "model": "internal",
            "note": _admin_note,
        }

    # Case 3: usable chunks available — build context and generate answer.
    # Specialist-first ordering (4S.96N): place matching specialist rows at the
    # front so the model sees the authoritative policy source first.
    ordered_rows = _reorder_rows_specialist_first(filtered_rows, required_area)
    normalised = [_normalise_search_result(r) for r in ordered_rows]
    context_str, sources = _build_source_context(normalised)
    citations_str = _format_source_citations(sources)

    try:
        answer_result = _generate_source_grounded_answer(
            query=query_clean,
            context=context_str,
            citations=citations_str,
        )
    except Exception as exc:
        safe_err = _safe_embedding_error(exc)
        raise HTTPException(status_code=500, detail=f"Answer generation failed: {safe_err}")

    answer_text = answer_result["answer"]
    if safety_note and safety_note not in answer_text:
        answer_text = f"{answer_text}\n\n{safety_note}"
    confidence = _validate_grounded_answer_result(answer_text, sources)

    # Audit event for answer debug (regardless of confidence)
    _create_audit_event(
        organisation_id=effective_org,
        event_type="answer_debug_tested",
        document_id=None,
        event_summary=f"Answer debug: confidence={confidence}, result_count={len(filtered_rows)}",
        metadata={
            "query_length": len(query_clean),
            "confidence": confidence,
            "result_count": len(filtered_rows),
            "allow_dummy_override": payload.allow_dummy_override,
            "is_escalation_topic": is_escalation_topic,
        },
    )

    return {
        "query": query_clean,
        "organisation_id": effective_org,
        "answer": answer_text,
        "confidence": confidence,
        "result_count": len(filtered_rows),
        "sources": sources,
        "safety_note": safety_note,
        "model": "internal",
        "note": _admin_note,
    }


# ---------------------------------------------------------------------------
# Staff-safe policy library endpoint (Milestone 4A.1)
# Returns only approved documents visible to the supplied user_role.
# This endpoint is intentionally narrower than /documents (admin).
# ---------------------------------------------------------------------------

@app.get("/policies", response_model=List[StaffPolicyRecord])
def list_policies(
    vertical: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    """
    Staff-safe policy library.

    Safety guarantees enforced here (pre-RAG):
    - Only approved documents are returned.
    - In demo mode, organisation and role are derived server-side from pilot
      environment variables. In pilot-auth mode, they are taken from the
      verified StaffContext in the Authorization Bearer token. In both cases
      the caller cannot supply or override organisation_id, user_id or role.
    - Tenant scoping is enforced by passing the server-derived organisation ID
      directly into the registry query; no cross-tenant documents can leak
      through this endpoint even if other organisations have approved records.
    - Documents are filtered by the server-derived role; a staff member only
      receives policies their role is permitted to see.
    - No embedding status, storage keys or internal pipeline metadata
      are used to determine visibility; only explicit access_roles.
    - No AI answers are served from this endpoint — it is read-only metadata.
    - Documents with approved_for_ai_answers=False or escalation_required=True
      are still listed here so staff can read the policy, but the frontend
      must block the "Ask WorkTwin" CTA for those documents.
    """
    if os.getenv("PILOT_AUTH_MODE", "") == "true":
        ctx = staff_context_from_header(authorization)
        organisation_id = ctx.organisation_id
        pilot_role = ctx.role
    else:
        organisation_id, _, pilot_role = _get_pilot_staff_context()

    if organisation_id not in _ALLOWED_ORGANISATION_IDS:
        raise HTTPException(status_code=403, detail="Organisation is not allowed.")

    if _DB_CONFIGURED:
        try:
            db_docs = _list_registry_records(
                organisation_id=organisation_id,
                status="approved",
            )
            docs: List[Dict[str, Any]] = [
                d for d in db_docs if _can_show_document_to_staff(d)[0]
            ]
            docs = [
                d for d in docs
                if "All Staff" in (d.get("access_roles") or [])
                or pilot_role in (d.get("access_roles") or [])
            ]
            if vertical:
                docs = [d for d in docs if d.get("vertical") == vertical]
            if category:
                docs = [d for d in docs if d.get("category") == category]
            if language:
                docs = [d for d in docs if language in (d.get("available_languages") or [])]
            return docs
        except RuntimeError:
            pass  # fall through to in-memory demo data

    docs_mem = [
        d for d in _documents
        if d.get("organisation_id") == organisation_id and _can_show_document_to_staff(d)[0]
    ]
    docs_mem = [
        d for d in docs_mem
        if "All Staff" in d["access_roles"] or pilot_role in d["access_roles"]
    ]
    if vertical:
        docs_mem = [d for d in docs_mem if d["vertical"] == vertical]
    if category:
        docs_mem = [d for d in docs_mem if d["category"] == category]
    if language:
        docs_mem = [d for d in docs_mem if language in d["available_languages"]]
    return docs_mem


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
    x_worktwin_admin_org: Optional[str] = Header(default=None),
    _: None = Depends(_require_admin),
):
    """
    Milestone 4B: safe PDF upload.

    Validates type and size, stores in a private Supabase bucket, extracts a
    short text preview, and runs a basic personal-data risk check.

    No embeddings are created. No AI answers are generated.
    embedding_status is always set to 'pending' after upload.

    organisation_id is taken from x-worktwin-admin-org (set by the Next.js
    admin proxy from the validated session) when present, falling back to
    PILOT_ORGANISATION_ID / "demo-org". Cannot be supplied by the browser.
    """
    # ---- 0. Derive and verify organisation server-side ----
    _env_org, _, _ = _get_pilot_staff_context()
    organisation_id = x_worktwin_admin_org or _env_org
    if organisation_id not in _ALLOWED_ORGANISATION_IDS:
        raise HTTPException(status_code=403, detail="Organisation is not allowed for document upload.")

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

    # ---- 5. Text extraction (full text stored backend-only; 2,000-char preview in result) ----
    extraction_status = "skipped"
    extracted_text_preview: Optional[str] = None
    _full_extracted_text: str = ""   # full text — stored in document_extractions; never returned in API responses
    extracted_char_count: Optional[int] = None
    extracted_page_count: Optional[int] = None
    extraction_warnings: List[str] = []

    if _PYPDF_OK and _PdfReader is not None:
        try:
            reader = _PdfReader(io.BytesIO(file_bytes))
            extracted_page_count = len(reader.pages)
            page_parts: List[str] = []
            for page in reader.pages:
                page_parts.append(_clean_extracted_text(page.extract_text() or ""))
            _full_extracted_text = "".join(page_parts)
            extracted_char_count = len(_full_extracted_text)
            extracted_text_preview = _full_extracted_text[:2000].strip()
            extraction_status = "success"
            if extracted_char_count == 0:
                extraction_warnings.append(
                    "No text extracted. The PDF may be a scanned image or encrypted."
                )
        except Exception:
            extraction_status = "failed"
            extraction_warnings.append(_safe_extraction_warning())
    else:
        extraction_warnings.append("pypdf not installed — text extraction skipped.")

    # ---- 6. Personal-data risk check ----
    personal_data_risk, personal_data_warnings = _check_personal_data_risk(
        extracted_text_preview or ""
    )

    # ---- 7. Storage: not configured → 503 ----
    if _STORAGE_METHOD == "none":
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
                "extraction_storage_status": "not_configured",
                "chunking_status": "not_configured",
                "chunk_count": 0,
            },
        )

    # ---- 8. Upload to Supabase private bucket ----
    document_id = str(uuid.uuid4())
    safe_name = _safe_filename(filename)
    storage_path = f"{organisation_id}/documents/{document_id}/{safe_name}"

    try:
        if _STORAGE_METHOD == "supabase_client":
            _supabase.storage.from_(_SUPABASE_STORAGE_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/pdf"},
            )
        else:
            _http_upload_to_supabase(storage_path, file_bytes)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=_safe_upload_error_message("storage"),
        )

    # ---- 9. Build registry record ----
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
        "extraction_status": extraction_status,
        "extracted_text_preview": extracted_text_preview,
        "extracted_character_count": extracted_char_count,
        "extracted_page_count": extracted_page_count,
        "personal_data_risk": personal_data_risk,
        "personal_data_warnings": personal_data_warnings,
        "created_by": "admin",
        "created_at": now,
        "updated_at": now,
        "metadata": {"upload_source": "admin_upload", "milestone": "4I"},
        # Milestone 4I — governance defaults: all uploads start as not-reviewed dummy docs
        "governance_status": "not_reviewed",
        "real_document": False,
        "dummy_document": True,
        "approved_for_embedding": False,
        "approved_for_staff_visibility": False,
        "approved_for_source_grounded_answers": False,
        "requires_human_review_before_embedding": True,
        "requires_human_review_before_staff_visibility": True,
    }

    # ---- 10. Persist to Supabase document_registry DB ----
    registry_status = "not_configured"
    registry_error: Optional[str] = None

    if _DB_CONFIGURED:
        try:
            persisted = _create_registry_record(doc)
            doc = persisted
            registry_status = "saved"
        except RuntimeError:
            registry_status = "failed"
            registry_error = _safe_upload_error_message("registry")

    if registry_status == "saved":
        _create_audit_event(
            organisation_id=organisation_id,
            event_type="document_uploaded",
            document_id=document_id,
            event_summary=f"Document uploaded: {safe_name} ({file_size} bytes)",
            metadata={
                "file_name": safe_name,
                "file_size_bytes": file_size,
                "extraction_status": extraction_status,
                "personal_data_risk": personal_data_risk,
                "milestone": "4I",
            },
        )

    # ---- 10a. Store full extracted text in document_extractions ----
    extraction_storage_status = "not_configured"
    extraction_storage_error: Optional[str] = None

    if _DB_CONFIGURED:
        if registry_status == "saved":
            try:
                _create_extraction_record({
                    "organisation_id": organisation_id,
                    "document_id": document_id,
                    "extraction_status": extraction_status,
                    "extracted_text": _full_extracted_text if _full_extracted_text else None,
                    "extracted_character_count": extracted_char_count,
                    "extracted_page_count": extracted_page_count,
                    "extraction_warnings": extraction_warnings,
                    "personal_data_risk": personal_data_risk,
                    "personal_data_warnings": personal_data_warnings,
                    "metadata": {"milestone": "4I"},
                })
                extraction_storage_status = "saved"
                _create_audit_event(
                    organisation_id=organisation_id,
                    event_type="extraction_saved",
                    document_id=document_id,
                    event_summary=f"Extraction saved: {extracted_char_count} chars, {extracted_page_count} pages",
                    metadata={"extraction_status": extraction_status, "char_count": extracted_char_count},
                )
            except Exception:
                extraction_storage_status = "failed"
                extraction_storage_error = _safe_upload_error_message("extraction_storage")
        else:
            extraction_storage_status = "skipped"

    # ---- 10b. Create document chunks from extracted text ----
    chunking_status = "not_configured"
    chunk_count = 0
    chunking_error: Optional[str] = None

    if _DB_CONFIGURED:
        if registry_status == "saved" and _full_extracted_text:
            try:
                raw_chunks = _chunk_text(_full_extracted_text)
                chunk_count = len(raw_chunks)
                now_ts = _now()
                chunks_payload = [
                    {
                        "organisation_id": organisation_id,
                        "document_id": document_id,
                        "chunk_index": idx,
                        "chunk_text": chunk,
                        "chunk_character_count": len(chunk),
                        "access_roles": access_roles_list,
                        "status": "pending",
                        "vertical": vertical,
                        "category": category,
                        "approved_for_ai_answers": _parse_bool(approved_for_ai_answers),
                        "escalation_required": _parse_bool(escalation_required),
                        "is_sensitive": _parse_bool(is_sensitive),
                        "embedding_status": "not_started",
                        "created_at": now_ts,
                        "updated_at": now_ts,
                        "metadata": {"milestone": "4D"},
                    }
                    for idx, chunk in enumerate(raw_chunks)
                ]
                if chunks_payload:
                    _create_document_chunks(chunks_payload)
                    # Non-critical: update registry metadata with chunk_count
                    try:
                        meta = {**(doc.get("metadata") or {}), "chunk_count": chunk_count}
                        _update_registry_record(document_id, {"metadata": meta, "updated_at": _now()})
                        if isinstance(doc, dict):
                            doc.setdefault("metadata", {})["chunk_count"] = chunk_count
                    except Exception:
                        pass
                chunking_status = "prepared" if chunk_count > 0 else "no_text"
                if chunking_status == "prepared":
                    _create_audit_event(
                        organisation_id=organisation_id,
                        event_type="chunks_prepared",
                        document_id=document_id,
                        event_summary=f"{chunk_count} chunks prepared for document",
                        metadata={"chunk_count": chunk_count},
                    )
            except Exception:
                chunk_count = 0
                chunking_status = "failed"
                chunking_error = _safe_upload_error_message("chunking")
        elif registry_status != "saved":
            chunking_status = "skipped"
        else:
            chunking_status = "no_text"

    # ---- 10c. Prepare embedding records for future generation (Milestone 4E) ----
    # No vectors are generated. No external API is called.
    embedding_preparation_status = "not_configured"
    embedding_record_count = 0

    if _DB_CONFIGURED:
        if chunking_status == "prepared" and chunk_count > 0:
            try:
                emb_result = _prepare_embedding_records_for_document(document_id)
                embedding_preparation_status = emb_result.get("status", "failed")
                embedding_record_count = emb_result.get("embedding_record_count", 0)
                if embedding_preparation_status in ("prepared", "already_prepared"):
                    _create_audit_event(
                        organisation_id=organisation_id,
                        event_type="embedding_records_prepared",
                        document_id=document_id,
                        event_summary=f"{embedding_record_count} embedding records prepared (not yet generated)",
                        metadata={"embedding_record_count": embedding_record_count, "status": embedding_preparation_status},
                    )
            except Exception:
                embedding_preparation_status = "failed"
        else:
            embedding_preparation_status = "skipped"

    # ---- 11. Return result ----
    result: Dict[str, Any] = {
        "upload_status": "success",
        "storage_status": "uploaded",
        "registry_status": registry_status,
        "extraction_status": extraction_status,
        "extraction_storage_status": extraction_storage_status,
        "chunking_status": chunking_status,
        "chunk_count": chunk_count,
        "embedding_preparation_status": embedding_preparation_status,
        "embedding_record_count": embedding_record_count,
        "embedding_status": "pending",
        "document_id": document_id,
        "file_name": safe_name,
        "file_size_bytes": file_size,
        "storage_key": storage_path,
        "extracted_text_preview": extracted_text_preview,
        "extracted_character_count": extracted_char_count,
        "extracted_page_count": extracted_page_count,
        "extraction_warnings": extraction_warnings,
        "personal_data_risk": personal_data_risk,
        "personal_data_warnings": personal_data_warnings,
        "chunking_note": (
            "Chunks prepared. Embeddings and AI answers are not enabled yet."
            if chunk_count > 0 else None
        ),
        "embedding_note": (
            "Embedding records prepared. No embeddings have been generated yet."
            if embedding_preparation_status in ("prepared", "already_prepared") else None
        ),
        "ai_answers_note": (
            "Uploaded document is not yet available for AI answers. "
            "Embedding records have been prepared for future generation."
            if embedding_preparation_status in ("prepared", "already_prepared") else
            "Uploaded document is not yet available for AI answers. "
            "Chunking, embeddings and source-citation checks will be enabled in a later milestone."
        ),
        "document": doc,
    }
    if registry_error:
        result["registry_error"] = registry_error
    if extraction_storage_error:
        result["extraction_storage_error"] = extraction_storage_error
    if chunking_error:
        result["chunking_error"] = chunking_error
    return result


# ---------------------------------------------------------------------------
# Milestone 4I — Governance update endpoint
# PATCH /documents/{id}/governance
# Admin-only. Updates governance fields. Enforces safety rules.
# Never enables staff-facing /ask. Never exposes secrets.
# ---------------------------------------------------------------------------

_ALLOWED_GOVERNANCE_STATUSES = frozenset({
    "not_reviewed", "pilot_approved", "approved_for_staff",
    "approved_for_ai", "rejected", "archived",
})


@app.patch("/documents/{doc_id}/governance", response_model=DocumentRecord)
def update_document_governance(doc_id: str, payload: GovernanceUpdateRequest, _: None = Depends(_require_admin)):
    """
    Admin-only governance update endpoint — Milestone 4I.

    Updates governance fields for a document. Enforces safety rules:
    - Setting is_sensitive=True or escalation_required=True forces
      approved_for_embedding and approved_for_source_grounded_answers to False.
    - approved_for_embedding and approved_for_source_grounded_answers cannot be
      set True when effective is_sensitive or escalation_required is True
      (effective values include changes made in the same request).
    - real_document=True automatically sets dummy_document=False and vice versa.
    - governance_status must be a recognised value.

    Writes an audit event on success.
    Staff AI answers and /ask endpoint remain disabled regardless.
    """
    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    doc_record = _get_registry_record(doc_id)
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_sensitive = doc_record.get("is_sensitive", False)
    escalation_required = doc_record.get("escalation_required", False)
    organisation_id = doc_record.get("organisation_id", "unknown")

    # Effective values account for is_sensitive/escalation_required changes in this request.
    effective_sensitive = payload.is_sensitive if payload.is_sensitive is not None else is_sensitive
    effective_escalation = payload.escalation_required if payload.escalation_required is not None else escalation_required

    updates: Dict[str, Any] = {}

    # governance_status validation
    if payload.governance_status is not None:
        if payload.governance_status not in _ALLOWED_GOVERNANCE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"governance_status must be one of: "
                    f"{', '.join(sorted(_ALLOWED_GOVERNANCE_STATUSES))}"
                ),
            )
        updates["governance_status"] = payload.governance_status

    # is_sensitive / escalation_required
    if payload.is_sensitive is not None:
        updates["is_sensitive"] = payload.is_sensitive
    if payload.escalation_required is not None:
        updates["escalation_required"] = payload.escalation_required

    # Safety: marking sensitive or escalation-required in this request forces embedding flags off.
    setting_sensitive_true = payload.is_sensitive is True or payload.escalation_required is True
    if setting_sensitive_true:
        updates["approved_for_embedding"] = False
        updates["approved_for_source_grounded_answers"] = False

    # real_document / dummy_document — mutually exclusive
    if payload.real_document is True:
        updates["real_document"] = True
        updates["dummy_document"] = False
    elif payload.dummy_document is True:
        updates["dummy_document"] = True
        updates["real_document"] = False
    elif payload.real_document is False:
        updates["real_document"] = False
    elif payload.dummy_document is False:
        updates["dummy_document"] = False

    # approved_for_embedding — blocked when effective sensitive/escalation is True
    if payload.approved_for_embedding is not None and not setting_sensitive_true:
        if payload.approved_for_embedding and (effective_sensitive or effective_escalation):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot approve for embedding: document is marked sensitive or requires "
                    "escalation. Human review and an explicit future governance override are "
                    "required before this block can be lifted."
                ),
            )
        updates["approved_for_embedding"] = payload.approved_for_embedding

    # approved_for_source_grounded_answers — blocked when effective sensitive/escalation is True
    if payload.approved_for_source_grounded_answers is not None and not setting_sensitive_true:
        if payload.approved_for_source_grounded_answers and (effective_sensitive or effective_escalation):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot approve for source-grounded answers: document is marked sensitive or "
                    "requires escalation. Human review and an explicit future governance override "
                    "are required before this block can be lifted."
                ),
            )
        updates["approved_for_source_grounded_answers"] = payload.approved_for_source_grounded_answers

        # Require a named reviewer when enabling source-grounded AI answers.
        # Prevents documents from silently failing the staff /ask gate due to
        # missing governance_reviewed_by — the strictest condition that
        # governance-readiness previously did not check.
        if payload.approved_for_source_grounded_answers is True:
            existing_reviewer = doc_record.get("governance_reviewed_by")
            incoming_reviewer = (
                payload.governance_reviewed_by.strip()
                if payload.governance_reviewed_by and payload.governance_reviewed_by.strip()
                else None
            )
            if not existing_reviewer and not incoming_reviewer:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "governance_reviewed_by is required when approving for "
                        "source-grounded answers. Provide a non-empty reviewer name "
                        "in the same request."
                    ),
                )

    # approved_for_staff_visibility — no additional block (document-level only)
    if payload.approved_for_staff_visibility is not None:
        updates["approved_for_staff_visibility"] = payload.approved_for_staff_visibility

    # Other optional governance fields
    if payload.governance_notes is not None:
        updates["governance_notes"] = payload.governance_notes
    if payload.governance_reviewed_by is not None:
        if payload.governance_reviewed_by.strip() == "":
            raise HTTPException(status_code=400, detail="governance_reviewed_by must not be empty.")
        updates["governance_reviewed_by"] = payload.governance_reviewed_by.strip()
    if payload.governance_reviewed_at is not None:
        updates["governance_reviewed_at"] = payload.governance_reviewed_at
    if payload.source_owner is not None:
        updates["source_owner"] = payload.source_owner
    if payload.source_licence_notes is not None:
        updates["source_licence_notes"] = payload.source_licence_notes
    if payload.contains_qcs_or_third_party_content is not None:
        updates["contains_qcs_or_third_party_content"] = payload.contains_qcs_or_third_party_content

    if not updates:
        return doc_record

    updates["updated_at"] = _now()

    updated = _update_registry_record(doc_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail="Governance update failed — DB write error.")

    # Determine the most specific audit event type and human-readable summary
    event_type = "governance_status_changed"
    if payload.approved_for_embedding is True:
        event_type = "document_approved_for_embedding"
        event_summary = "Document approved for embedding."
    elif payload.approved_for_source_grounded_answers is True:
        event_type = "document_approved_for_source_grounded_answers"
        event_summary = "Document approved for source-grounded answer testing."
    elif payload.approved_for_staff_visibility is True:
        event_type = "document_approved_for_staff_visibility"
        event_summary = "Document approved for staff visibility."
    elif payload.governance_status == "rejected":
        event_type = "document_rejected"
        event_summary = "Document rejected during governance review."
    elif payload.governance_status == "archived":
        event_type = "document_archived"
        event_summary = "Document archived."
    elif payload.real_document is True:
        event_summary = "Document marked as real pilot document."
    elif payload.dummy_document is True:
        event_summary = "Document marked as dummy test document."
    elif payload.approved_for_embedding is False:
        event_summary = "Embedding approval removed from document."
    elif payload.approved_for_source_grounded_answers is False:
        event_summary = "AI answer approval removed from document."
    elif payload.approved_for_staff_visibility is False:
        event_summary = "Staff visibility approval removed from document."
    else:
        event_summary = f"Governance fields updated: {', '.join(k for k in updates if k != 'updated_at')}."

    _create_audit_event(
        organisation_id=organisation_id,
        event_type=event_type,
        document_id=doc_id,
        event_summary=event_summary,
        metadata={"updates": {k: v for k, v in updates.items() if k != "updated_at"}},
    )

    return updated


# ---------------------------------------------------------------------------
# Milestone 4I.1 — Governance readiness summary endpoint
# GET /documents/{id}/governance-readiness
# Admin/debug only. No extracted text, no embeddings, no secrets returned.
# ---------------------------------------------------------------------------

@app.get("/documents/{doc_id}/governance-readiness")
def get_document_governance_readiness(doc_id: str, _: None = Depends(_require_admin)):
    """
    Admin/debug-only governance readiness summary — Milestone 4I.1.

    Returns whether the document can be embedded, used for AI answer testing,
    and shown to staff, along with human-readable blocked reasons and next actions.

    Safety guarantees:
    - Full extracted text is never returned.
    - Embedding vectors are never returned.
    - Secrets are never returned or logged.
    - Staff-facing AI answers remain disabled regardless of readiness status.
    """
    if not _DB_CONFIGURED:
        raise HTTPException(status_code=503, detail="Database not configured.")

    doc = _get_registry_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_sensitive = bool(doc.get("is_sensitive", False))
    escalation_required = bool(doc.get("escalation_required", False))
    real_document = bool(doc.get("real_document", False))
    dummy_document = bool(doc.get("dummy_document", True))
    approved_for_embedding = bool(doc.get("approved_for_embedding", False))
    approved_for_source_grounded_answers = bool(doc.get("approved_for_source_grounded_answers", False))
    approved_for_staff_visibility = bool(doc.get("approved_for_staff_visibility", False))
    governance_status = doc.get("governance_status") or "not_reviewed"
    doc_status = doc.get("status", "draft")

    blocked_reasons: List[str] = []
    next_required_actions: List[str] = []

    # --- can_embed_now ---
    if is_sensitive:
        can_embed_now = False
        blocked_reasons.append("Document is marked sensitive and cannot be embedded.")
        next_required_actions.append(
            "Sensitive documents are permanently blocked from embedding — no action available."
        )
    elif escalation_required:
        can_embed_now = False
        blocked_reasons.append("Document requires escalation and cannot be embedded.")
        next_required_actions.append(
            "Escalation-required documents are permanently blocked from embedding — no action available."
        )
    elif real_document and not approved_for_embedding:
        can_embed_now = False
        blocked_reasons.append("Real document requires governance approval before embedding.")
        next_required_actions.append(
            f"Approve for embedding via PATCH /documents/{doc_id}/governance "
            "(approved_for_embedding=true) after completing human review."
        )
    else:
        can_embed_now = True
        if not real_document:
            next_required_actions.append(
                f"Dummy/sample document — pass allow_dummy_override=true when calling "
                f"POST /documents/{doc_id}/generate-embeddings."
            )

    # --- can_use_for_answer_debug_now ---
    if is_sensitive:
        can_use_for_answer_debug_now = False
        if "Document is marked sensitive and cannot be used for AI answers." not in blocked_reasons:
            blocked_reasons.append("Document is marked sensitive and cannot be used for AI answers.")
    elif escalation_required:
        can_use_for_answer_debug_now = False
        if "Document requires escalation and cannot be used for AI answers." not in blocked_reasons:
            blocked_reasons.append("Document requires escalation and cannot be used for AI answers.")
    elif real_document and not approved_for_source_grounded_answers:
        can_use_for_answer_debug_now = False
        blocked_reasons.append(
            "Real document requires governance approval before source-grounded answer testing."
        )
        next_required_actions.append(
            f"Approve for AI answer testing via PATCH /documents/{doc_id}/governance "
            "(approved_for_source_grounded_answers=true) after completing human review."
        )
    else:
        can_use_for_answer_debug_now = True
        if not real_document and not any("allow_dummy_override" in a for a in next_required_actions):
            next_required_actions.append(
                "Dummy/sample document — pass allow_dummy_override=true when calling "
                "POST /documents/answer-debug."
            )

    # --- can_show_to_staff_now ---
    if doc_status != "approved":
        can_show_to_staff_now = False
        blocked_reasons.append(
            f"Document status is '{doc_status}' — must be 'approved' before staff visibility."
        )
        next_required_actions.append(
            f"Change document status to 'approved' via POST /documents/{doc_id}/approve."
        )
    elif not approved_for_staff_visibility:
        can_show_to_staff_now = False
        blocked_reasons.append(
            "Document requires approved_for_staff_visibility=true before staff visibility."
        )
        next_required_actions.append(
            f"Approve for staff visibility via PATCH /documents/{doc_id}/governance "
            "(approved_for_staff_visibility=true)."
        )
    else:
        can_show_to_staff_now = True

    # --- can_use_for_staff_ask_now ---
    # Runs the full eleven-condition staff /ask gate so admins can see exactly why
    # a document that passes /policies still fails live /ask retrieval.
    # Uses the pilot user role from the environment (default: Care Worker).
    _pilot_role = os.getenv("PILOT_USER_ROLE", "Care Worker")
    can_use_for_staff_ask_now, staff_ask_blocked_reason = _can_use_document_for_staff_ask(
        doc, _pilot_role
    )
    if not can_use_for_staff_ask_now and staff_ask_blocked_reason:
        blocked_reasons.append(f"Staff Ask: {staff_ask_blocked_reason}")
        if "governance_reviewed_by" in staff_ask_blocked_reason:
            next_required_actions.append(
                f"Set governance_reviewed_by via PATCH /documents/{doc_id}/governance "
                "(governance_reviewed_by=<reviewer-name>, governance_reviewed_at=<ISO-timestamp>)."
            )
        elif "governance_reviewed_at" in staff_ask_blocked_reason:
            next_required_actions.append(
                f"Set governance_reviewed_at via PATCH /documents/{doc_id}/governance "
                "(governance_reviewed_at=<ISO-timestamp>)."
            )
        elif "contains_qcs_or_third_party_content" in staff_ask_blocked_reason:
            next_required_actions.append(
                f"Explicitly set contains_qcs_or_third_party_content=false via "
                f"PATCH /documents/{doc_id}/governance."
            )
        elif "embedding_status" in staff_ask_blocked_reason:
            next_required_actions.append(
                f"Generate embeddings via POST /documents/{doc_id}/generate-embeddings."
            )

    return {
        "document_id": doc_id,
        "title": doc.get("title", ""),
        "dummy_document": dummy_document,
        "real_document": real_document,
        "governance_status": governance_status,
        "is_sensitive": is_sensitive,
        "escalation_required": escalation_required,
        "approved_for_embedding": approved_for_embedding,
        "approved_for_staff_visibility": approved_for_staff_visibility,
        "approved_for_source_grounded_answers": approved_for_source_grounded_answers,
        "can_embed_now": can_embed_now,
        "can_use_for_answer_debug_now": can_use_for_answer_debug_now,
        "can_show_to_staff_now": can_show_to_staff_now,
        "can_use_for_staff_ask_now": can_use_for_staff_ask_now,
        "staff_ask_blocked_reason": staff_ask_blocked_reason,
        "blocked_reasons": blocked_reasons,
        "next_required_actions": next_required_actions,
        "note": "Governance readiness only. Staff-facing AI answers remain disabled.",
    }


# ---------------------------------------------------------------------------
# Milestone 4S.90N -- GET /admin/session-check
# Called by the Next.js admin proxy to validate whether the bearer token holder
# is permitted to use admin proxy routes.
# Returns only minimal identity fields. Never returns tokens, secrets,
# document data, membership rows, admin token, or service role key.
# ---------------------------------------------------------------------------

@app.get("/admin/session-check")
def admin_session_check(authorization: Optional[str] = Header(default=None)):
    ctx = staff_context_from_header(authorization)

    if ctx.organisation_id not in _ALLOWED_ORGANISATION_IDS:
        return JSONResponse(
            status_code=403,
            content={
                "allowed": False,
                "user_id": ctx.user_id,
                "organisation_id": ctx.organisation_id,
                "role": ctx.role,
                "active": True,
                "reason": "organisation_not_allowed",
            },
        )

    if ctx.role not in _ADMIN_SESSION_ALLOWED_ROLES:
        return JSONResponse(
            status_code=403,
            content={
                "allowed": False,
                "user_id": ctx.user_id,
                "organisation_id": ctx.organisation_id,
                "role": ctx.role,
                "active": True,
                "reason": "role_not_allowed",
            },
        )

    return {
        "allowed": True,
        "user_id": ctx.user_id,
        "organisation_id": ctx.organisation_id,
        "role": ctx.role,
        "active": True,
        "reason": "admin_session_allowed",
    }


# ---------------------------------------------------------------------------
# Milestone 4S.103C-1 -- GET /staff/session-check
# Called by Next.js staff route middleware to confirm the bearer token holder
# has an active, allowed staff membership before access is granted.
# JWT validation and membership lookup are the authoritative source of truth;
# no client-supplied organisation, role or user fields are trusted.
# Returns only minimal identity fields. Never returns user_id, token, email,
# membership id, secrets, document data or admin fields.
# ---------------------------------------------------------------------------

@app.get("/staff/session-check")
def staff_session_check(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )
    token = authorization[len("Bearer "):]
    if not token:
        return JSONResponse(
            status_code=401,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )

    # JWT validation — 401 for any token error, 503 when configuration is absent.
    try:
        payload = validate_staff_jwt(token)
    except HTTPException as exc:
        if exc.status_code == 503:
            return JSONResponse(
                status_code=503,
                content={"allowed": False, "reason": "auth_unavailable"},
                headers=_NO_STORE_HEADERS,
            )
        return JSONResponse(
            status_code=401,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )

    # Membership resolution — valid token but no/inactive membership → 403.
    try:
        ctx = resolve_staff_context(payload)
    except HTTPException as exc:
        if exc.status_code == 503:
            return JSONResponse(
                status_code=503,
                content={"allowed": False, "reason": "auth_unavailable"},
                headers=_NO_STORE_HEADERS,
            )
        return JSONResponse(
            status_code=403,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )

    if ctx.organisation_id not in _ALLOWED_ORGANISATION_IDS:
        return JSONResponse(
            status_code=403,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )

    if ctx.role not in _STAFF_SESSION_ALLOWED_ROLES:
        return JSONResponse(
            status_code=403,
            content={"allowed": False, "reason": "access_denied"},
            headers=_NO_STORE_HEADERS,
        )

    return JSONResponse(
        content={
            "allowed": True,
            "organisation_id": ctx.organisation_id,
            "role": ctx.role,
            "active": True,
        },
        headers=_NO_STORE_HEADERS,
    )
