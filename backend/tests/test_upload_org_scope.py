"""
4S.96D-1 — Upload endpoint tenant-scoping tests.

Verifies that organisation_id on a newly uploaded document is taken from
x-worktwin-admin-org (forwarded by the Next.js admin proxy from the validated
session) and never silently falls to demo-org when a session org is present.
"""
from unittest.mock import MagicMock, call, patch

import pytest
from fastapi.testclient import TestClient

import app.main as _m
from app.main import app, _require_admin

client = TestClient(app)

_MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    b"xref\n0 1\n0000000000 65535 f \n"
    b"trailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF"
)

_UPLOAD_FORM = {
    "title": "Thumhara Induction Policy",
    "category": "Induction",
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
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


def _mock_supabase_storage():
    """Return a mock supabase client whose storage.upload() succeeds silently."""
    mock_sb = MagicMock()
    mock_sb.storage.from_().upload.return_value = None
    return mock_sb


# ---------------------------------------------------------------------------
# Test 1 — x-worktwin-admin-org: thumhara-centre → registry organisation_id
# ---------------------------------------------------------------------------

def test_upload_org_from_header_thumhara(bypass_admin_auth):
    captured: list = []

    def fake_create_registry_record(record):
        captured.append(record)
        return record

    with patch.object(_m, "_supabase", _mock_supabase_storage()), \
         patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record", side_effect=fake_create_registry_record), \
         patch.object(_m, "_create_audit_event", return_value=None), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_ALLOWED_ORGANISATION_IDS", frozenset({"demo-org", "thumhara-centre"})):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
            headers={"x-worktwin-admin-org": "thumhara-centre"},
        )

    assert resp.status_code == 200, resp.text
    assert len(captured) == 1
    assert captured[0]["organisation_id"] == "thumhara-centre"


# ---------------------------------------------------------------------------
# Test 2 — No header → falls back to PILOT_ORGANISATION_ID / "demo-org"
# ---------------------------------------------------------------------------

def test_upload_org_falls_back_to_env_default(bypass_admin_auth):
    captured: list = []

    def fake_create_registry_record(record):
        captured.append(record)
        return record

    with patch.object(_m, "_supabase", _mock_supabase_storage()), \
         patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record", side_effect=fake_create_registry_record), \
         patch.object(_m, "_create_audit_event", return_value=None), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_ALLOWED_ORGANISATION_IDS", frozenset({"demo-org", "thumhara-centre"})), \
         patch.dict("os.environ", {"PILOT_ORGANISATION_ID": "demo-org"}):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
            # no x-worktwin-admin-org header
        )

    assert resp.status_code == 200, resp.text
    assert len(captured) == 1
    assert captured[0]["organisation_id"] == "demo-org"


# ---------------------------------------------------------------------------
# Test 3 — Unknown org in header → 403 (not in allowlist)
# ---------------------------------------------------------------------------

def test_upload_rejected_when_org_not_in_allowlist(bypass_admin_auth):
    with patch.object(_m, "_ALLOWED_ORGANISATION_IDS", frozenset({"demo-org", "thumhara-centre"})):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
            headers={"x-worktwin-admin-org": "evil-org"},
        )

    assert resp.status_code == 403
    assert "not allowed" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 4 — Thumhara upload does not land in demo-org
# ---------------------------------------------------------------------------

def test_upload_thumhara_does_not_land_in_demo_org(bypass_admin_auth):
    captured: list = []

    def fake_create_registry_record(record):
        captured.append(record)
        return record

    with patch.object(_m, "_supabase", _mock_supabase_storage()), \
         patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_DB_CONFIGURED", True), \
         patch.object(_m, "_create_registry_record", side_effect=fake_create_registry_record), \
         patch.object(_m, "_create_audit_event", return_value=None), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_ALLOWED_ORGANISATION_IDS", frozenset({"demo-org", "thumhara-centre"})):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
            headers={"x-worktwin-admin-org": "thumhara-centre"},
        )

    assert resp.status_code == 200, resp.text
    assert len(captured) == 1
    assert captured[0]["organisation_id"] != "demo-org"


# ---------------------------------------------------------------------------
# Test 5 — Supabase storage path starts with thumhara-centre/
# ---------------------------------------------------------------------------

def test_upload_storage_path_uses_session_org(bypass_admin_auth):
    mock_sb = MagicMock()
    mock_sb.storage.from_().upload.return_value = None
    upload_calls: list = []

    def capturing_upload(path, file, file_options=None):
        upload_calls.append(path)

    mock_sb.storage.from_().upload.side_effect = capturing_upload

    with patch.object(_m, "_supabase", mock_sb), \
         patch.object(_m, "_STORAGE_METHOD", "supabase_client"), \
         patch.object(_m, "_DB_CONFIGURED", False), \
         patch.object(_m, "_PYPDF_OK", False), \
         patch.object(_m, "_ALLOWED_ORGANISATION_IDS", frozenset({"demo-org", "thumhara-centre"})):
        resp = client.post(
            "/documents/upload",
            files={"file": ("policy.pdf", _MINIMAL_PDF, "application/pdf")},
            data=_UPLOAD_FORM,
            headers={"x-worktwin-admin-org": "thumhara-centre"},
        )

    assert resp.status_code == 200, resp.text
    assert len(upload_calls) == 1, "Expected exactly one storage upload call"
    assert upload_calls[0].startswith("thumhara-centre/"), (
        f"Storage path must start with 'thumhara-centre/' but got: {upload_calls[0]!r}"
    )
