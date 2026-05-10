"""
4S.96B -- Admin document tenant isolation tests.

Verifies that GET /documents and GET /documents/{id} enforce organisation scope
when the internal x-worktwin-admin-org header is present (set by the Next.js proxy
from the validated session).

Without the header (legacy direct ADMIN_TOKEN use) the existing optional
organisation_id query-param behaviour is preserved.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, _require_admin

client = TestClient(app)

# In-memory demo docs all have organisation_id "demo-org" (see _documents in main.py).
_DEMO_ORG = "demo-org"
_OTHER_ORG = "thumhara-centre"
_KNOWN_DEMO_DOC_ID = "doc-001"


@pytest.fixture()
def bypass_admin_auth():
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /documents — in-memory fallback path (no real Supabase in unit tests)
# ---------------------------------------------------------------------------

def test_list_documents_with_admin_org_header_matching_demo_returns_records(bypass_admin_auth):
    resp = client.get(
        "/documents",
        headers={"x-worktwin-admin-org": _DEMO_ORG},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["documents"]) > 0
    for doc in body["documents"]:
        assert doc["organisation_id"] == _DEMO_ORG


def test_list_documents_with_admin_org_header_unknown_org_returns_empty(bypass_admin_auth):
    # thumhara-centre has no in-memory docs; header must scope the query.
    resp = client.get(
        "/documents",
        headers={"x-worktwin-admin-org": _OTHER_ORG},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == []


def test_list_documents_without_admin_org_header_returns_all_in_memory(bypass_admin_auth):
    # Legacy path: no header means no forced scoping; all in-memory docs returned.
    resp = client.get("/documents")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["documents"]) > 0


def test_list_documents_admin_org_header_overrides_query_param(bypass_admin_auth):
    # If a caller also supplies ?organisation_id=demo-org but the header says thumhara-centre,
    # the header wins and the result is scoped to thumhara-centre (empty for in-memory).
    resp = client.get(
        "/documents",
        params={"organisation_id": _DEMO_ORG},
        headers={"x-worktwin-admin-org": _OTHER_ORG},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == []


# ---------------------------------------------------------------------------
# GET /documents — DB path (mock _list_registry_records)
# ---------------------------------------------------------------------------

def test_list_documents_db_path_admin_org_header_is_passed_as_organisation_id(bypass_admin_auth):
    _fake_record = {
        "id": "db-1",
        "organisation_id": _OTHER_ORG,
        "title": "Thumhara Doc",
        "category": "care",
        "vertical": "care",
        "status": "draft",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }
    with patch("app.main._DB_CONFIGURED", True), \
         patch("app.main._list_registry_records", return_value=[_fake_record]) as mock_list:
        resp = client.get(
            "/documents",
            headers={"x-worktwin-admin-org": _OTHER_ORG},
        )
    assert resp.status_code == 200
    # The header value must have been forwarded to _list_registry_records as organisation_id.
    mock_list.assert_called_once_with(
        organisation_id=_OTHER_ORG,
        status=None,
        category=None,
        vertical=None,
    )


# ---------------------------------------------------------------------------
# GET /documents/{id} — in-memory fallback path
# ---------------------------------------------------------------------------

def test_get_document_matching_org_returns_document(bypass_admin_auth):
    resp = client.get(
        f"/documents/{_KNOWN_DEMO_DOC_ID}",
        headers={"x-worktwin-admin-org": _DEMO_ORG},
    )
    assert resp.status_code == 200
    assert resp.json()["organisation_id"] == _DEMO_ORG


def test_get_document_cross_org_returns_404(bypass_admin_auth):
    # doc-001 belongs to demo-org; a thumhara-centre session must not receive it.
    resp = client.get(
        f"/documents/{_KNOWN_DEMO_DOC_ID}",
        headers={"x-worktwin-admin-org": _OTHER_ORG},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Document not found"


def test_get_document_without_admin_org_header_returns_document(bypass_admin_auth):
    # Legacy path: no header means no org enforcement; doc is returned.
    resp = client.get(f"/documents/{_KNOWN_DEMO_DOC_ID}")
    assert resp.status_code == 200


def test_get_document_unknown_id_returns_404_regardless_of_org_header(bypass_admin_auth):
    resp = client.get(
        "/documents/does-not-exist",
        headers={"x-worktwin-admin-org": _DEMO_ORG},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /documents/{id} — DB path (mock _get_registry_record)
# ---------------------------------------------------------------------------

def test_get_document_db_path_cross_org_returns_404(bypass_admin_auth):
    _demo_record = {
        "id": _KNOWN_DEMO_DOC_ID,
        "organisation_id": _DEMO_ORG,
        "title": "Staff Handbook",
        "category": "care",
        "status": "draft",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }
    with patch("app.main._DB_CONFIGURED", True), \
         patch("app.main._get_registry_record", return_value=_demo_record):
        resp = client.get(
            f"/documents/{_KNOWN_DEMO_DOC_ID}",
            headers={"x-worktwin-admin-org": _OTHER_ORG},
        )
    assert resp.status_code == 404


def test_get_document_db_path_matching_org_returns_document(bypass_admin_auth):
    _tc_record = {
        "id": "tc-001",
        "organisation_id": _OTHER_ORG,
        "title": "Thumhara Handbook",
        "category": "care",
        "status": "draft",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }
    with patch("app.main._DB_CONFIGURED", True), \
         patch("app.main._get_registry_record", return_value=_tc_record):
        resp = client.get(
            "/documents/tc-001",
            headers={"x-worktwin-admin-org": _OTHER_ORG},
        )
    assert resp.status_code == 200
    assert resp.json()["organisation_id"] == _OTHER_ORG
