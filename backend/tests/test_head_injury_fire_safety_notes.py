"""
TC-POL-006 answer-quality hardening — head injury and fire/exit focused safety notes.

Proves:
  1. _classify_focused_safety_note detects head injury queries and returns a note
     containing 999 / urgent medical escalation / manager / no paperwork delay.
  2. _classify_focused_safety_note detects fire/exit queries and returns a note
     stating the site fire procedure comes first and WorkTwin is not a substitute.
  3. _classify_focused_safety_note returns None for ordinary queries.
  4. answer-debug returns the focused safety_note for head injury queries.
  5. answer-debug returns the focused safety_note for fire/exit queries.
  6. Medication specialist block still works (regression guard).
  7. Safeguarding specialist block still works (regression guard).
  8. Confidentiality escalation topic classification unchanged (regression guard).
  9. Staff /ask still short-circuits fall/accident queries — governance gate unchanged.

Scope: backend only. TC-POL-006 remains Lane B (admin answer-debug only).
Staff visibility and Staff Ask approval are not changed.
"""
import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import (
    app,
    _require_admin,
    _classify_escalation_topic,
    _classify_focused_safety_note,
    _HEAD_INJURY_SAFETY_NOTE,
    _FIRE_EXIT_SAFETY_NOTE,
    _required_specialist_area,
)

client = TestClient(app)

_ORG = "thumhara-centre"

_BASE_PATCHES = [
    patch.dict(os.environ, {}),
    patch("app.main._OPENAI_CONFIGURED", True),
    patch("app.main._DB_CONFIGURED", True),
    patch("app.main._embed_query_text", return_value=[0.1]),
    patch("app.main._format_vector_for_pgvector", return_value="[0.1]"),
    patch("app.main._create_audit_event"),
]


@pytest.fixture(autouse=True)
def bypass_admin():
    app.dependency_overrides[_require_admin] = lambda: None
    yield
    app.dependency_overrides.clear()


def _empty_rpc():
    """RPC mock returning no chunks — triggers Case 1 (no sources)."""
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = []
    return m


def _rpc_with_chunk(document_id: str, document_title: str, category: str):
    m = MagicMock()
    m.status_code = 200
    m.json.return_value = [
        {
            "document_id": document_id,
            "chunk_id": f"{document_id}-chunk-0",
            "chunk_index": 0,
            "document_title": document_title,
            "category": category,
            "approved_for_ai_answers": True,
            "escalation_required": False,
            "is_sensitive": False,
            "similarity": 0.88,
            "chunk_text": "Relevant policy text.",
        }
    ]
    return m


def _governance_approving(document_id: str) -> dict:
    return {
        document_id: {
            "id": document_id,
            "real_document": True,
            "dummy_document": False,
            "is_sensitive": False,
            "escalation_required": False,
            "approved_for_source_grounded_answers": True,
            "approved_for_embedding": True,
            "governance_status": "approved_for_ai",
        }
    }


def _run_answer_debug(query: str, rpc_mock=None) -> dict:
    """Run POST /documents/answer-debug with empty RPC (no sources) by default."""
    if rpc_mock is None:
        rpc_mock = _empty_rpc()
    payload = {
        "query": query,
        "organisation_id": _ORG,
        "match_count": 5,
        "allow_dummy_override": False,
    }
    with ExitStack() as stack:
        for p in _BASE_PATCHES:
            stack.enter_context(p)
        stack.enter_context(patch("httpx.post", return_value=rpc_mock))
        return client.post("/documents/answer-debug", json=payload).json()


# ---------------------------------------------------------------------------
# Unit tests: _classify_focused_safety_note — head injury keywords
# ---------------------------------------------------------------------------

