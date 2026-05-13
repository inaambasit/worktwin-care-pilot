"""
4S.96L/4S.96N — answer-debug specialist policy area hardening and ordering tests.

Verifies that /documents/answer-debug does not call _generate_source_grounded_answer
and returns insufficient_sources when a high-risk query requires a specialist policy
area that is absent from the filtered approved source set.

Also verifies:
- The unsafe model answer is not present in the blocked response.
- A positive control: a high-risk query may proceed when the matching specialist
  policy area is present in the filtered source metadata.
- Updated _TOPIC_PATTERNS short-circuit bullying/harassment/discrimination (hr)
  and confidentiality queries on staff /ask, including "sharing information" phrasing.
- Specialist rows are placed first when building answer context (4S.96N ordering).
"""
import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch, call

import pytest
from fastapi.testclient import TestClient

from app.main import (
    app,
    _require_admin,
    _required_specialist_area,
    _source_set_covers_specialist_area,
    _reorder_rows_specialist_first,
    _classify_escalation_topic,
)

client = TestClient(app)

_ORG = "thumhara-centre"
_UNSAFE_ANSWER = "Yes, staff should make a safeguarding referral if someone says they are being neglected."

# ---------------------------------------------------------------------------
# Shared RPC / governance helpers
# ---------------------------------------------------------------------------

def _rpc_with_title(document_id: str, document_title: str, category: str = "general"):
    """RPC mock returning one chunk from a named document."""
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
            "similarity": 0.85,
            "chunk_text": "Some policy text.",
        }
    ]
    return m


def _governance_approving(document_id: str):
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


def _call_answer_debug(
    query: str,
    rpc_mock,
    governance_map: dict,
    generate_mock: MagicMock,
):
    """Run POST /documents/answer-debug with standard patches."""
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
        stack.enter_context(
            patch("app.main._get_document_governance_batch", return_value=governance_map)
        )
        stack.enter_context(
            patch("app.main._generate_source_grounded_answer", generate_mock)
        )
        return client.post("/documents/answer-debug", json=payload)


# ---------------------------------------------------------------------------
# Unit tests: _required_specialist_area
# ---------------------------------------------------------------------------

class TestRequiredSpecialistArea:
    def test_safeguarding_neglect(self):
        q = "Should staff make a safeguarding referral if someone says they are being neglected?"
        assert _required_specialist_area(q) == "safeguarding"

    def test_safeguarding_abuse(self):
        assert _required_specialist_area("What counts as abuse of a service user?") == "safeguarding"

    def test_medication_refused(self):
        assert _required_specialist_area("What should staff do if a person refuses their medication?") == "medication"

    def test_accident_fall(self):
        assert _required_specialist_area("What should staff do after a fall or accident at Thumhara Centre?") == "accident_incident"

    def test_accident_keyword(self):
        assert _required_specialist_area("There has been an accident — what do I do?") == "accident_incident"

    def test_confidentiality_data(self):
        assert _required_specialist_area(
            "Can staff share confidential information with a family member if they ask for it?"
        ) == "confidentiality_data"

    def test_hr_bullying(self):
        assert _required_specialist_area(
            "What should staff do if they are being bullied by another staff member?"
        ) == "hr_raising_concerns"

    def test_sharing_information_external_professional(self):
        assert _required_specialist_area(
            "What should staff check before sharing information with an external professional?"
        ) == "confidentiality_data"

    def test_visitor_policy_query_not_specialist(self):
        assert _required_specialist_area("How does a visitor sign in?") is None

    def test_mobile_phone_query_not_specialist(self):
        assert _required_specialist_area("Can staff use their mobile phone during a shift?") is None


# ---------------------------------------------------------------------------
# Unit tests: _source_set_covers_specialist_area
# ---------------------------------------------------------------------------

