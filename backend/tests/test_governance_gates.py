"""
Task 4S.90A — Governance gate unit tests (test-only slice).

Gate functions under test (imported directly from app.main):
  _can_embed_document(document, allow_dummy_override=False)
  _can_use_document_for_answer_debug(document, allow_dummy_override=False)
  _can_show_document_to_staff(document)
  _can_use_document_for_staff_ask(document, user_role)

All tests use plain dicts — no DB, no HTTP.
"""
import pytest

from app.main import (
    _can_embed_document,
    _can_use_document_for_answer_debug,
    _can_show_document_to_staff,
    _can_use_document_for_staff_ask,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fully_approved_doc(**overrides):
    """Return a document dict that passes ALL four gate functions for _ALLOWED_ROLE."""
    doc = {
        "is_sensitive": False,
        "escalation_required": False,
        "real_document": True,
        "dummy_document": False,
        "status": "approved",
        "approved_for_embedding": True,
        "approved_for_source_grounded_answers": True,
        "approved_for_staff_visibility": True,
        "governance_reviewed_by": "test-reviewer",
        "governance_reviewed_at": "2025-01-01T00:00:00Z",
        "embedding_status": "indexed",
        "access_roles": ["Care Worker"],
    }
    doc.update(overrides)
    return doc


_ALLOWED_ROLE = "Care Worker"
_DISALLOWED_ROLE = "Kitchen Staff"


# ---------------------------------------------------------------------------
# 1. Embedding approval is separate from answer-debug approval
# ---------------------------------------------------------------------------

class TestEmbeddingGateSeparateFromAnswerDebug:
    """A document can pass the embedding gate without passing the answer-debug gate."""

    def test_embed_only_approved_passes_embedding_gate(self):
        doc = _fully_approved_doc(approved_for_source_grounded_answers=False)
        ok, reason = _can_embed_document(doc)
        assert ok is True
        assert reason is None

    def test_embed_only_approved_fails_answer_debug_gate(self):
        doc = _fully_approved_doc(approved_for_source_grounded_answers=False)
        ok, reason = _can_use_document_for_answer_debug(doc)
        assert ok is False
        assert reason is not None

    def test_embed_only_approved_fails_staff_ask_gate(self):
        doc = _fully_approved_doc(approved_for_source_grounded_answers=False)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None


# ---------------------------------------------------------------------------
# 2. Answer-debug approval is separate from staff visibility
# ---------------------------------------------------------------------------

class TestAnswerDebugGateSeparateFromStaffVisibility:
    """A document can pass the answer-debug gate without passing the staff visibility gate."""

    def test_answer_debug_approved_passes_answer_debug_gate(self):
        doc = _fully_approved_doc(approved_for_staff_visibility=False)
        ok, reason = _can_use_document_for_answer_debug(doc)
        assert ok is True
        assert reason is None

    def test_answer_debug_approved_fails_staff_visibility_gate(self):
        doc = _fully_approved_doc(approved_for_staff_visibility=False)
        ok, reason = _can_show_document_to_staff(doc)
        assert ok is False
        assert reason is not None

    def test_answer_debug_approved_fails_staff_ask_gate(self):
        doc = _fully_approved_doc(approved_for_staff_visibility=False)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None


# ---------------------------------------------------------------------------
# 3. Staff visibility is separate from staff Ask eligibility
# ---------------------------------------------------------------------------

class TestStaffVisibilitySeparateFromStaffAsk:
    """A document can pass the staff visibility gate without passing the staff Ask gate."""

    def test_staff_visible_missing_answer_approval_passes_visibility_gate(self):
        doc = _fully_approved_doc(approved_for_source_grounded_answers=False)
        ok, _ = _can_show_document_to_staff(doc)
        assert ok is True

    def test_staff_visible_missing_answer_approval_fails_staff_ask(self):
        doc = _fully_approved_doc(approved_for_source_grounded_answers=False)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert "approved_for_source_grounded_answers" in reason

    def test_staff_visible_not_indexed_passes_visibility_gate(self):
        doc = _fully_approved_doc(embedding_status="not_started")
        ok, _ = _can_show_document_to_staff(doc)
        assert ok is True

    def test_staff_visible_not_indexed_fails_staff_ask(self):
        doc = _fully_approved_doc(embedding_status="not_started")
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert "embedding_status" in reason

    def test_staff_visible_missing_reviewer_passes_visibility_gate(self):
        doc = _fully_approved_doc(governance_reviewed_by=None)
        ok, _ = _can_show_document_to_staff(doc)
        assert ok is True

    def test_staff_visible_missing_reviewer_fails_staff_ask(self):
        doc = _fully_approved_doc(governance_reviewed_by=None)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert "governance_reviewed_by" in reason

    def test_staff_visible_missing_review_timestamp_passes_visibility_gate(self):
        doc = _fully_approved_doc(governance_reviewed_at=None)
        ok, _ = _can_show_document_to_staff(doc)
        assert ok is True

    def test_staff_visible_missing_review_timestamp_fails_staff_ask(self):
        doc = _fully_approved_doc(governance_reviewed_at=None)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert "governance_reviewed_at" in reason


# ---------------------------------------------------------------------------
# 4. Sensitive documents are blocked from staff visibility and staff Ask
# ---------------------------------------------------------------------------

class TestSensitiveDocumentBlocked:

    def test_sensitive_doc_fails_staff_visibility(self):
        doc = _fully_approved_doc(is_sensitive=True)
        ok, reason = _can_show_document_to_staff(doc)
        assert ok is False
        assert reason is not None

    def test_sensitive_doc_fails_staff_ask(self):
        doc = _fully_approved_doc(is_sensitive=True)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None

    def test_sensitive_doc_fails_embedding_gate(self):
        doc = _fully_approved_doc(is_sensitive=True)
        ok, reason = _can_embed_document(doc)
        assert ok is False
        assert reason is not None

    def test_sensitive_doc_fails_answer_debug_gate(self):
        doc = _fully_approved_doc(is_sensitive=True)
        ok, reason = _can_use_document_for_answer_debug(doc)
        assert ok is False
        assert reason is not None


# ---------------------------------------------------------------------------
# 5. Escalation-required documents are blocked from staff visibility and staff Ask
# ---------------------------------------------------------------------------

class TestEscalationRequiredDocumentBlocked:

    def test_escalation_doc_fails_staff_visibility(self):
        doc = _fully_approved_doc(escalation_required=True)
        ok, reason = _can_show_document_to_staff(doc)
        assert ok is False
        assert reason is not None

    def test_escalation_doc_fails_staff_ask(self):
        doc = _fully_approved_doc(escalation_required=True)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None

    def test_escalation_doc_fails_embedding_gate(self):
        doc = _fully_approved_doc(escalation_required=True)
        ok, reason = _can_embed_document(doc)
        assert ok is False
        assert reason is not None

    def test_escalation_doc_fails_answer_debug_gate(self):
        doc = _fully_approved_doc(escalation_required=True)
        ok, reason = _can_use_document_for_answer_debug(doc)
        assert ok is False
        assert reason is not None


# ---------------------------------------------------------------------------
# 6. Dummy documents are blocked from staff visibility and staff Ask
# ---------------------------------------------------------------------------

class TestDummyDocumentBlocked:

    def test_dummy_doc_fails_staff_visibility(self):
        doc = _fully_approved_doc(real_document=False, dummy_document=True)
        ok, reason = _can_show_document_to_staff(doc)
        assert ok is False
        assert reason is not None

    def test_dummy_doc_fails_staff_ask(self):
        doc = _fully_approved_doc(real_document=False, dummy_document=True)
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None

    def test_dummy_doc_without_override_fails_embedding_gate(self):
        doc = _fully_approved_doc(real_document=False, dummy_document=True)
        ok, reason = _can_embed_document(doc)
        assert ok is False
        assert reason is not None

    def test_dummy_doc_with_override_passes_embedding_gate(self):
        # allow_dummy_override=True is the only way to embed dummy docs (admin test only)
        doc = _fully_approved_doc(real_document=False, dummy_document=True)
        ok, reason = _can_embed_document(doc, allow_dummy_override=True)
        assert ok is True
        assert reason is None

    def test_dummy_doc_without_override_fails_answer_debug_gate(self):
        doc = _fully_approved_doc(real_document=False, dummy_document=True)
        ok, reason = _can_use_document_for_answer_debug(doc)
        assert ok is False
        assert reason is not None


# ---------------------------------------------------------------------------
# 7. Staff Ask requires the strictest gate — fully approved document passes
# ---------------------------------------------------------------------------

class TestFullyApprovedDocumentPassesAllGates:

    def test_fully_approved_passes_embedding_gate(self):
        ok, reason = _can_embed_document(_fully_approved_doc())
        assert ok is True
        assert reason is None

    def test_fully_approved_passes_answer_debug_gate(self):
        ok, reason = _can_use_document_for_answer_debug(_fully_approved_doc())
        assert ok is True
        assert reason is None

    def test_fully_approved_passes_staff_visibility_gate(self):
        ok, reason = _can_show_document_to_staff(_fully_approved_doc())
        assert ok is True
        assert reason is None

    def test_fully_approved_passes_staff_ask_gate(self):
        ok, reason = _can_use_document_for_staff_ask(_fully_approved_doc(), _ALLOWED_ROLE)
        assert ok is True
        assert reason is None

    def test_fully_approved_all_staff_role_passes_staff_ask(self):
        doc = _fully_approved_doc(access_roles=["All Staff"])
        ok, reason = _can_use_document_for_staff_ask(doc, _DISALLOWED_ROLE)
        assert ok is True
        assert reason is None

    def test_draft_status_fails_staff_visibility_and_ask(self):
        doc = _fully_approved_doc(status="draft")
        ok_vis, _ = _can_show_document_to_staff(doc)
        assert ok_vis is False
        ok_ask, _ = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok_ask is False


# ---------------------------------------------------------------------------
# 8. Role / access_roles matching in staff Ask gate
# ---------------------------------------------------------------------------

class TestAccessRoleMatching:

    def test_allowed_role_passes_staff_ask_gate(self):
        doc = _fully_approved_doc(access_roles=[_ALLOWED_ROLE])
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is True
        assert reason is None

    def test_disallowed_role_fails_staff_ask_gate(self):
        doc = _fully_approved_doc(access_roles=[_ALLOWED_ROLE])
        ok, reason = _can_use_document_for_staff_ask(doc, _DISALLOWED_ROLE)
        assert ok is False
        assert _DISALLOWED_ROLE in reason

    def test_all_staff_in_access_roles_allows_any_user_role(self):
        doc = _fully_approved_doc(access_roles=["All Staff"])
        ok, reason = _can_use_document_for_staff_ask(doc, "Any Random Role")
        assert ok is True
        assert reason is None

    def test_empty_access_roles_fails_staff_ask(self):
        doc = _fully_approved_doc(access_roles=[])
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is False
        assert reason is not None

    def test_multiple_roles_second_role_passes(self):
        doc = _fully_approved_doc(access_roles=["Senior Carer", _ALLOWED_ROLE])
        ok, reason = _can_use_document_for_staff_ask(doc, _ALLOWED_ROLE)
        assert ok is True
        assert reason is None

    def test_multiple_roles_unlisted_role_fails(self):
        doc = _fully_approved_doc(access_roles=["Senior Carer", _ALLOWED_ROLE])
        ok, reason = _can_use_document_for_staff_ask(doc, _DISALLOWED_ROLE)
        assert ok is False
        assert reason is not None
