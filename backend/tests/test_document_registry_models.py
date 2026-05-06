"""
Tests for DocumentRecord / DocumentListResponse Pydantic models.
Covers the embedding_status values, including "partial" (4S.90A).
"""
import pytest
from app.main import DocumentRecord, DocumentListResponse

_BASE = {
    "id": "doc-001",
    "organisation_id": "org-001",
    "title": "Test Document",
    "category": "general",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
}


@pytest.mark.parametrize("status", [
    "not_started", "pending", "processing", "partial", "indexed", "failed"
])
def test_document_record_accepts_all_embedding_statuses(status):
    record = DocumentRecord(**{**_BASE, "embedding_status": status})
    assert record.embedding_status == status


def test_document_list_response_accepts_partial_embedding_status():
    record = DocumentRecord(**{**_BASE, "embedding_status": "partial"})
    response = DocumentListResponse(documents=[record], registry_source="database")
    assert response.documents[0].embedding_status == "partial"


def test_document_record_rejects_unknown_embedding_status():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        DocumentRecord(**{**_BASE, "embedding_status": "unknown_value"})