class TestSourceSetCoversSpecialistArea:
    def _visitor_row(self):
        return [{"document_title": "Visitor Sign-In and Identification Policy", "category": "visitor management"}]

    def _safeguarding_row(self):
        return [{"document_title": "Safeguarding Adults Awareness and Escalation Policy", "category": "safeguarding"}]

    def _accident_row(self):
        return [{"document_title": "Accident and Incident Reporting Policy", "category": "incident reporting"}]

    def _confidentiality_row(self):
        return [{"document_title": "Confidentiality and Information Handling Policy", "category": "data protection"}]

    def test_visitor_does_not_cover_safeguarding(self):
        assert _source_set_covers_specialist_area(self._visitor_row(), "safeguarding") is False

    def test_visitor_does_not_cover_accident_incident(self):
        assert _source_set_covers_specialist_area(self._visitor_row(), "accident_incident") is False

    def test_visitor_does_not_cover_confidentiality_data(self):
        assert _source_set_covers_specialist_area(self._visitor_row(), "confidentiality_data") is False

    def test_safeguarding_policy_covers_safeguarding(self):
        assert _source_set_covers_specialist_area(self._safeguarding_row(), "safeguarding") is True

    def test_accident_policy_covers_accident_incident(self):
        assert _source_set_covers_specialist_area(self._accident_row(), "accident_incident") is True

    def test_confidentiality_policy_covers_confidentiality_data(self):
        assert _source_set_covers_specialist_area(self._confidentiality_row(), "confidentiality_data") is True

    def test_category_match_is_sufficient(self):
        rows = [{"document_title": "Operational Procedures", "category": "safeguarding"}]
        assert _source_set_covers_specialist_area(rows, "safeguarding") is True

    def test_unknown_area_returns_true(self):
        assert _source_set_covers_specialist_area(self._visitor_row(), "unknown_area_xyz") is True


# ---------------------------------------------------------------------------
# Integration tests: blocked cases — model not called, insufficient_sources returned
# ---------------------------------------------------------------------------

class TestSafeguardingNeglectBlocked:
    """Safeguarding query + visitor-only approved corpus → blocked before model."""

    _QUERY = "Should staff make a safeguarding referral if someone says they are being neglected?"
    _DOC_ID = "doc-visitor-001"

    def _run(self):
        gen = MagicMock(return_value={"answer": _UNSAFE_ANSWER})
        resp = _call_answer_debug(
            self._QUERY,
            rpc_mock=_rpc_with_title(self._DOC_ID, "Visitor Sign-In and Identification Policy", "visitor management"),
            governance_map=_governance_approving(self._DOC_ID),
            generate_mock=gen,
        )
        return resp, gen

    def test_status_200(self):
        resp, _ = self._run()
        assert resp.status_code == 200

    def test_confidence_is_insufficient_sources(self):
        resp, _ = self._run()
        assert resp.json()["confidence"] == "insufficient_sources"

    def test_generate_not_called(self):
        _, gen = self._run()
        gen.assert_not_called()

    def test_unsafe_answer_not_in_response(self):
        resp, _ = self._run()
        assert _UNSAFE_ANSWER not in resp.text

    def test_sources_empty(self):
        resp, _ = self._run()
        assert resp.json()["sources"] == []

    def test_safety_note_present(self):
        resp, _ = self._run()
        assert resp.json()["safety_note"] is not None


class TestAccidentFallBlocked:
    """Accident/fall query + visitor-only approved corpus → blocked before model."""

    _QUERY = "What should staff do after a fall or accident at Thumhara Centre?"
    _DOC_ID = "doc-visitor-001"
    _UNSAFE_ACCIDENT_ANSWER = "After a fall or accident, staff should not manage the situation alone."

    def _run(self):
        gen = MagicMock(return_value={"answer": self._UNSAFE_ACCIDENT_ANSWER})
        resp = _call_answer_debug(
            self._QUERY,
            rpc_mock=_rpc_with_title(self._DOC_ID, "Visitor Sign-In and Identification Policy", "visitor management"),
            governance_map=_governance_approving(self._DOC_ID),
            generate_mock=gen,
        )
        return resp, gen

    def test_status_200(self):
        resp, _ = self._run()
        assert resp.status_code == 200

    def test_confidence_is_insufficient_sources(self):
        resp, _ = self._run()
        assert resp.json()["confidence"] == "insufficient_sources"

    def test_generate_not_called(self):
        _, gen = self._run()
        gen.assert_not_called()

    def test_unsafe_answer_not_in_response(self):
        resp, _ = self._run()
        assert self._UNSAFE_ACCIDENT_ANSWER not in resp.text

    def test_sources_empty(self):
        resp, _ = self._run()
        assert resp.json()["sources"] == []


