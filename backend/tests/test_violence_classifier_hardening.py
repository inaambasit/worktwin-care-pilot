"""
Violence/aggression/threatening behaviour classifier hardening tests.

Verifies that _classify_escalation_topic correctly identifies violence,
aggression, threatening behaviour, intimidation, serious distress, staff
safety, and immediate risk queries — and that the answer-debug endpoint
returns a non-null safety_note for such queries.

Scope: backend only. Does not test staff /ask routing or governance gates.
"""
import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, _require_admin, _classify_escalation_topic

client = TestClient(app)

_ORG = "thumhara-centre"
_EXPECTED_TOPIC = "violence_aggression"
_SAFETY_NOTE = (
    "This query involves a sensitive topic. "
    "Please escalate to your line manager or designated lead."
)

# ---------------------------------------------------------------------------
# Unit tests: _classify_escalation_topic — violence/aggression keywords
# ---------------------------------------------------------------------------

class TestViolenceClassifier:
    def test_violent_behaviour_classified(self):
        assert _classify_escalation_topic(
            "What should staff do if someone becomes violent or threatening?"
        ) == _EXPECTED_TOPIC

    def test_violence_keyword(self):
        assert _classify_escalation_topic(
            "There has been violence on the unit — what do I do?"
        ) == _EXPECTED_TOPIC

    def test_aggression_keyword(self):
        assert _classify_escalation_topic(
            "How should staff manage aggression from a service user?"
        ) == _EXPECTED_TOPIC

    def test_aggressive_keyword(self):
        assert _classify_escalation_topic(
            "A visitor is being aggressive towards staff."
        ) == _EXPECTED_TOPIC

    def test_threatening_keyword(self):
        assert _classify_escalation_topic(
            "A service user is making threatening comments."
        ) == _EXPECTED_TOPIC

    def test_threat_keyword(self):
        assert _classify_escalation_topic(
            "What is the procedure when staff receive a threat?"
        ) == _EXPECTED_TOPIC

    def test_threats_plural(self):
        assert _classify_escalation_topic(
            "Staff are receiving threats from a family member."
        ) == _EXPECTED_TOPIC

    def test_intimidation_keyword(self):
        assert _classify_escalation_topic(
            "What counts as intimidation and how is it reported?"
        ) == _EXPECTED_TOPIC

    def test_intimidating_keyword(self):
        assert _classify_escalation_topic(
            "A colleague is being intimidating towards junior staff."
        ) == _EXPECTED_TOPIC

    def test_serious_distress_keyword(self):
        assert _classify_escalation_topic(
            "A service user is in serious distress and becoming unpredictable."
        ) == _EXPECTED_TOPIC

    def test_staff_safety_keyword(self):
        assert _classify_escalation_topic(
            "What are the procedures for staff safety during a lone-worker visit?"
        ) == _EXPECTED_TOPIC

    def test_immediate_risk_keyword(self):
        assert _classify_escalation_topic(
            "There is an immediate risk to the safety of staff on the floor."
        ) == _EXPECTED_TOPIC

    # --- case-insensitivity ---

    def test_violence_uppercase(self):
        assert _classify_escalation_topic("VIOLENCE on the unit — what do I do?") == _EXPECTED_TOPIC

    def test_aggressive_mixed_case(self):
        assert _classify_escalation_topic("The resident is being Aggressive.") == _EXPECTED_TOPIC

    # --- no false positives on ordinary queries ---

    def test_visitor_query_not_classified(self):
        assert _classify_escalation_topic("How does a visitor sign in?") is None

    def test_mobile_phone_query_not_classified(self):
        assert _classify_escalation_topic("Can staff use their mobile phone during a shift?") is None

    def test_uniform_query_not_classified(self):
        assert _classify_escalation_topic("Where do I collect my uniform from?") is None

    # --- cross-category: higher-priority topics must still win first-match ---

    def test_abuse_still_classified_as_safeguarding(self):
        assert _classify_escalation_topic(
            "What should I do if a service user says they are being abused?"
        ) == "safeguarding"

    def test_medication_still_classified_as_medication(self):
        assert _classify_escalation_topic(
            "What should I do if medication is missed?"
        ) == "medication"


# ---------------------------------------------------------------------------
# Integration test: answer-debug returns non-null safety_note for violence query
# ---------------------------------------------------------------------------

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


def _make_rpc_mock(document_id: str, document_title: str, category: str = "incident reporting"):
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
            "chunk_text": "Staff should follow the violence and aggression procedure.",
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


_VIOLENCE_QUERY = "What should staff do if someone becomes violent or threatening?"
_DOC_ID = "doc-accident-incident-001"
_DOC_TITLE = "Accident and Incident Reporting Policy"


def _run_violence_answer_debug():
    gen = MagicMock(return_value={"answer": "Follow the violence and aggression procedure."})
    payload = {
        "query": _VIOLENCE_QUERY,
        "organisation_id": _ORG,
        "match_count": 5,
        "allow_dummy_override": False,
    }
    with ExitStack() as stack:
        for p in _BASE_PATCHES:
            stack.enter_context(p)
        stack.enter_context(
            patch("httpx.post", return_value=_make_rpc_mock(_DOC_ID, _DOC_TITLE))
        )
        stack.enter_context(
            patch(
                "app.main._get_document_governance_batch",
                return_value=_governance_approving(_DOC_ID),
            )
        )
        stack.enter_context(
            patch("app.main._generate_source_grounded_answer", gen)
        )
        return client.post("/documents/answer-debug", json=payload), gen


class TestViolenceQueryAnswerDebugSafetyNote:
    def test_status_200(self):
        resp, _ = _run_violence_answer_debug()
        assert resp.status_code == 200

    def test_safety_note_is_not_null(self):
        resp, _ = _run_violence_answer_debug()
        assert resp.json()["safety_note"] is not None

    def test_safety_note_content(self):
        resp, _ = _run_violence_answer_debug()
        assert resp.json()["safety_note"] == _SAFETY_NOTE
