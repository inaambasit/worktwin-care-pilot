"""
Staff Ask fire/emergency escalation routing fix.

Proves:
  1. Fire/blocked-exit queries classify as fire_emergency, NOT safeguarding.
  2. Staff Ask fire response does not say "safeguarding concern".
  3. Staff Ask fire response does not route to Local authority safeguarding team.
  4. Staff Ask fire response mentions fire/emergency procedure first.
  5. Staff Ask fire response mentions 999 and Registered Manager.
  6. Staff Ask fire vertical_subcategory is fire_emergency.
  7. Head injury query still classifies as accident_incident (regression).
  8. Genuine safeguarding query still classifies as safeguarding (regression).
  9. Admin answer-debug focused fire safety_note is unchanged (regression).

Root cause covered:
  The safeguarding _TOPIC_PATTERN previously included r'incident|accident', causing
  "fire incident" to match safeguarding before reaching any fire-specific path.
  Fix: add fire_emergency before safeguarding; remove incident/accident from safeguarding pattern.
"""

import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import (
    app,
    _classify_escalation_topic,
    _classify_focused_safety_note,
    _FIRE_EXIT_SAFETY_NOTE,
    _TOPIC_RESPONSE,
    _require_admin,
)

client = TestClient(app)

_ORG = "demo-org"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_infra_patches():
    return [
        patch.dict(os.environ, {"PILOT_AUTH_MODE": ""}),
        patch(
            "app.main._get_pilot_staff_context",
            return_value=(_ORG, "demo-user", "Care Worker"),
        ),
        patch("app.main._check_ask_rate_limit"),
        patch("app.main._OPENAI_CONFIGURED", True),
        patch("app.main._DB_CONFIGURED", True),
        patch("app.main._create_audit_event"),
    ]


def _run_staff_ask(question: str) -> dict:
    """POST /ask with infrastructure patched — no OpenAI or DB required."""
    with ExitStack() as stack:
        for p in _base_infra_patches():
            stack.enter_context(p)
        resp = client.post("/ask", json={"question": question})
    assert resp.status_code == 200
    return resp.json()


def _run_answer_debug(query: str) -> dict:
    empty_rpc = MagicMock()
    empty_rpc.status_code = 200
    empty_rpc.json.return_value = []
    payload = {
        "query": query,
        "organisation_id": _ORG,
        "match_count": 5,
        "allow_dummy_override": False,
    }

    @pytest.fixture(autouse=False)
    def bypass_admin_local():
        app.dependency_overrides[_require_admin] = lambda: None
        yield
        app.dependency_overrides.clear()

    base = [
        patch.dict(os.environ, {}),
        patch("app.main._OPENAI_CONFIGURED", True),
        patch("app.main._DB_CONFIGURED", True),
        patch("app.main._embed_query_text", return_value=[0.1]),
        patch("app.main._format_vector_for_pgvector", return_value="[0.1]"),
        patch("app.main._create_audit_event"),
    ]
    with ExitStack() as stack:
        app.dependency_overrides[_require_admin] = lambda: None
        for p in base:
            stack.enter_context(p)
        stack.enter_context(patch("httpx.post", return_value=empty_rpc))
        result = client.post("/documents/answer-debug", json=payload).json()
    app.dependency_overrides.clear()
    return result


# ---------------------------------------------------------------------------
# 1. Classification: fire queries → fire_emergency
# ---------------------------------------------------------------------------

class TestFireClassification:
    """_classify_escalation_topic returns fire_emergency for all fire/exit queries."""

    def test_fire_incident_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic(
            "What should staff do if there is a fire incident?"
        )
        assert topic == "fire_emergency"

    def test_fire_incident_blocked_exit_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic(
            "What should staff do if there is a fire incident or blocked fire exit?"
        )
        assert topic == "fire_emergency"

    def test_blocked_fire_exit_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic(
            "What should staff do if there is a blocked fire exit?"
        )
        assert topic == "fire_emergency"

    def test_fire_exit_blocked_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("The fire exit is blocked — what do we do?")
        assert topic == "fire_emergency"

    def test_fire_alarm_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("What should staff do when the fire alarm sounds?")
        assert topic == "fire_emergency"

    def test_fire_evacuation_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("How should staff handle a fire evacuation?")
        assert topic == "fire_emergency"

    def test_fire_emergency_keyword_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("What is the procedure during a fire emergency?")
        assert topic == "fire_emergency"

    def test_evacuation_route_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("Is the evacuation route clearly marked?")
        assert topic == "fire_emergency"

    def test_fire_drill_classifies_as_fire_emergency(self):
        topic = _classify_escalation_topic("What are the steps during a fire drill?")
        assert topic == "fire_emergency"

    def test_fire_incident_not_safeguarding(self):
        """Critical regression: fire incident must NOT classify as safeguarding."""
        topic = _classify_escalation_topic(
            "What should staff do if there is a fire incident?"
        )
        assert topic != "safeguarding"

    def test_blocked_fire_exit_not_safeguarding(self):
        topic = _classify_escalation_topic("blocked fire exit")
        assert topic != "safeguarding"