class TestConfidentialInfoFamilyBlocked:
    """Confidentiality query + visitor-only approved corpus → blocked before model."""

    _QUERY = "Can staff share confidential information with a family member if they ask for it?"
    _DOC_ID = "doc-visitor-001"
    _UNSAFE_CONF_ANSWER = "Staff must not share confidential information with family members."

    def _run(self):
        gen = MagicMock(return_value={"answer": self._UNSAFE_CONF_ANSWER})
        resp = _call_answer_debug(
            self._QUERY,
            rpc_mock=_rpc_with_title(self._DOC_ID, "Visitor Sign-In and Identification Policy", "visitor management"),
            governance_map=_governance_approving(self._DOC_ID),
            generate_mock=gen,
        )
        return resp, gen

    def test_status_200(self):
        resp, _ = self._run()
        assert resp.status_code == 200

    def test_confidence_is_insufficient_sources(self):
        resp, _ = self._run()
        assert resp.json()["confidence"] == "insufficient_sources"

    def test_generate_not_called(self):
        _, gen = self._run()
        gen.assert_not_called()

    def test_unsafe_answer_not_in_response(self):
        resp, _ = self._run()
        assert self._UNSAFE_CONF_ANSWER not in resp.text

    def test_sources_empty(self):
        resp, _ = self._run()
        assert resp.json()["sources"] == []


# ---------------------------------------------------------------------------
# Integration test: positive control — matching specialist source present
# ---------------------------------------------------------------------------

class TestSafeguardingQueryWithSafeguardingSource:
    """Safeguarding query + safeguarding policy in corpus → model is called (positive control)."""

    _QUERY = "Should staff make a safeguarding referral if someone says they are being neglected?"
    _DOC_ID = "doc-safeguarding-001"
    _EXPECTED_ANSWER = "Refer to your safeguarding lead immediately."

    def _run(self):
        gen = MagicMock(return_value={"answer": self._EXPECTED_ANSWER})
        with ExitStack() as stack:
            for p in _BASE_PATCHES:
                stack.enter_context(p)
            stack.enter_context(
                patch(
                    "httpx.post",
                    return_value=_rpc_with_title(
                        self._DOC_ID,
                        "Safeguarding Adults Awareness and Escalation Policy",
                        "safeguarding",
                    ),
                )
            )
            stack.enter_context(
                patch(
                    "app.main._get_document_governance_batch",
                    return_value=_governance_approving(self._DOC_ID),
                )
            )
            stack.enter_context(
                patch("app.main._generate_source_grounded_answer", gen)
            )
            stack.enter_context(
                patch(
                    "app.main._normalise_search_result",
                    return_value={
                        "document_id": self._DOC_ID,
                        "document_title": "Safeguarding Adults Awareness and Escalation Policy",
                        "category": "safeguarding",
                        "chunk_index": 0,
                        "similarity": 0.91,
                        "chunk_preview": "Safeguarding policy text.",
                        "access_roles": [],
                        "vertical": "care",
                        "approved_for_ai_answers": True,
                        "escalation_required": False,
                        "is_sensitive": False,
                    },
                )
            )
            stack.enter_context(
                patch(
                    "app.main._build_source_context",
                    return_value=("context", [{"document_title": "Safeguarding Adults Awareness and Escalation Policy", "source_label": "[Source 1]"}]),
                )
            )
            stack.enter_context(
                patch("app.main._format_source_citations", return_value="[Source 1]")
            )
            stack.enter_context(
                patch("app.main._validate_grounded_answer_result", return_value="source_grounded")
            )
            resp = client.post(
                "/documents/answer-debug",
                json={
                    "query": self._QUERY,
                    "organisation_id": _ORG,
                    "match_count": 5,
                    "allow_dummy_override": False,
                },
            )
        return resp, gen

    def test_status_200(self):
        resp, _ = self._run()
        assert resp.status_code == 200

    def test_generate_was_called(self):
        _, gen = self._run()
        gen.assert_called_once()

    def test_confidence_source_grounded(self):
        resp, _ = self._run()
        assert resp.json()["confidence"] == "source_grounded"