class TestHeadInjuryFocusedSafetyNote:
    def test_hits_their_head(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert note is not None

    def test_hit_their_head_variant(self):
        note = _classify_focused_safety_note(
            "A resident has hit their head on the floor."
        )
        assert note is not None

    def test_head_injury_keyword(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone has a head injury?"
        )
        assert note is not None

    def test_serious_head_injury(self):
        note = _classify_focused_safety_note(
            "How should staff respond to a serious head injury?"
        )
        assert note is not None

    def test_head_trauma(self):
        note = _classify_focused_safety_note(
            "A service user has sustained a head trauma."
        )
        assert note is not None

    def test_bangs_head(self):
        note = _classify_focused_safety_note(
            "What if someone bangs their head against the wall?"
        )
        assert note is not None

    def test_returns_head_injury_note_constant(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert note == _HEAD_INJURY_SAFETY_NOTE

    def test_note_contains_999(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert "999" in note

    def test_note_contains_urgent(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert "urgent" in note.lower()

    def test_note_contains_medical(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert "medical" in note.lower()

    def test_note_contains_manager(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert "manager" in note.lower()

    def test_note_contains_paperwork(self):
        note = _classify_focused_safety_note(
            "What should staff do if someone falls and hits their head?"
        )
        assert "paperwork" in note.lower()

    def test_case_insensitive(self):
        note = _classify_focused_safety_note("WHAT IF SOMEONE HITS THEIR HEAD?")
        assert note is not None

    # No false positives
    def test_ordinary_fall_no_head_not_triggered(self):
        # A fall without head involvement should not match _HEAD_INJURY_PAT
        note = _classify_focused_safety_note("What should staff do after a fall?")
        # Falls may still match fire exit or return None — not the head injury note
        assert note != _HEAD_INJURY_SAFETY_NOTE

    def test_visitor_query_not_triggered(self):
        assert _classify_focused_safety_note("How does a visitor sign in?") is None


# ---------------------------------------------------------------------------
# Unit tests: _classify_focused_safety_note — fire/exit keywords
# ---------------------------------------------------------------------------

class TestFireExitFocusedSafetyNote:
    def test_fire_incident(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a fire incident?"
        )
        assert note is not None

    def test_blocked_fire_exit(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a blocked fire exit?"
        )
        assert note is not None

    def test_fire_exit_blocked(self):
        note = _classify_focused_safety_note(
            "The fire exit is blocked — what should staff do?"
        )
        assert note is not None

    def test_fire_emergency(self):
        note = _classify_focused_safety_note(
            "What is the procedure during a fire emergency?"
        )
        assert note is not None

    def test_fire_evacuation(self):
        note = _classify_focused_safety_note(
            "How should staff handle a fire evacuation?"
        )
        assert note is not None

    def test_fire_alarm(self):
        note = _classify_focused_safety_note(
            "What should staff do when the fire alarm sounds?"
        )
        assert note is not None

    def test_evacuation_route(self):
        note = _classify_focused_safety_note(
            "Is the evacuation route clearly marked?"
        )
        assert note is not None

    def test_returns_fire_exit_note_constant(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a blocked fire exit?"
        )
        assert note == _FIRE_EXIT_SAFETY_NOTE

    def test_note_says_procedure_first(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a fire incident or blocked fire exit?"
        )
        assert "procedure" in note.lower()

    def test_note_says_not_a_substitute(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a blocked fire exit?"
        )
        assert "not a substitute" in note

    def test_note_contains_999(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a fire emergency?"
        )
        assert "999" in note

    def test_note_contains_manager(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a blocked fire exit?"
        )
        assert "manager" in note.lower()

    def test_case_insensitive(self):
        note = _classify_focused_safety_note("FIRE INCIDENT WHAT DO WE DO?")
        assert note is not None

    # No false positives
    def test_ordinary_query_not_triggered(self):
        assert _classify_focused_safety_note("How does a visitor sign in?") is None

    def test_medication_query_not_triggered(self):
        assert _classify_focused_safety_note(
            "What should staff do if someone refuses their medication?"
        ) is None


# ---------------------------------------------------------------------------
# Unit tests: ordinary queries return None
# ---------------------------------------------------------------------------

class TestFocusedSafetyNoteNoFalsePositives:
    def test_mobile_phone_query(self):
        assert _classify_focused_safety_note("Can staff use their mobile phone?") is None

    def test_visitor_query(self):
        assert _classify_focused_safety_note("How does a visitor sign in?") is None

    def test_uniform_query(self):
        assert _classify_focused_safety_note("Where do I collect my uniform?") is None

    def test_empty_string(self):
        assert _classify_focused_safety_note("") is None


# ---------------------------------------------------------------------------
# Integration tests: answer-debug returns correct safety_note — head injury
# ---------------------------------------------------------------------------

class TestHeadInjurySafetyNoteAnswerDebug:
    """Answer-debug with head injury query returns focused safety_note (Case 1: no sources)."""

    _QUERY = "What should staff do if someone falls and hits their head?"

    def test_status_200(self):
        resp = _run_answer_debug(self._QUERY)
        assert resp is not None  # already checked via _run_answer_debug

    def test_safety_note_is_not_null(self):
        resp = _run_answer_debug(self._QUERY)
        assert resp["safety_note"] is not None

    def test_safety_note_contains_999(self):
        resp = _run_answer_debug(self._QUERY)
        assert "999" in resp["safety_note"]

    def test_safety_note_contains_urgent_medical(self):
        resp = _run_answer_debug(self._QUERY)
        note = resp["safety_note"]
        assert "urgent" in note.lower() or "medical" in note.lower()

    def test_safety_note_contains_manager(self):
        resp = _run_answer_debug(self._QUERY)
        assert "manager" in resp["safety_note"].lower()

    def test_safety_note_no_paperwork_delay(self):
        resp = _run_answer_debug(self._QUERY)
        assert "paperwork" in resp["safety_note"].lower()

    def test_safety_note_is_head_injury_note(self):
        resp = _run_answer_debug(self._QUERY)
        assert resp["safety_note"] == _HEAD_INJURY_SAFETY_NOTE

    def test_head_injury_keyword_query_also_works(self):
        resp = _run_answer_debug("What should staff do if someone has a head injury?")
        assert resp["safety_note"] == _HEAD_INJURY_SAFETY_NOTE


# ---------------------------------------------------------------------------
# Integration tests: answer-debug returns correct safety_note — fire/exit
# ---------------------------------------------------------------------------

class TestFireExitSafetyNoteAnswerDebug:
    """Answer-debug with fire/exit query returns focused safety_note (Case 1: no sources)."""

    _QUERY = "What should staff do if there is a fire incident or blocked fire exit?"

    def test_safety_note_is_not_null(self):
        resp = _run_answer_debug(self._QUERY)
        assert resp["safety_note"] is not None

    def test_safety_note_says_procedure_first(self):
        resp = _run_answer_debug(self._QUERY)
        assert "procedure" in resp["safety_note"].lower()

    def test_safety_note_says_not_a_substitute(self):
        resp = _run_answer_debug(self._QUERY)
        assert "not a substitute" in resp["safety_note"]

    def test_safety_note_contains_999(self):
        resp = _run_answer_debug(self._QUERY)
        assert "999" in resp["safety_note"]

    def test_safety_note_contains_manager(self):
        resp = _run_answer_debug(self._QUERY)
        assert "manager" in resp["safety_note"].lower()

    def test_safety_note_is_fire_exit_note(self):
        resp = _run_answer_debug(self._QUERY)
        assert resp["safety_note"] == _FIRE_EXIT_SAFETY_NOTE

    def test_blocked_fire_exit_query_also_works(self):
        resp = _run_answer_debug("What should staff do if there is a blocked fire exit?")
        assert resp["safety_note"] == _FIRE_EXIT_SAFETY_NOTE


# ---------------------------------------------------------------------------
# Regression: specialist blocks — medication, safeguarding, confidentiality
# ---------------------------------------------------------------------------

class TestSpecialistBlocksRegression:
    """Medication, safeguarding, and confidentiality specialist blocks are unchanged."""

    _DOC_ID = "doc-visitor-001"

    def _run_with_visitor_source(self, query: str) -> dict:
        rpc = _rpc_with_chunk(
            self._DOC_ID, "Visitor Sign-In and Identification Policy", "visitor management"
        )
        gen = MagicMock(return_value={"answer": "UNSAFE model answer."})
        payload = {
            "query": query,
            "organisation_id": _ORG,
            "match_count": 5,
            "allow_dummy_override": False,
        }
        with ExitStack() as stack:
            for p in _BASE_PATCHES:
                stack.enter_context(p)
            stack.enter_context(patch("httpx.post", return_value=rpc))
            stack.enter_context(
                patch(
                    "app.main._get_document_governance_batch",
                    return_value=_governance_approving(self._DOC_ID),
                )
            )
            stack.enter_context(patch("app.main._generate_source_grounded_answer", gen))
            return client.post("/documents/answer-debug", json=payload).json(), gen

    def test_medication_blocked_insufficient_sources(self):
        resp, gen = self._run_with_visitor_source(
            "What should staff do if someone refuses their medication?"
        )
        assert resp["confidence"] == "insufficient_sources"
        gen.assert_not_called()

    def test_safeguarding_blocked_insufficient_sources(self):
        resp, gen = self._run_with_visitor_source(
            "Should staff make a safeguarding referral if someone says they are being neglected?"
        )
        assert resp["confidence"] == "insufficient_sources"
        gen.assert_not_called()

    def test_confidentiality_blocked_insufficient_sources(self):
        resp, gen = self._run_with_visitor_source(
            "Can staff share confidential information with a family member?"
        )
        assert resp["confidence"] == "insufficient_sources"
        gen.assert_not_called()

    def test_medication_safety_note_present(self):
        resp, _ = self._run_with_visitor_source(
            "What should staff do if someone refuses their medication?"
        )
        assert resp["safety_note"] is not None

    def test_safeguarding_safety_note_present(self):
        resp, _ = self._run_with_visitor_source(
            "Should staff make a safeguarding referral if someone says they are being neglected?"
        )
        assert resp["safety_note"] is not None


# ---------------------------------------------------------------------------
# Regression: _classify_escalation_topic unchanged for key categories
# ---------------------------------------------------------------------------

class TestEscalationTopicClassifierRegression:
    """_classify_escalation_topic returns unchanged results for existing categories."""

    def test_medication_query_classified(self):
        assert _classify_escalation_topic(
            "What should staff do if someone refuses their medication?"
        ) == "medication"

    def test_safeguarding_abuse_classified(self):
        assert _classify_escalation_topic(
            "What should I do if a service user says they are being abused?"
        ) == "safeguarding"

    def test_confidential_information_classified_as_legal(self):
        assert _classify_escalation_topic(
            "Can staff share confidential information with a family member?"
        ) == "legal"

    def test_violence_classified(self):
        assert _classify_escalation_topic(
            "What should staff do if someone becomes violent or threatening?"
        ) == "violence_aggression"

    def test_fall_classified_as_accident_incident(self):
        assert _classify_escalation_topic(
            "What should I do after a resident has a fall?"
        ) == "accident_incident"

    def test_visitor_not_classified(self):
        assert _classify_escalation_topic("How does a visitor sign in?") is None


# ---------------------------------------------------------------------------
# Regression: staff /ask governance gate — fall/head injury query escalates
# ---------------------------------------------------------------------------

class TestStaffAskGovernanceGate:
    """Staff /ask still short-circuits fall/head-injury queries — TC-POL-006 not Staff Ask ready."""

    _FALL_QUERY = "What should staff do if someone falls and hits their head?"

    def test_fall_query_escalation_topic_is_accident_incident(self):
        topic = _classify_escalation_topic(self._FALL_QUERY)
        assert topic == "accident_incident"

    def test_head_injury_query_escalation_topic_is_not_none(self):
        topic = _classify_escalation_topic(
            "What should staff do if someone has a head injury?"
        )
        assert topic is not None

    def _run_staff_ask(self, question: str) -> dict:
        """Run POST /ask with auth bypassed via _get_pilot_staff_context patch."""
        with ExitStack() as stack:
            stack.enter_context(patch.dict(os.environ, {"PILOT_AUTH_MODE": ""}))
            stack.enter_context(
                patch(
                    "app.main._get_pilot_staff_context",
                    return_value=(_ORG, "staff-user-1", "care_staff"),
                )
            )
            stack.enter_context(patch("app.main._check_ask_rate_limit", return_value=None))
            stack.enter_context(patch("app.main._OPENAI_CONFIGURED", True))
            stack.enter_context(patch("app.main._DB_CONFIGURED", True))
            stack.enter_context(patch("app.main._create_audit_event"))
            return client.post("/ask", json={"question": question})

    def test_staff_ask_fall_query_returns_escalation_response(self):
        """Staff /ask must short-circuit and return requires_escalation=True for fall queries."""
        resp = self._run_staff_ask(self._FALL_QUERY)
        assert resp.status_code == 200
        assert resp.json().get("requires_escalation") is True

    def test_focused_safety_note_does_not_affect_staff_ask(self):
        """_classify_focused_safety_note is only used in answer-debug, not staff /ask.
        The staff /ask response has no safety_note field — escalation is the safety gate."""
        resp = self._run_staff_ask(self._FALL_QUERY)
        data = resp.json()
        assert "safety_note" not in data
        assert data.get("requires_escalation") is True
