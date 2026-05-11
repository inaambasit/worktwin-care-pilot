"""
Admin vector-search and answer-debug tenant scoping tests.

Verifies that x-worktwin-admin-org (set by the Next.js admin proxy from the
validated session) overrides payload.organisation_id / the "demo-org" default
for both POST /documents/search-vector and POST /documents/answer-debug, and
that the response always reflects the effective organisation.

The direct/internal fallback path (no header present) uses payload.organisation_id
for backwards compatibility with admin scripts and debug tooling.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, _require_admin

client = TestClient(app)

_DEMO_ORG = "demo-org"
_TC_ORG = "thumhara-centre"


@pytest.fixture()
def bypass_admin_auth():
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /documents/search-vector — tenant scoping
# ---------------------------------------------------------------------------

class TestSearchVectorOrgScope:

    def test_header_overrides_payload_org_and_default_demo_org(self, bypass_admin_auth):
        """x-worktwin-admin-org must be passed to _vector_search_chunks, not demo-org."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", return_value=[]) as mock_search:
            resp = client.post(
                "/documents/search-vector",
                json={"query": "safeguarding", "organisation_id": _DEMO_ORG},
                headers={"x-worktwin-admin-org": _TC_ORG},
            )
        assert resp.status_code == 200
        mock_search.assert_called_once()
        call_kwargs = mock_search.call_args.kwargs
        assert call_kwargs["organisation_id"] == _TC_ORG

    def test_response_organisation_id_is_effective_header_org(self, bypass_admin_auth):
        """organisation_id in the response must reflect the header org, not payload default."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", return_value=[]):
            resp = client.post(
                "/documents/search-vector",
                json={"query": "medication", "organisation_id": _DEMO_ORG},
                headers={"x-worktwin-admin-org": _TC_ORG},
            )
        assert resp.status_code == 200
        assert resp.json()["organisation_id"] == _TC_ORG

    def test_body_org_cannot_force_demo_org_when_header_is_thumhara(self, bypass_admin_auth):
        """Supplying organisation_id=demo-org in the body must NOT override the header."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", return_value=[]) as mock_search:
            resp = client.post(
                "/documents/search-vector",
                json={"query": "risk assessment", "organisation_id": _DEMO_ORG},
                headers={"x-worktwin-admin-org": _TC_ORG},
            )
        assert resp.status_code == 200
        call_kwargs = mock_search.call_args.kwargs
        assert call_kwargs["organisation_id"] != _DEMO_ORG
        assert call_kwargs["organisation_id"] == _TC_ORG

    def test_without_header_uses_payload_organisation_id(self, bypass_admin_auth):
        """Without x-worktwin-admin-org header, payload.organisation_id is used (direct/internal compat)."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", return_value=[]) as mock_search:
            resp = client.post(
                "/documents/search-vector",
                json={"query": "care plan", "organisation_id": _TC_ORG},
            )
        assert resp.status_code == 200
        call_kwargs = mock_search.call_args.kwargs
        assert call_kwargs["organisation_id"] == _TC_ORG

    def test_without_header_demo_org_default_still_works(self, bypass_admin_auth):
        """Without header, payload defaults to demo-org for backwards compatibility."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", return_value=[]) as mock_search:
            resp = client.post(
                "/documents/search-vector",
                json={"query": "policy"},
            )
        assert resp.status_code == 200
        call_kwargs = mock_search.call_args.kwargs
        assert call_kwargs["organisation_id"] == _DEMO_ORG
        assert resp.json()["organisation_id"] == _DEMO_ORG

    def test_error_response_organisation_id_is_effective_org(self, bypass_admin_auth):
        """Even on embedding error, the response organisation_id must reflect the header org."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._vector_search_chunks", side_effect=RuntimeError("embed fail")):
            resp = client.post(
                "/documents/search-vector",
                json={"query": "incident", "organisation_id": _DEMO_ORG},
                headers={"x-worktwin-admin-org": _TC_ORG},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["organisation_id"] == _TC_ORG


# ---------------------------------------------------------------------------
# POST /documents/answer-debug — tenant scoping
#
# httpx is imported locally inside answer_debug (import httpx as _httpx), so
# it is not a module-level attribute of app.main.  We patch httpx.post directly.
# ---------------------------------------------------------------------------

def _make_rpc_mock(rows: list) -> MagicMock:
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = rows
    return mock_resp


class TestAnswerDebugOrgScope:

    def _post(self, body: dict, headers: dict = None):
        return client.post("/documents/answer-debug", json=body, headers=headers or {})

    def test_header_overrides_payload_org_in_rpc_call(self, bypass_admin_auth):
        """x-worktwin-admin-org must reach the RPC payload as match_organisation_id."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("httpx.post", return_value=_make_rpc_mock([])) as mock_post:

            resp = self._post(
                {"query": "medication", "organisation_id": _DEMO_ORG},
                {"x-worktwin-admin-org": _TC_ORG},
            )

        assert resp.status_code == 200
        call_args = mock_post.call_args
        rpc_payload = call_args.kwargs.get("json") or call_args.args[1]
        assert rpc_payload["match_organisation_id"] == _TC_ORG

    def test_no_chunks_response_organisation_id_is_header_org(self, bypass_admin_auth):
        """When no chunks match, response organisation_id must be the header org."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("httpx.post", return_value=_make_rpc_mock([])):

            resp = self._post(
                {"query": "risk", "organisation_id": _DEMO_ORG},
                {"x-worktwin-admin-org": _TC_ORG},
            )

        assert resp.status_code == 200
        assert resp.json()["organisation_id"] == _TC_ORG

    def test_body_org_cannot_force_demo_org_when_header_is_thumhara(self, bypass_admin_auth):
        """organisation_id=demo-org in the body must not override x-worktwin-admin-org."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("httpx.post", return_value=_make_rpc_mock([])):

            resp = self._post(
                {"query": "safeguarding", "organisation_id": _DEMO_ORG},
                {"x-worktwin-admin-org": _TC_ORG},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["organisation_id"] != _DEMO_ORG
        assert body["organisation_id"] == _TC_ORG

    def test_without_header_uses_payload_organisation_id(self, bypass_admin_auth):
        """Without the header, payload.organisation_id reaches the RPC (direct/internal compat)."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("httpx.post", return_value=_make_rpc_mock([])) as mock_post:

            resp = self._post({"query": "care plan", "organisation_id": _TC_ORG})

        assert resp.status_code == 200
        call_args = mock_post.call_args
        rpc_payload = call_args.kwargs.get("json") or call_args.args[1]
        assert rpc_payload["match_organisation_id"] == _TC_ORG

    def test_without_header_demo_org_default_still_works(self, bypass_admin_auth):
        """Without header, body default demo-org reaches the RPC for backwards compatibility."""
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("httpx.post", return_value=_make_rpc_mock([])) as mock_post:

            resp = self._post({"query": "policy"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["organisation_id"] == _DEMO_ORG
        call_args = mock_post.call_args
        rpc_payload = call_args.kwargs.get("json") or call_args.args[1]
        assert rpc_payload["match_organisation_id"] == _DEMO_ORG

    def test_audit_event_uses_effective_org_not_payload(self, bypass_admin_auth):
        """Audit event for answer_debug_tested must record the effective (header) org."""
        raw_row = {
            "document_id": "doc-99",
            "chunk_id": "chunk-1",
            "title": "Test Doc",
            "category": "care",
            "chunk_text": "Some policy text.",
            "similarity": 0.9,
            "approved_for_ai_answers": True,
            "escalation_required": False,
            "is_sensitive": False,
        }
        with patch("app.main._OPENAI_CONFIGURED", True), \
             patch("app.main._DB_CONFIGURED", True), \
             patch("app.main._embed_query_text", return_value=[0.1] * 1536), \
             patch("app.main._format_vector_for_pgvector", return_value="[0.1]"), \
             patch("app.main._get_document_governance_batch", return_value={}), \
             patch("app.main._build_source_context", return_value=("ctx", [])), \
             patch("app.main._format_source_citations", return_value=""), \
             patch("app.main._generate_source_grounded_answer",
                   return_value={"answer": "test answer"}), \
             patch("app.main._validate_grounded_answer_result", return_value="high"), \
             patch("app.main._create_audit_event") as mock_audit, \
             patch("httpx.post", return_value=_make_rpc_mock([raw_row])):

            resp = self._post(
                {"query": "medication policy", "organisation_id": _DEMO_ORG,
                 "allow_dummy_override": True},
                {"x-worktwin-admin-org": _TC_ORG},
            )

        assert resp.status_code == 200
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["organisation_id"] == _TC_ORG