# ---------------------------------------------------------------------------
# _TOPIC_PATTERNS improvements — staff /ask short-circuit
# ---------------------------------------------------------------------------

class TestTopicPatternsImprovements:
    def test_bullying_classified_as_hr(self):
        assert _classify_escalation_topic("What should I do if I am being bullied?") == "hr"

    def test_harassment_classified_as_hr(self):
        assert _classify_escalation_topic("I am experiencing harassment from a colleague.") == "hr"

    def test_discrimination_classified_as_hr(self):
        assert _classify_escalation_topic("I think I am being discriminated against because of my religion.") == "hr"

    def test_confidential_information_classified_as_legal(self):
        assert _classify_escalation_topic(
            "Can staff share confidential information with a family member?"
        ) == "legal"

    def test_confidentiality_classified_as_legal(self):
        assert _classify_escalation_topic("What are our confidentiality obligations?") == "legal"

    def test_information_sharing_classified_as_legal(self):
        assert _classify_escalation_topic("When can we share information with outside organisations?") == "legal"

    def test_sharing_information_classified_as_legal(self):
        assert _classify_escalation_topic(
            "What should staff check before sharing information with an external professional?"
        ) == "legal"

    def test_visitor_query_not_classified(self):
        assert _classify_escalation_topic("How does a visitor sign in to Thumhara Centre?") is None

    def test_mobile_phone_query_not_classified(self):
        assert _classify_escalation_topic("Can staff use their mobile phone during a shift?") is None


# ---------------------------------------------------------------------------
# Unit tests: _reorder_rows_specialist_first — 4S.96N
# ---------------------------------------------------------------------------

class TestReorderRowsSpecialistFirst:
    def _conf_row(self):
        return {"document_title": "Confidentiality and Information Handling Policy", "category": "data protection"}

    def _visitor_row(self):
        return {"document_title": "Visitor Sign-In and Identification Policy", "category": "visitor management"}

    def _safeguarding_row(self):
        return {"document_title": "Safeguarding Adults Awareness and Escalation Policy", "category": "safeguarding"}

    def test_confidentiality_row_moved_to_front(self):
        rows = [self._visitor_row(), self._conf_row()]
        result = _reorder_rows_specialist_first(rows, "confidentiality_data")
        assert result[0]["document_title"] == "Confidentiality and Information Handling Policy"

    def test_non_specialist_row_preserved_at_back(self):
        rows = [self._visitor_row(), self._conf_row()]
        result = _reorder_rows_specialist_first(rows, "confidentiality_data")
        assert len(result) == 2
        assert result[1]["document_title"] == "Visitor Sign-In and Identification Policy"

    def test_safeguarding_row_moved_to_front(self):
        rows = [self._visitor_row(), self._safeguarding_row()]
        result = _reorder_rows_specialist_first(rows, "safeguarding")
        assert result[0]["document_title"] == "Safeguarding Adults Awareness and Escalation Policy"

    def test_none_area_returns_original_order(self):
        rows = [self._visitor_row(), self._conf_row()]
        result = _reorder_rows_specialist_first(rows, None)
        assert result[0]["document_title"] == "Visitor Sign-In and Identification Policy"

    def test_unknown_area_returns_original_order(self):
        rows = [self._visitor_row()]
        result = _reorder_rows_specialist_first(rows, "unknown_area_xyz")
        assert result == rows

    def test_all_specialist_rows_preserved(self):
        rows = [self._conf_row(), self._conf_row()]
        result = _reorder_rows_specialist_first(rows, "confidentiality_data")
        assert len(result) == 2

    def test_category_match_is_sufficient(self):
        rows = [
            {"document_title": "Operational Procedures", "category": "data protection"},
            self._visitor_row(),
        ]
        result = _reorder_rows_specialist_first(rows, "confidentiality_data")
        assert result[0]["document_title"] == "Operational Procedures"


