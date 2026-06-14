"""
Answer sanitiser tests — markdown stripping for staff-facing answers.

Proves:
  1. **When to Clean Hands** → When to Clean Hands (bold stripped)
  2. - Wash hands → Wash hands (bullet dash stripped)
  3. [Source 1] is preserved exactly
  4. Ungrounded answers still fail closed after sanitisation
  5. Medication/safeguarding escalation path is unchanged
"""

import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import (
    app,
    _sanitise_answer_text,
    _STAFF_FALLBACK_ANSWER,
    _can_use_document_for_staff_ask,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared test fixtures (mirrors test_staff_ask_hygiene_routing.py)
# ---------------------------------------------------------------------------

_HYGIENE_DOC_ID = "hygiene-doc-san-1"
_HYGIENE_CHUNK = {
    "document_id": _HYGIENE_DOC_ID,
    "chunk_index": 0,
    "chunk_text": "All staff must wash hands with soap for at least 20 seconds.",
    "document_title": "Hygiene Policy",
    "category": "Health and Safety",
    "access_roles": ["All Staff"],
}
_SOURCES = [{"document_title": "Hygiene Policy", "source_label": "[Source 1]"}]


def _fully_approved_elig(doc_id):
    return {
        doc_id: {
            "id": doc_id,
            "is_sensitive": False,
            "escalation_required": False,
            "contains_qcs_or_third_party_content": False,
            "real_document": True,
            "dummy_document": False,
            "status": "approved",
            "approved_for_embedding": True,
            "approved_for_source_grounded_answers": True,
            "approved_for_staff_visibility": True,
            "governance_reviewed_by": "pilot-reviewer",
            "governance_reviewed_at": "2026-05-01T10:00:00Z",
            "embedding_status": "indexed",
            "access_roles": ["All Staff"],
        }
    }


def _rpc_ok(chunk):
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = [chunk]
    return m


def _base_infra_patches():
    return [
        patch.dict(os.environ, {"PILOT_AUTH_MODE": "false"}),
        patch(
            "app.main._get_pilot_staff_context",
            return_value=("demo-org", "demo-user", "Care Worker"),
        ),
        patch("app.main._check_ask_rate_limit"),
        patch("app.main._OPENAI_CONFIGURED", True),
        patch("app.main._DB_CONFIGURED", True),
        patch("app.main._embed_query_text", return_value=[0.1]),
        patch("app.main._format_vector_for_pgvector", return_value="[0.1]"),
        patch("app.main._create_audit_event"),
    ]


def _run_ask_with_raw_answer(question, raw_answer, grounded=True):
    """Run /ask with a specific raw LLM answer; sanitiser runs on it before response."""
    validate_return = "source_grounded" if grounded else "insufficient_sources"
    with ExitStack() as stack:
        for p in _base_infra_patches():
            stack.enter_context(p)
        stack.enter_context(patch("httpx.post", return_value=_rpc_ok(_HYGIENE_CHUNK)))
        stack.enter_context(
            patch(
                "app.main._fetch_staff_ask_document_eligibility_batch",
                return_value=_fully_approved_elig(_HYGIENE_DOC_ID),
            )
        )
        stack.enter_context(
            patch("app.main._normalise_search_result", return_value=_HYGIENE_CHUNK)
        )
        stack.enter_context(
            patch(
                "app.main._build_source_context",
                return_value=("context text", _SOURCES),
            )
        )
        stack.enter_context(
            patch(
                "app.main._format_source_citations",
                return_value="[Source 1] Hygiene Policy",
            )
        )
        stack.enter_context(
            patch(
                "app.main._generate_source_grounded_answer",
                return_value={"answer": raw_answer},
            )
        )
        stack.enter_context(
            patch(
                "app.main._validate_grounded_answer_result",
                return_value=validate_return,
            )
        )
        return client.post("/ask", json={"question": question})


# ---------------------------------------------------------------------------
# 1. Unit tests for _sanitise_answer_text
# ---------------------------------------------------------------------------

class TestSanitiseAnswerTextUnit:

    def test_bold_markers_stripped(self):
        assert _sanitise_answer_text("**When to Clean Hands**") == "When to Clean Hands"

    def test_bold_markers_mid_sentence(self):
        result = _sanitise_answer_text("See **When to Clean Hands** [Source 1].")
        assert result == "See When to Clean Hands [Source 1]."

    def test_bullet_dash_stripped(self):
        assert _sanitise_answer_text("- Wash hands") == "Wash hands"

    def test_bullet_dash_stripped_multiline(self):
        text = "Steps:\n- Wash hands\n- Dry thoroughly"
        result = _sanitise_answer_text(text)
        assert result == "Steps:\nWash hands\nDry thoroughly"

    def test_heading_h1_stripped(self):
        assert _sanitise_answer_text("# Hand Hygiene") == "Hand Hygiene"

    def test_heading_h2_stripped(self):
        assert _sanitise_answer_text("## Sub Heading") == "Sub Heading"

    def test_source_label_preserved(self):
        text = "Wash hands thoroughly [Source 1]."
        assert "[Source 1]" in _sanitise_answer_text(text)

    def test_source_label_preserved_alongside_bold(self):
        text = "**When to Clean Hands** [Source 1]."
        result = _sanitise_answer_text(text)
        assert "[Source 1]" in result
        assert "**" not in result

    def test_source_label_not_mutated(self):
        text = "Staff must wash hands [Source 1] before and after [Source 2] each task."
        result = _sanitise_answer_text(text)
        assert "[Source 1]" in result
        assert "[Source 2]" in result

    def test_numbered_steps_preserved(self):
        text = "1. Wash hands.\n2. Dry thoroughly.\n3. Use sanitiser."
        assert _sanitise_answer_text(text) == text

    def test_empty_string_safe(self):
        assert _sanitise_answer_text("") == ""

    def test_plain_text_unchanged(self):
        text = "Staff must wash hands before handling food [Source 1]."
        assert _sanitise_answer_text(text) == text

    def test_multiple_bold_spans(self):
        text = "**Step one** and **step two** are required [Source 1]."
        result = _sanitise_answer_text(text)
        assert result == "Step one and step two are required [Source 1]."

    def test_heading_with_source(self):
        text = "# Handwashing [Source 1]"
        result = _sanitise_answer_text(text)
        assert result == "Handwashing [Source 1]"
        assert "#" not in result


# ---------------------------------------------------------------------------
# 2. Integration: sanitiser applies in /ask endpoint response
# ---------------------------------------------------------------------------

class TestSanitiserInAskEndpoint:

    def test_bold_stripped_in_endpoint_response(self):
        resp = _run_ask_with_raw_answer(
            "When should I clean my hands?",
            "**When to Clean Hands** — before patient contact [Source 1].",
        )
        assert resp.status_code == 200
        answer = resp.json()["answer"]
        assert "**" not in answer
        assert "When to Clean Hands" in answer

    def test_bullet_dash_stripped_in_endpoint_response(self):
        resp = _run_ask_with_raw_answer(
            "How do I wash my hands?",
            "- Wash hands with soap for 20 seconds [Source 1].",
        )
        assert resp.status_code == 200
        answer = resp.json()["answer"]
        assert not answer.startswith("- ")
        assert "Wash hands" in answer

    def test_source_label_preserved_in_endpoint_response(self):
        resp = _run_ask_with_raw_answer(
            "When should I clean my hands?",
            "**When to Clean Hands** — before patient contact [Source 1].",
        )
        assert resp.status_code == 200
        assert "[Source 1]" in resp.json()["answer"]


# ---------------------------------------------------------------------------
# 3. Ungrounded answer still fails closed after sanitiser runs
# ---------------------------------------------------------------------------

class TestUngroundedStillFailsClosedAfterSanitiser:

    def test_ungrounded_returns_fallback(self):
        resp = _run_ask_with_raw_answer(
            "When should I clean my hands?",
            "**When to Clean Hands** — see policy.",
            grounded=False,
        )
        assert resp.json()["answer"] == _STAFF_FALLBACK_ANSWER

    def test_ungrounded_not_allowed_to_answer(self):
        resp = _run_ask_with_raw_answer(
            "When should I clean my hands?",
            "**When to Clean Hands** — see policy.",
            grounded=False,
        )
        assert resp.json()["allowed_to_answer"] is False


# ---------------------------------------------------------------------------
# 4. Medication/safeguarding escalation path unchanged
#    (no RAG, no sanitiser needed — escalation fires before answer generation)
# ---------------------------------------------------------------------------

class TestEscalationPathUnchangedBySanitiser:

    def test_medication_query_escalates(self):
        with ExitStack() as stack:
            for p in _base_infra_patches():
                stack.enter_context(p)
            resp = client.post(
                "/ask", json={"question": "How do I administer medication to a resident?"}
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["requires_escalation"] is True
        assert data["allowed_to_answer"] is False

    def test_safeguarding_query_escalates(self):
        with ExitStack() as stack:
            for p in _base_infra_patches():
                stack.enter_context(p)
            resp = client.post(
                "/ask", json={"question": "I think a resident is being abused, what do I do?"}
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["requires_escalation"] is True
        assert data["allowed_to_answer"] is False
