"""
4S.90N-F1A -- Upload exception sanitisation tests.

Verifies that raw exception text (which may contain secrets, bucket paths, or
internal stack details) does not appear in any upload-related HTTP response field.

Unit tests cover the helper functions directly.
Integration tests cover the upload endpoint via mocked failure points.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import app.main as _m
from app.main import (
    app,
    _require_admin,
    _safe_extraction_warning,
    _safe_upload_error_message,
)

client = TestClient(app)

# Strings that must never appear in any HTTP response body.
_SENSITIVE = [
    "SECRET_INTERNAL_BUCKET_PATH",
    "sk-test-should-not-appear",
    "database password leaked",
]

# A minimal but structurally valid PDF (passes magic-bytes and extension checks).
_MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    b"xref\n0 1\n0000000000 65535 f \n"
    b"trailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF"
)

_UPLOAD_FORM = {
    "title": "Safe Test Document",
    "category": "Training",
    "vertical": "care",
    "access_roles": "All Staff",
    "status": "draft",
    "is_sensitive": "false",
    "escalation_required": "false",
    "approved_for_ai_answers": "false",
    "primary_language": "en",
    "available_languages": "en",
    "version": "1.0",
}


@pytest.fixture()
def bypass_admin_auth():
    """Override _require_admin so tests reach upload logic without a real token."""
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Unit: _safe_upload_error_message
# ---------------------------------------------------------------------------

def test_safe_upload_error_message_storage_is_safe():
    msg = _safe_upload_error_message("storage")
    assert msg == "Document storage upload failed."
    for s in _SENSITIVE:
        assert s not in msg


def test_safe_upload_error_message_registry_is_safe():
    msg = _safe_upload_error_message("registry")
    assert msg == "Registry save failed."
    for s in _SENSITIVE:
        assert s not in msg


def test_safe_upload_error_message_extraction_storage_is_safe():
    msg = _safe_upload_error_message("extraction_storage")
    assert msg == "Extraction storage failed."
    for s in _SENSITIVE:
        assert s not in msg


def test_safe_upload_error_message_chunking_is_safe():
    msg = _safe_upload_error_message("chunking")
    assert msg == "Chunking failed."
    for s in _SENSITIVE:
        assert s not in msg


def test_safe_upload_error_message_unknown_kind_is_generic():
    msg = _safe_upload_error_message("some_unknown_pipeline_step")
    assert isinstance(msg, str)
    assert len(msg) > 0
    for s in _SENSITIVE:
        assert s not in msg


# ---------------------------------------------------------------------------
# Unit: _safe_extraction_warning
# ---------------------------------------------------------------------------

def test_safe_extraction_warning_is_safe():
    warning = _safe_extraction_warning()
    assert warning == "Text extraction failed."
    for s in _SENSITIVE:
        assert s not in warning


# ---------------------------------------------------------------------------
# Integration: extraction_warnings field does not leak exception text
#
# _STORAGE_METHOD is patched to "none" so the endpoint returns the 503
# not-configured JSONResponse which includes extraction_warnings.  This path
# reaches the text-extraction block before the storage check, making it the
# cheapest way to assert the warning is sanitised end-to-end.
# ---------------------------------------------------------------------------

def test_extraction_warnings_do_not_contain_raw_exception_text(bypass_admin_auth):
    sensitive_exc_text = "SECRET_INTERNAL_BUCKET_PATH/org/docs/secret-file"
    mock_reader = MagicMock(side_effect=Exception(sensitive_exc_text))

    with patch.object(_m, "_STORAGE_METHOD", "none"), \
         patch.object(_m, "_PYPDF_OK", True), \
         patch.object(_m, "_PdfReader", mock_reader):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    # 503 not-configured is expected; the response must include extraction_warnings.
    assert resp.status_code == 503
    body = resp.json()
    warnings = body.get("extraction_warnings", [])
    assert isinstance(warnings, list)

    combined = " ".join(warnings)
    assert sensitive_exc_text not in combined
    for s in _SENSITIVE:
        assert s not in combined


def test_extraction_warnings_contain_safe_message_on_failure(bypass_admin_auth):
    mock_reader = MagicMock(side_effect=Exception("sk-test-should-not-appear"))

    with patch.object(_m, "_STORAGE_METHOD", "none"), \
         patch.object(_m, "_PYPDF_OK", True), \
         patch.object(_m, "_PdfReader", mock_reader):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    assert resp.status_code == 503
    body = resp.json()
    warnings = body.get("extraction_warnings", [])
    # The safe message must be present; the raw exc must not be.
    assert any("Text extraction failed." in w for w in warnings)


# ---------------------------------------------------------------------------
# Integration: storage 500 detail does not leak exception text
#
# Patches _STORAGE_METHOD to "supabase_client" and mocks the supabase storage
# client to raise with sensitive text.  Asserts the 500 detail is the generic
# safe message.
# ---------------------------------------------------------------------------

def test_storage_500_detail_does_not_leak_exception_text(bypass_admin_auth):
    sensitive_exc_text = "database password leaked"

    mock_supabase = MagicMock()
    # The upload endpoint calls _supabase.storage.from_(...).upload(...)
    mock_supabase.storage.from_.return_value.upload.side_effect = Exception(sensitive_exc_text)

    with patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_supabase", mock_supabase), \
         patch.object(_m, "_PYPDF_OK", False):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    assert resp.status_code == 500
    body = resp.json()
    detail = body.get("detail", "")
    assert sensitive_exc_text not in detail
    assert detail == "Document storage upload failed."


# ---------------------------------------------------------------------------
# Integration: registry_error field does not leak exception text
#
# To reach the registry-persist step the storage upload must succeed, so both
# the storage client mock and _DB_CONFIGURED must be set appropriately.
# _create_registry_record is patched to raise RuntimeError with sensitive text.
# ---------------------------------------------------------------------------

def test_registry_error_does_not_leak_exception_text(bypass_admin_auth):
    sensitive_exc_text = "SECRET_INTERNAL_BUCKET_PATH registry_row"

    mock_storage = MagicMock()
    mock_storage.from_.return_value.upload.return_value = None

    with patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_supabase", mock_storage), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record",
                      side_effect=RuntimeError(sensitive_exc_text)):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    assert resp.status_code == 200
    body = resp.json()
    registry_error = body.get("registry_error", "")
    assert sensitive_exc_text not in registry_error
    assert registry_error == "Registry save failed."


# ---------------------------------------------------------------------------
# Integration: extraction_storage_error field does not leak exception text
# ---------------------------------------------------------------------------

def test_extraction_storage_error_does_not_leak_exception_text(bypass_admin_auth):
    sensitive_exc_text = "sk-test-should-not-appear in extraction storage"

    mock_storage = MagicMock()
    mock_storage.from_.return_value.upload.return_value = None
    mock_registry_record = {"id": "test-doc-id", "organisation_id": "demo-org",
                            "metadata": {}}

    with patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_supabase", mock_storage), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record",
                      return_value=mock_registry_record), \
         patch.object(_m, "_create_audit_event", return_value=None), \
         patch.object(_m, "_create_extraction_record",
                      side_effect=Exception(sensitive_exc_text)):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    assert resp.status_code == 200
    body = resp.json()
    extraction_storage_error = body.get("extraction_storage_error", "")
    assert sensitive_exc_text not in extraction_storage_error
    assert extraction_storage_error == "Extraction storage failed."


# ---------------------------------------------------------------------------
# Integration: chunking_error field does not leak exception text
# ---------------------------------------------------------------------------

def test_chunking_error_does_not_leak_exception_text(bypass_admin_auth):
    sensitive_exc_text = "database password leaked in chunking"

    mock_storage = MagicMock()
    mock_storage.from_.return_value.upload.return_value = None
    mock_registry_record = {"id": "test-doc-id", "organisation_id": "demo-org",
                            "metadata": {}}

    # Provide extracted text so the chunking branch is entered.
    mock_reader_instance = MagicMock()
    mock_reader_instance.pages = [MagicMock()]
    mock_reader_instance.pages[0].extract_text.return_value = "some policy text"
    mock_reader_cls = MagicMock(return_value=mock_reader_instance)

    with patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_supabase", mock_storage), \
         patch.object(_m, "_PYPDF_OK", True), \
         patch.object(_m, "_PdfReader", mock_reader_cls), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record",
                      return_value=mock_registry_record), \
         patch.object(_m, "_create_audit_event", return_value=None), \
         patch.object(_m, "_create_extraction_record", return_value=None), \
         patch.object(_m, "_create_document_chunks",
                      side_effect=Exception(sensitive_exc_text)):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
        )

    assert resp.status_code == 200
    body = resp.json()
    chunking_error = body.get("chunking_error", "")
    assert sensitive_exc_text not in chunking_error
    assert chunking_error == "Chunking failed."