# ---------------------------------------------------------------------------
# 2. Staff Ask response wording — fire/emergency framing, not safeguarding
# ---------------------------------------------------------------------------

class TestFireStaffAskResponseWording:
    """Staff Ask fire queries must use fire/emergency framing."""

    _QUERY = "What should staff do if there is a fire incident or blocked fire exit?"

    def test_fire_query_requires_escalation(self):
        data = _run_staff_ask(self._QUERY)
        assert data["requires_escalation"] is True

    def test_fire_query_not_allowed_to_answer(self):
        data = _run_staff_ask(self._QUERY)
        assert data["allowed_to_answer"] is False

    def test_fire_query_answer_does_not_say_safeguarding_concern(self):
        data = _run_staff_ask(self._QUERY)
        assert "safeguarding concern" not in data["answer"].lower()

    def test_fire_query_answer_does_not_say_this_may_be_a_safeguarding(self):
        data = _run_staff_ask(self._QUERY)
        assert "this may be a safeguarding" not in data["answer"].lower()

    def test_fire_query_answer_mentions_procedure(self):
        data = _run_staff_ask(self._QUERY)
        assert "procedure" in data["answer"].lower()

    def test_fire_query_answer_mentions_999(self):
        data = _run_staff_ask(self._QUERY)
        assert "999" in data["answer"]

    def test_fire_query_answer_mentions_registered_manager(self):
        data = _run_staff_ask(self._QUERY)
        assert "registered manager" in data["answer"].lower()

    def test_fire_query_answer_says_not_a_substitute(self):
        data = _run_staff_ask(self._QUERY)
        assert "not a substitute" in data["answer"].lower()

    def test_fire_query_vertical_subcategory_is_fire_emergency(self):
        data = _run_staff_ask(self._QUERY)
        assert data.get("vertical_subcategory") == "fire_emergency"


# ---------------------------------------------------------------------------
# 3. Contact routes — no Local authority safeguarding team for pure fire query
# ---------------------------------------------------------------------------

class TestFireContactRoutes:
    """Fire queries must not prioritise safeguarding contact routes."""

    _QUERY = "What should staff do if there is a fire incident or blocked fire exit?"

    def test_fire_query_contact_routes_present(self):
        data = _run_staff_ask(self._QUERY)
        assert len(data.get("contact_routes", [])) > 0

    def test_fire_query_no_local_authority_safeguarding_team(self):
        data = _run_staff_ask(self._QUERY)
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "local authority safeguarding" not in routes_text

    def test_fire_query_no_safeguarding_lead_contact(self):
        data = _run_staff_ask(self._QUERY)
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "safeguarding lead" not in routes_text

    def test_fire_query_contact_routes_include_registered_manager(self):
        data = _run_staff_ask(self._QUERY)
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "registered manager" in routes_text

    def test_fire_query_contact_routes_include_emergency_services(self):
        data = _run_staff_ask(self._QUERY)
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "999" in routes_text

    def test_blocked_fire_exit_no_local_authority_safeguarding_team(self):
        data = _run_staff_ask("What should staff do if there is a blocked fire exit?")
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "local authority safeguarding" not in routes_text


# ---------------------------------------------------------------------------
# 4. Regression: head injury still classifies as accident_incident
# ---------------------------------------------------------------------------

class TestHeadInjuryRegression:
    """Head injury queries must still route to accident_incident (not fire_emergency)."""

    def test_fall_hits_head_classifies_as_accident_incident(self):
        topic = _classify_escalation_topic(
            "What should staff do if someone falls and hits their head?"
        )
        assert topic == "accident_incident"

    def test_head_injury_classifies_as_accident_incident(self):
        topic = _classify_escalation_topic(
            "What should staff do if someone has a head injury?"
        )
        assert topic == "accident_incident"

    def test_fall_accident_incident_not_fire_emergency(self):
        topic = _classify_escalation_topic("A resident had a fall — what do I do?")
        assert topic == "accident_incident"

    def test_head_injury_staff_ask_requires_escalation(self):
        data = _run_staff_ask("What should staff do if someone falls and hits their head?")
        assert data["requires_escalation"] is True

    def test_head_injury_staff_ask_not_allowed_to_answer(self):
        data = _run_staff_ask("What should staff do if someone falls and hits their head?")
        assert data["allowed_to_answer"] is False


# ---------------------------------------------------------------------------
# 5. Regression: genuine safeguarding queries still route to safeguarding
# ---------------------------------------------------------------------------

