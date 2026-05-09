"""
4S.90N-F1B — answer-debug response minimisation tests.

Verifies that /documents/answer-debug does not leak the real ANSWER_MODEL
env-var value and does not include estimated_cost_note in any response path.
"""
import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, _require_admin

client = TestClient(app)

_FAKE_MODEL = "SECRET_MODEL_SHOULD_NOT_LEAK"
_ORG = "demo-org"
_PAYLOAD = {"query": "What is the leave policy?", "organisation_id": _ORG}

_FAKE_SOURCES = [{"document_title": "Leave Policy", "source_label": "[Source 1]"}]
_FAKE_ANSWER = {"answer": "Take leave as per policy.", "model": _FAKE_MODEL, "estimated_cost_note": "Model: SECRET_MODEL_SHOULD_NOT_LEAK."}


def _rpc_ok():
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = [{"document_id": "doc-1", "chunk_index": 0}]
    return m


def _rpc_empty():
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = []
    return m


@pytest.fixture(autouse=True)
def bypass_admin():
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


_BASE_PATCHES = [
    patch.dict(os.environ, {"ANSWER_MODEL": _FAKE_MODEL}),
    patch("app.main._OPENAI_CONFIGURED", True),
    patch("app.main._DB_CONFIGURED", True),
    patch("app.main._classify_escalation_topic", return_value=None),
    patch("app.main._embed_query_text", return_value=[0.1]),
    patch("app.main._format_vector_for_pgvector", return_value="[0.1]"),
    patch("app.main._create_audit_event"),
]


def _call_answer_debug(rpc_return, answer_return=None, governance_patch=None):
    with ExitStack() as stack:
        for p in _BASE_PATCHES:
            stack.enter_context(p)
        stack.enter_context(patch("httpx.post", return_value=rpc_return))
        if governance_patch is not None:
            stack.enter_context(governance_patch)
        if answer_return is not None:
            stack.enter_context(
                patch("app.main._generate_source_grounded_answer", return_value=answer_return)
            )
            stack.enter_context(
                patch("app.main._normalise_search_result", return_value={"document_id": "doc-1"})
            )
            stack.enter_context(
                patch("app.main._build_source_context", return_value=("ctx", _FAKE_SOURCES))
            )
            stack.enter_context(
                patch("app.main._format_source_citations", return_value="[Source 1]")
            )
            stack.enter_context(
                patch("app.main._validate_grounded_answer_result", return_value="source_grounded")
            )
            stack.enter_context(
                patch("app.main._get_document_governance_batch", return_value={})
            )
        return client.post("/documents/answer-debug", json=_PAYLOAD)


# ---------------------------------------------------------------------------
# Case 1: no vector matches (insufficient_sources path)
# ---------------------------------------------------------------------------

class TestNoMatchPath:
    def _resp(self):
        return _call_answer_debug(_rpc_empty())

    def test_status_ok(self):
        assert self._resp().status_code == 200

    def test_model_field_is_not_real_model_name(self):
        body = self._resp().json()
        assert body.get("model") != _FAKE_MODEL

    def test_model_field_is_generic(self):
        body = self._resp().json()
        assert body.get("model") == "internal"

    def test_fake_model_not_in_response_body(self):
        assert _FAKE_MODEL not in self._resp().text

    def test_estimated_cost_note_absent(self):
        body = self._resp().json()
        assert "estimated_cost_note" not in body

    def test_core_fields_present(self):
        body = self._resp().json()
        for field in ("query", "organisation_id", "answer", "confidence", "result_count", "sources"):
            assert field in body


# ---------------------------------------------------------------------------
# Case 3: usable chunks — answer generated (source_grounded path)
# ---------------------------------------------------------------------------

class TestAnswerGeneratedPath:
    def _resp(self):
        return _call_answer_debug(
            _rpc_ok(),
            answer_return=_FAKE_ANSWER,
        )

    def test_status_ok(self):
        assert self._resp().status_code == 200

    def test_model_field_is_not_real_model_name(self):
        body = self._resp().json()
        assert body.get("model") != _FAKE_MODEL

    def test_model_field_is_generic(self):
        body = self._resp().json()
        assert body.get("model") == "internal"

    def test_fake_model_not_in_response_body(self):
        assert _FAKE_MODEL not in self._resp().text

    def test_estimated_cost_note_absent(self):
        body = self._resp().json()
        assert "estimated_cost_note" not in body

    def test_core_fields_present(self):
        body = self._resp().json()
        for field in ("query", "organisation_id", "answer", "confidence", "result_count", "sources"):
            assert field in body
