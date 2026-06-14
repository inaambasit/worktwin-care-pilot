import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app, _STAFF_FALLBACK_ANSWER

client = TestClient(app)

_UNSAFE_ANSWER = "This model answer was not grounded in any approved source."
_QUESTION = {"question": "What is the holiday policy?"}

_FAKE_RAW_ROW = {"document_id": "doc-1", "chunk_index": 0}
_FAKE_ELIG = {"doc-1": {"document_id": "doc-1"}}
_FAKE_SOURCES = [{"document_title": "Leave Policy", "source_label": "[Source 1]"}]


def _rpc_mock():
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = [_FAKE_RAW_ROW]
    return m


_PIPELINE_PATCHES = [
    patch.dict(os.environ, {"PILOT_AUTH_MODE": "false"}),
    patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")),
    patch("app.main._check_ask_rate_limit"),
    patch("app.main._OPENAI_CONFIGURED", True),
    patch("app.main._DB_CONFIGURED", True),
    patch("app.main._embed_query_text", return_value=[0.1]),
    patch("app.main._format_vector_for_pgvector", return_value="[0.1]"),
    patch("httpx.post", return_value=_rpc_mock()),
    patch("app.main._fetch_staff_ask_document_eligibility_batch", return_value=_FAKE_ELIG),
    patch("app.main._can_use_document_for_staff_ask", return_value=(True, None)),
    patch("app.main._normalise_search_result", return_value=_FAKE_RAW_ROW),
    patch("app.main._build_source_context", return_value=("context text", _FAKE_SOURCES)),
    patch("app.main._format_source_citations", return_value="[Source 1] Leave Policy"),
    patch("app.main._create_audit_event"),
]


def _run_ask(validate_return: str):
    with ExitStack() as stack:
        for p in _PIPELINE_PATCHES:
            stack.enter_context(p)
        stack.enter_context(
            patch("app.main._generate_source_grounded_answer", return_value={"answer": _UNSAFE_ANSWER})
        )
        stack.enter_context(
            patch("app.main._validate_grounded_answer_result", return_value=validate_return)
        )
        return client.post("/ask", json=_QUESTION)


# ---------------------------------------------------------------------------
# Fail-closed: ungrounded answer must not reach staff
# ---------------------------------------------------------------------------

def test_insufficient_sources_returns_fallback_answer():
    resp = _run_ask("insufficient_sources")
    assert resp.status_code == 200
    assert resp.json()["answer"] == _STAFF_FALLBACK_ANSWER


def test_insufficient_sources_sets_allowed_to_answer_false():
    resp = _run_ask("insufficient_sources")
    assert resp.json()["allowed_to_answer"] is False


def test_insufficient_sources_sets_requires_escalation_true():
    resp = _run_ask("insufficient_sources")
    assert resp.json()["requires_escalation"] is True


def test_insufficient_sources_returns_empty_sources():
    resp = _run_ask("insufficient_sources")
    assert resp.json()["sources"] == []


def test_unsafe_model_answer_not_in_response_body():
    resp = _run_ask("insufficient_sources")
    assert _UNSAFE_ANSWER not in resp.text


# ---------------------------------------------------------------------------
# Happy path: grounded answer preserves existing behaviour
# ---------------------------------------------------------------------------

def test_source_grounded_returns_model_answer():
    resp = _run_ask("source_grounded")
    assert resp.status_code == 200
    assert resp.json()["answer"] == _UNSAFE_ANSWER


def test_source_grounded_sets_allowed_to_answer_true():
    resp = _run_ask("source_grounded")
    assert resp.json()["allowed_to_answer"] is True


def test_source_grounded_sets_requires_escalation_false():
    resp = _run_ask("source_grounded")
    assert resp.json()["requires_escalation"] is False


def test_source_grounded_returns_sources():
    resp = _run_ask("source_grounded")
    sources = resp.json()["sources"]
    assert len(sources) == 1
    assert sources[0]["document_name"] == "Leave Policy"
