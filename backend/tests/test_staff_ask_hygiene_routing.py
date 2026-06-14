"""
Staff Ask hygiene-routing regression suite — Milestone 4S.5 debug.

Proves:
  a) Mobile-phone query returns a source-grounded answer (existing /ask path preserved).
  b) Hygiene hand-hygiene query returns a source-grounded answer when the document
     passes all eleven governance conditions (including governance_reviewed_by/at).
  c) Medication and safeguarding queries safely escalate — no RAG, no source answer.
  d) Ungrounded model answers fail closed — safe fallback, never exposed to staff.

Root-cause coverage:
  The hygiene document silently fails the staff /ask gate when governance_reviewed_by
  or governance_reviewed_at is NULL even though it passes /policies.  These tests
  prove that scenario and its resolution without touching Supabase data directly.
"""

import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import (
    app,
    _STAFF_FALLBACK_ANSWER,
    _can_use_document_for_staff_ask,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

_HYGIENE_DOC_ID = "hygiene-doc-1"
_MOBILE_DOC_ID = "mobile-doc-1"

_HYGIENE_CHUNK = {
    "document_id": _HYGIENE_DOC_ID,
    "chunk_index": 0,
    "chunk_text": "All staff must wash hands with soap for at least 20 seconds.",
    "document_title": "Hygiene Policy",
    "category": "Health and Safety",
    "access_roles": ["All Staff"],
}

_MOBILE_CHUNK = {
    "document_id": _MOBILE_DOC_ID,
    "chunk_index": 0,
    "chunk_text": "Personal mobile phones must be kept on silent during working hours.",
    "document_title": "Mobile Phone Policy",
    "category": "HR",
    "access_roles": ["All Staff"],
}


def _rpc_ok(chunk):
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = [chunk]
    return m


def _fully_approved_elig(doc_id, doc_title="Hygiene Policy"):
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


def _missing_reviewer_elig(doc_id):
    base = _fully_approved_elig(doc_id)[doc_id].copy()
    base["governance_reviewed_by"] = None
    base["governance_reviewed_at"] = None
    return {doc_id: base}


def _missing_reviewed_at_elig(doc_id):
    base = _fully_approved_elig(doc_id)[doc_id].copy()
    base["governance_reviewed_at"] = None
    return {doc_id: base}


_SOURCES = [{"document_title": "Hygiene Policy", "source_label": "[Source 1]"}]
_GROUNDED_ANSWER = "Staff must wash hands for 20 seconds [Source 1]."


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


def _run_ask(question, elig_map, rpc_chunk, grounded=True):
    """
    Run POST /ask with real _can_use_document_for_staff_ask (no gate mock).
    Answer generation and validation are mocked so no OpenAI key is needed.
    """
    validate_return = "source_grounded" if grounded else "insufficient_sources"
    with ExitStack() as stack:
        for p in _base_infra_patches():
            stack.enter_context(p)
        stack.enter_context(patch("httpx.post", return_value=_rpc_ok(rpc_chunk)))
        stack.enter_context(
            patch(
                "app.main._fetch_staff_ask_document_eligibility_batch",
                return_value=elig_map,
            )
        )
        stack.enter_context(
            patch("app.main._normalise_search_result", return_value=rpc_chunk)
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
                return_value={"answer": _GROUNDED_ANSWER},
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
# Root-cause unit tests (governance gate, no HTTP)
# These run _can_use_document_for_staff_ask directly to show the exact condition
# that blocks the hygiene document when reviewer fields are NULL.
# ---------------------------------------------------------------------------

class TestHygieneDocGovernanceGate:
    """
    Proves scenario 2 from the diagnostic: Hygiene rows are returned by the RPC
    but filtered out because governance_reviewed_by / governance_reviewed_at are NULL.
    The same fully-approved document with those fields set must pass the gate.
    """

    def test_hygiene_doc_passes_gate_when_fully_approved(self):
        doc = _fully_approved_elig(_HYGIENE_DOC_ID)[_HYGIENE_DOC_ID]
        ok, reason = _can_use_document_for_staff_ask(doc, "Care Worker")
        assert ok is True
        assert reason is None

    def test_hygiene_doc_blocked_when_governance_reviewed_by_null(self):
        doc = _missing_reviewer_elig(_HYGIENE_DOC_ID)[_HYGIENE_DOC_ID]
        ok, reason = _can_use_document_for_staff_ask(doc, "Care Worker")
        assert ok is False
        assert "governance_reviewed_by" in reason

    def test_hygiene_doc_blocked_when_governance_reviewed_at_null(self):
        doc = _missing_reviewed_at_elig(_HYGIENE_DOC_ID)[_HYGIENE_DOC_ID]
        ok, reason = _can_use_document_for_staff_ask(doc, "Care Worker")
        assert ok is False
        assert "governance_reviewed_at" in reason

    def test_hygiene_doc_passes_gate_with_all_staff_access_roles(self):
        doc = _fully_approved_elig(_HYGIENE_DOC_ID)[_HYGIENE_DOC_ID]
        ok, reason = _can_use_document_for_staff_ask(doc, "Kitchen Staff")
        assert ok is True
        assert reason is None


# ---------------------------------------------------------------------------
# (b) Hygiene hand-hygiene query returns source-grounded answer when approved
# ---------------------------------------------------------------------------

class TestHygieneQueryApprovedDoc:

    def test_hand_hygiene_query_returns_200(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.status_code == 200

    def test_hand_hygiene_query_returns_grounded_answer(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["answer"] == _GROUNDED_ANSWER

    def test_hand_hygiene_allowed_to_answer_true(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["allowed_to_answer"] is True

    def test_infection_spread_query_returns_grounded_answer(self):
        resp = _run_ask(
            "What basic hygiene steps should staff follow to reduce the spread of infection?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["answer"] == _GROUNDED_ANSWER
        assert resp.json()["allowed_to_answer"] is True

    def test_coughs_sneezes_query_returns_grounded_answer(self):
        resp = _run_ask(
            "What should staff do about coughs, sneezes and used tissues?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["answer"] == _GROUNDED_ANSWER

    def test_vomiting_fever_query_returns_grounded_answer(self):
        resp = _run_ask(
            "What should staff do about vomiting or diarrhoea, fever or high temperature?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["answer"] == _GROUNDED_ANSWER


# ---------------------------------------------------------------------------
# Root-cause /ask behaviour: hygiene query returns fallback when reviewer missing
# _can_use_document_for_staff_ask runs for real; answer generation is NOT reached.
# ---------------------------------------------------------------------------

class TestHygieneQueryMissingReviewer:

    def test_hand_hygiene_returns_fallback_when_reviewer_missing(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _missing_reviewer_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.status_code == 200
        assert resp.json()["answer"] == _STAFF_FALLBACK_ANSWER

    def test_hand_hygiene_allowed_to_answer_false_when_reviewer_missing(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _missing_reviewer_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["allowed_to_answer"] is False

    def test_hand_hygiene_requires_escalation_when_reviewer_missing(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _missing_reviewer_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["requires_escalation"] is True

    def test_hand_hygiene_returns_fallback_when_reviewed_at_missing(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _missing_reviewed_at_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
        )
        assert resp.json()["answer"] == _STAFF_FALLBACK_ANSWER


# ---------------------------------------------------------------------------
# (a) Mobile-phone query returns source-grounded answer (AC32 path regression)
# ---------------------------------------------------------------------------

class TestMobilePhoneQueryRegression:

    def test_mobile_phone_query_returns_grounded_answer(self):
        resp = _run_ask(
            "What is the mobile phone policy?",
            _fully_approved_elig(_MOBILE_DOC_ID, "Mobile Phone Policy"),
            _MOBILE_CHUNK,
        )
        assert resp.json()["answer"] == _GROUNDED_ANSWER
        assert resp.json()["allowed_to_answer"] is True

    def test_mobile_phone_query_returns_200(self):
        resp = _run_ask(
            "What is the mobile phone policy?",
            _fully_approved_elig(_MOBILE_DOC_ID, "Mobile Phone Policy"),
            _MOBILE_CHUNK,
        )
        assert resp.status_code == 200

    def test_mobile_phone_query_not_classified_as_escalation(self):
        """Mobile phone is not a sensitive topic — no escalation short-circuit."""
        resp = _run_ask(
            "What is the mobile phone policy?",
            _fully_approved_elig(_MOBILE_DOC_ID, "Mobile Phone Policy"),
            _MOBILE_CHUNK,
        )
        assert resp.json()["requires_escalation"] is False


# ---------------------------------------------------------------------------
# (c) Medication and safeguarding queries safely escalate — no RAG
# No mocks needed beyond infrastructure: escalation happens before RPC.
# ---------------------------------------------------------------------------

class TestSensitiveTopicEscalation:

    def _run_escalation(self, question):
        with ExitStack() as stack:
            for p in _base_infra_patches():
                stack.enter_context(p)
            return client.post("/ask", json={"question": question})

    def test_medication_query_escalates(self):
        resp = self._run_escalation("What is the correct dose for this medication?")
        assert resp.status_code == 200
        assert resp.json()["requires_escalation"] is True

    def test_medication_escalation_not_allowed_to_answer(self):
        resp = self._run_escalation("Staff member missed a dose on the MAR sheet.")
        assert resp.json()["allowed_to_answer"] is False

    def test_safeguarding_query_escalates(self):
        resp = self._run_escalation(
            "A service user disclosed that they are being abused."
        )
        assert resp.json()["requires_escalation"] is True

    def test_safeguarding_escalation_not_allowed_to_answer(self):
        resp = self._run_escalation(
            "I think a vulnerable adult is at risk of harm."
        )
        assert resp.json()["allowed_to_answer"] is False

    def test_safeguarding_answer_is_not_grounded_answer(self):
        resp = self._run_escalation(
            "There was a safeguarding incident involving a service user."
        )
        assert resp.json()["answer"] != _GROUNDED_ANSWER


# ---------------------------------------------------------------------------
# (d) Ungrounded model answers fail closed
# ---------------------------------------------------------------------------

class TestUngroundedAnswerFailsClosed:

    def test_ungrounded_answer_returns_fallback(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
            grounded=False,
        )
        assert resp.json()["answer"] == _STAFF_FALLBACK_ANSWER

    def test_ungrounded_answer_not_allowed_to_answer(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
            grounded=False,
        )
        assert resp.json()["allowed_to_answer"] is False

    def test_ungrounded_answer_text_not_in_response(self):
        resp = _run_ask(
            "What does the hygiene policy say about hand hygiene?",
            _fully_approved_elig(_HYGIENE_DOC_ID),
            _HYGIENE_CHUNK,
            grounded=False,
        )
        assert _GROUNDED_ANSWER not in resp.text