# ---------------------------------------------------------------------------
# Integration test: source ordering — specialist rows first in answer context
# ---------------------------------------------------------------------------

class TestAnswerDebugSourceOrdering:
    """Confidentiality specialist rows must be placed first in answer context."""

    _QUERY = "Can staff share information with an external professional?"
    _CONF_DOC_ID = "doc-confidentiality-001"
    _VISITOR_DOC_ID = "doc-visitor-001"

    def _make_rpc_two_docs(self):
        m = MagicMock()
        m.status_code = 200
        m.json.return_value = [
            # Visitor row is listed first by the RPC (higher raw similarity)
            {
                "document_id": self._VISITOR_DOC_ID,
                "chunk_id": f"{self._VISITOR_DOC_ID}-chunk-0",
                "chunk_index": 0,
                "document_title": "Visitor Sign-In and Identification Policy",
                "category": "visitor management",
                "approved_for_ai_answers": True,
                "escalation_required": False,
                "is_sensitive": False,
                "similarity": 0.90,
                "chunk_text": "Visitor policy text.",
            },
            # Confidentiality row second — should be promoted to first
            {
                "document_id": self._CONF_DOC_ID,
                "chunk_id": f"{self._CONF_DOC_ID}-chunk-0",
                "chunk_index": 0,
                "document_title": "Confidentiality and Information Handling Policy",
                "category": "data protection",
                "approved_for_ai_answers": True,
                "escalation_required": False,
                "is_sensitive": False,
                "similarity": 0.85,
                "chunk_text": "Confidentiality policy text.",
            },
        ]
        return m

    def _run(self):
        gov_map = {
            **_governance_approving(self._VISITOR_DOC_ID),
            **_governance_approving(self._CONF_DOC_ID),
        }
        build_context = MagicMock(return_value=("context", []))
        gen = MagicMock(return_value={"answer": "Answer."})
        with ExitStack() as stack:
            for p in _BASE_PATCHES:
                stack.enter_context(p)
            stack.enter_context(patch("httpx.post", return_value=self._make_rpc_two_docs()))
            stack.enter_context(patch("app.main._get_document_governance_batch", return_value=gov_map))
            stack.enter_context(patch("app.main._generate_source_grounded_answer", gen))
            stack.enter_context(patch("app.main._build_source_context", build_context))
            stack.enter_context(patch("app.main._format_source_citations", return_value=""))
            stack.enter_context(patch("app.main._validate_grounded_answer_result", return_value="source_grounded"))
            # Identity normaliser preserves document_title so we can inspect order
            stack.enter_context(patch("app.main._normalise_search_result", side_effect=lambda r: r))
            client.post("/documents/answer-debug", json={
                "query": self._QUERY,
                "organisation_id": _ORG,
                "match_count": 5,
                "allow_dummy_override": False,
            })
        return build_context

    def test_confidentiality_row_first_in_context(self):
        build_context = self._run()
        chunks = build_context.call_args[0][0]
        assert chunks[0]["document_title"] == "Confidentiality and Information Handling Policy"

    def test_visitor_row_still_included_in_context(self):
        build_context = self._run()
        chunks = build_context.call_args[0][0]
        titles = [c["document_title"] for c in chunks]
        assert "Visitor Sign-In and Identification Policy" in titles
