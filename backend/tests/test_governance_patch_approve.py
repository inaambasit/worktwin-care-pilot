"""
Tests for the governance PATCH and approve POST response-serialisation fix.

Root cause: Pydantic v2 raises ValidationError when a DB row contains null for a
field typed List[str]/Dict that has a default.  The key-present-with-None case does
NOT fall back to the field default — it fails.  FastAPI catches that ValidationError
and returns HTTP 500, even though the underlying DB write succeeded.

The fix is a model_validator(mode='before') on DocumentRecord that coerces null DB
values to their field defaults before Pydantic validation runs.

Covers:
  1. DocumentRecord.model_validator: None -> default coercion for each affected field
  2. POST /documents/{id}/approve -- returns 200 after successful DB write
  3. PATCH /documents/{id}/governance -- returns 200 after successful DB write
  4. Governance safety gates remain enforced (no regression)
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app, _require_admin, DocumentRecord

client = TestClient(app)


@pytest.fixture(autouse=False)
def bypass_admin():
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Shared fixture: a fully-formed DB row representing TC-POL-005 after approval
# ---------------------------------------------------------------------------

_DB_ROW = {
    "id": "db-doc-001",
    "organisation_id": "thumhara-centre",
    "title": "TC-POL-005 Professional Boundaries",
    "description": None,
    "file_name": "tc-pol-005.pdf",
    "file_type": "pdf",
    "file_size_bytes": 12345,
    "storage_key": "thumhara-centre/documents/db-doc-001/tc-pol-005.pdf",
    "vertical": "care",
    "category": "HR",
    "tags": [],
    "status": "approved",
    "access_roles": ["All Staff"],
    "is_sensitive": False,
    "escalation_required": False,
    "approved_for_ai_answers": False,
    "contains_personal_data_warning": False,
    "primary_language": "en",
    "available_languages": ["en"],
    "translation_status": "not_required",
    "human_review_required": False,
    "version": "1.0",
    "review_due_date": None,
    "embedding_status": "indexed",
    "extraction_status": "success",
    "extracted_text_preview": None,
    "extracted_character_count": 5000,
    "extracted_page_count": 3,
    "personal_data_risk": "low",
    "personal_data_warnings": [],
    "created_by": "admin",
    "created_at": "2025-01-01T00:00:00+00:00",
    "updated_at": "2025-01-19T10:30:00+00:00",
    "metadata": {"upload_source": "admin_upload", "milestone": "4I"},
    "governance_status": "approved_for_staff",
    "governance_reviewed_by": "Dr. Smith",
    "governance_reviewed_at": "2025-01-19T10:00:00+00:00",
    "governance_notes": None,
    "real_document": True,
    "dummy_document": False,
    "source_owner": None,
    "source_licence_notes": None,
    "contains_qcs_or_third_party_content": False,
    "requires_human_review_before_embedding": False,
    "requires_human_review_before_staff_visibility": False,
    "approved_for_embedding": True,
    "approved_for_staff_visibility": True,
    "approved_for_source_grounded_answers": True,
}

# Minimal dict for model-level unit tests (no DB required)
_MODEL_BASE = {
    "id": "doc-001",
    "organisation_id": "org-001",
    "title": "Test Document",
    "category": "HR",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
}


# ---------------------------------------------------------------------------
# 1. DocumentRecord model_validator -- null -> default coercion
# ---------------------------------------------------------------------------

class TestDocumentRecordNullCoercion:

    def test_null_tags_coerced_to_empty_list(self):
        r = DocumentRecord(**{**_MODEL_BASE, "tags": None})
        assert r.tags == []

    def test_null_access_roles_coerced_to_empty_list(self):
        r = DocumentRecord(**{**_MODEL_BASE, "access_roles": None})
        assert r.access_roles == []

    def test_null_available_languages_coerced_to_default(self):
        r = DocumentRecord(**{**_MODEL_BASE, "available_languages": None})
        assert r.available_languages == ["en"]

    def test_null_personal_data_warnings_coerced_to_empty_list(self):
        r = DocumentRecord(**{**_MODEL_BASE, "personal_data_warnings": None})
        assert r.personal_data_warnings == []

    def test_null_metadata_coerced_to_empty_dict(self):
        r = DocumentRecord(**{**_MODEL_BASE, "metadata": None})
        assert r.metadata == {}

    def test_all_nulls_coerced_simultaneously(self):
        r = DocumentRecord(**{
            **_MODEL_BASE,
            "tags": None,
            "access_roles": None,
            "available_languages": None,
            "personal_data_warnings": None,
            "metadata": None,
        })
        assert r.tags == []
        assert r.access_roles == []
        assert r.available_languages == ["en"]
        assert r.personal_data_warnings == []
        assert r.metadata == {}

    def test_non_null_list_values_unchanged(self):
        r = DocumentRecord(**{
            **_MODEL_BASE,
            "tags": ["policy", "hr"],
            "access_roles": ["Care Worker"],
        })
        assert r.tags == ["policy", "hr"]
        assert r.access_roles == ["Care Worker"]

    def test_empty_list_values_unchanged(self):
        r = DocumentRecord(**{**_MODEL_BASE, "tags": [], "access_roles": []})
        assert r.tags == []
        assert r.access_roles == []


# ---------------------------------------------------------------------------
# 2. POST /documents/{id}/approve -- must return 200 not 500
# ---------------------------------------------------------------------------

class TestApproveEndpoint:

    def test_approve_returns_200_when_db_write_succeeds(self, bypass_admin):
        """DB write succeeds; endpoint must return 200 with a valid DocumentRecord."""
        updated = {**_DB_ROW, "status": "approved"}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._update_registry_record", return_value=updated):
            resp = client.post("/documents/db-doc-001/approve")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "approved"
        assert body["id"] == "db-doc-001"

    def test_approve_returns_200_when_db_row_has_null_array_columns(self, bypass_admin):
        """DB row with null array/jsonb columns must not cause a 500 response."""
        updated = {
            **_DB_ROW,
            "status": "approved",
            "tags": None,
            "access_roles": None,
            "available_languages": None,
            "personal_data_warnings": None,
            "metadata": None,
        }
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._update_registry_record", return_value=updated):
            resp = client.post("/documents/db-doc-001/approve")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "approved"
        assert body["tags"] == []
        assert body["access_roles"] == []
        assert body["available_languages"] == ["en"]
        assert body["personal_data_warnings"] == []
        assert body["metadata"] == {}

    def test_approve_falls_through_to_404_when_doc_not_found(self, bypass_admin):
        """DB returns None; endpoint falls through to in-memory lookup -> 404."""
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._update_registry_record", return_value=None):
            resp = client.post("/documents/nonexistent-id-xyz/approve")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 3. PATCH /documents/{id}/governance -- must return 200 not 500
# ---------------------------------------------------------------------------

class TestGovernancePatchEndpoint:

    def test_governance_patch_returns_200_when_db_write_succeeds(self, bypass_admin):
        """Governance PATCH must return 200 (not 500) when the DB write succeeds."""
        updated = {**_DB_ROW, "approved_for_staff_visibility": True}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=dict(_DB_ROW)), \
             patch("app.main._update_registry_record", return_value=updated):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={
                    "approved_for_staff_visibility": True,
                    "governance_reviewed_by": "Reviewer",
                },
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["approved_for_staff_visibility"] is True

    def test_governance_patch_returns_200_when_db_row_has_null_array_columns(self, bypass_admin):
        """Governance PATCH with null array columns in DB row must not cause a 500."""
        base = {**_DB_ROW, "tags": None, "access_roles": None, "metadata": None}
        updated = {**base, "governance_status": "approved_for_staff"}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=base), \
             patch("app.main._update_registry_record", return_value=updated):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_status": "approved_for_staff"},
            )
        assert resp.status_code == 200

    def test_governance_patch_setting_reviewed_at_returns_200(self, bypass_admin):
        """Setting governance_reviewed_at in isolation must return 200."""
        updated = {**_DB_ROW, "governance_reviewed_at": "2025-01-19T12:00:00+00:00"}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=dict(_DB_ROW)), \
             patch("app.main._update_registry_record", return_value=updated):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_reviewed_at": "2025-01-19T12:00:00+00:00"},
            )
        assert resp.status_code == 200
        assert resp.json()["governance_reviewed_at"] == "2025-01-19T12:00:00+00:00"

    def test_governance_patch_returns_503_when_db_not_configured(self, bypass_admin):
        with patch("app.main._DB_CONFIGURED", False):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_status": "approved_for_staff"},
            )
        assert resp.status_code == 503

    def test_governance_patch_returns_404_when_doc_not_found(self, bypass_admin):
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=None):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_status": "approved_for_staff"},
            )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Safety gates unchanged -- regression guard
#
# The 400 guard fires when is_sensitive/escalation_required is ALREADY True in the
# DB and the caller tries to approve for embedding/answers in a separate request
# (not simultaneously setting the sensitive flag, which silently forces the approval
# flag off instead of raising).
# ---------------------------------------------------------------------------

class TestGovernanceSafetyGatesUnchanged:

    def test_pre_existing_sensitive_doc_blocks_approved_for_embedding(self, bypass_admin):
        """Doc already marked sensitive in DB must reject approved_for_embedding=True."""
        doc = {**_DB_ROW, "is_sensitive": True, "escalation_required": False}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=doc):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"approved_for_embedding": True},
            )
        assert resp.status_code == 400

    def test_pre_existing_escalation_doc_blocks_approved_for_embedding(self, bypass_admin):
        """Doc already marked escalation_required must reject approved_for_embedding=True."""
        doc = {**_DB_ROW, "is_sensitive": False, "escalation_required": True}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=doc):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"approved_for_embedding": True},
            )
        assert resp.status_code == 400

    def test_pre_existing_sensitive_doc_blocks_source_grounded_answers(self, bypass_admin):
        """Doc already marked sensitive must reject approved_for_source_grounded_answers=True."""
        doc = {**_DB_ROW, "is_sensitive": True, "escalation_required": False}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=doc):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"approved_for_source_grounded_answers": True},
            )
        assert resp.status_code == 400

    def test_invalid_governance_status_rejected(self, bypass_admin):
        """Unrecognised governance_status values must be rejected with 400."""
        doc = {**_DB_ROW}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=doc):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_status": "fully_approved"},
            )
        assert resp.status_code == 400

    def test_whitespace_governance_reviewed_by_rejected(self, bypass_admin):
        """Whitespace-only governance_reviewed_by must be rejected with 400."""
        doc = {**_DB_ROW}
        with patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._get_registry_record", return_value=doc):
            resp = client.patch(
                "/documents/db-doc-001/governance",
                json={"governance_reviewed_by": "   "},
            )
        assert resp.status_code == 400