class TestSafeguardingRegression:
    """Real safeguarding keywords must still classify as safeguarding."""

    def test_abuse_classifies_as_safeguarding(self):
        assert (
            _classify_escalation_topic("A service user disclosed they are being abused")
            == "safeguarding"
        )

    def test_neglect_classifies_as_safeguarding(self):
        assert (
            _classify_escalation_topic("I think a vulnerable adult is being neglected")
            == "safeguarding"
        )

    def test_safeguarding_referral_classifies_as_safeguarding(self):
        assert (
            _classify_escalation_topic(
                "Should staff make a safeguarding referral if someone says they are being neglected?"
            )
            == "safeguarding"
        )

    def test_harm_classifies_as_safeguarding(self):
        assert (
            _classify_escalation_topic("A service user may be at risk of harm")
            == "safeguarding"
        )

    def test_safeguarding_staff_ask_says_safeguarding_concern(self):
        data = _run_staff_ask("A service user disclosed they are being abused.")
        assert "safeguarding" in data["answer"].lower()

    def test_safeguarding_contact_routes_include_safeguarding_lead(self):
        data = _run_staff_ask("I think a vulnerable adult is being neglected.")
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "safeguarding lead" in routes_text

    def test_safeguarding_contact_routes_include_local_authority(self):
        data = _run_staff_ask("I think a vulnerable adult is being neglected.")
        routes_text = " ".join(data.get("contact_routes", [])).lower()
        assert "local authority" in routes_text


# ---------------------------------------------------------------------------
# 6. Regression: admin answer-debug fire safety_note unchanged
# ---------------------------------------------------------------------------

class TestFireAnswerDebugSafetyNoteRegression:
    """_classify_focused_safety_note still returns _FIRE_EXIT_SAFETY_NOTE for fire queries."""

    def test_fire_incident_focused_safety_note_unchanged(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a fire incident or blocked fire exit?"
        )
        assert note == _FIRE_EXIT_SAFETY_NOTE

    def test_blocked_fire_exit_focused_safety_note_unchanged(self):
        note = _classify_focused_safety_note(
            "What should staff do if there is a blocked fire exit?"
        )
        assert note == _FIRE_EXIT_SAFETY_NOTE

    def test_answer_debug_fire_query_returns_fire_safety_note(self):
        resp = _run_answer_debug(
            "What should staff do if there is a fire incident or blocked fire exit?"
        )
        assert resp.get("safety_note") == _FIRE_EXIT_SAFETY_NOTE

    def test_answer_debug_fire_query_note_says_procedure_first(self):
        resp = _run_answer_debug(
            "What should staff do if there is a blocked fire exit?"
        )
        assert "procedure" in resp.get("safety_note", "").lower()

    def test_answer_debug_fire_query_note_says_not_a_substitute(self):
        resp = _run_answer_debug(
            "What should staff do if there is a fire incident?"
        )
        assert "not a substitute" in resp.get("safety_note", "")


# ---------------------------------------------------------------------------
# 7. _TOPIC_RESPONSE completeness check
# ---------------------------------------------------------------------------

class TestFireTopicResponseConfig:
    """fire_emergency entry in _TOPIC_RESPONSE has required fields."""

    def test_fire_emergency_in_topic_response(self):
        assert "fire_emergency" in _TOPIC_RESPONSE

    def test_fire_emergency_answer_not_empty(self):
        assert _TOPIC_RESPONSE["fire_emergency"]["answer"]

    def test_fire_emergency_answer_mentions_procedure(self):
        assert "procedure" in _TOPIC_RESPONSE["fire_emergency"]["answer"].lower()

    def test_fire_emergency_answer_mentions_999(self):
        assert "999" in _TOPIC_RESPONSE["fire_emergency"]["answer"]

    def test_fire_emergency_answer_mentions_not_a_substitute(self):
        assert "not a substitute" in _TOPIC_RESPONSE["fire_emergency"]["answer"].lower()

    def test_fire_emergency_answer_mentions_registered_manager(self):
        assert "registered manager" in _TOPIC_RESPONSE["fire_emergency"]["answer"].lower()

    def test_fire_emergency_answer_does_not_say_safeguarding_concern(self):
        assert "safeguarding concern" not in _TOPIC_RESPONSE["fire_emergency"]["answer"].lower()

    def test_fire_emergency_contact_routes_no_local_authority_safeguarding(self):
        routes_text = " ".join(_TOPIC_RESPONSE["fire_emergency"]["contact_routes"]).lower()
        assert "local authority safeguarding" not in routes_text

    def test_fire_emergency_risk_category_is_vertical_sensitive(self):
        assert _TOPIC_RESPONSE["fire_emergency"]["risk_category"] == "vertical_sensitive"

    def test_fire_emergency_vertical_subcategory(self):
        assert _TOPIC_RESPONSE["fire_emergency"]["vertical_subcategory"] == "fire_emergency"
