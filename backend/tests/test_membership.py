from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException

from app.membership import StaffContext, resolve_staff_context, _fetch_membership

_VALID_ROW = {
    "user_id": "user-abc123",
    "organisation_id": "org-xyz",
    "role": "staff",
    "active": True,
}


def _payload(sub: str = "user-abc123") -> dict:
    return {"sub": sub, "role": "authenticated"}


# ---------------------------------------------------------------------------
# Missing sub claim
# ---------------------------------------------------------------------------

def test_missing_sub_raises_401():
    with pytest.raises(HTTPException) as exc:
        resolve_staff_context({})
    assert exc.value.status_code == 401


def test_none_sub_raises_401():
    with pytest.raises(HTTPException) as exc:
        resolve_staff_context({"sub": None})
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# No membership row
# ---------------------------------------------------------------------------

def test_no_membership_row_raises_401():
    with patch("app.membership._fetch_membership", return_value=None):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Inactive membership
# ---------------------------------------------------------------------------

def test_inactive_membership_raises_403():
    row = {**_VALID_ROW, "active": False}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


def test_suspended_membership_raises_403():
    row = {**_VALID_ROW, "active": False}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# Missing organisation_id
# ---------------------------------------------------------------------------

def test_null_org_id_raises_403():
    row = {**_VALID_ROW, "organisation_id": None}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


def test_empty_org_id_raises_403():
    row = {**_VALID_ROW, "organisation_id": ""}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# Missing role
# ---------------------------------------------------------------------------

def test_null_role_raises_403():
    row = {**_VALID_ROW, "role": None}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


def test_empty_role_raises_403():
    row = {**_VALID_ROW, "role": ""}
    with patch("app.membership._fetch_membership", return_value=row):
        with pytest.raises(HTTPException) as exc:
            resolve_staff_context(_payload())
    assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# Valid active membership
# ---------------------------------------------------------------------------

def test_valid_membership_returns_staff_context():
    with patch("app.membership._fetch_membership", return_value=_VALID_ROW):
        ctx = resolve_staff_context(_payload())
    assert isinstance(ctx, StaffContext)
    assert ctx.user_id == "user-abc123"
    assert ctx.organisation_id == "org-xyz"
    assert ctx.role == "staff"


def test_role_comes_from_row_not_jwt():
    """JWT carries role='authenticated'; row has role='manager' -- row must win."""
    row = {**_VALID_ROW, "role": "manager"}
    with patch("app.membership._fetch_membership", return_value=row):
        ctx = resolve_staff_context({"sub": "user-abc123", "role": "authenticated"})
    assert ctx.role == "manager"


def test_org_id_comes_from_row_not_jwt():
    """JWT may carry an organisation_id claim; the row value is authoritative."""
    row = {**_VALID_ROW, "organisation_id": "org-real"}
    with patch("app.membership._fetch_membership", return_value=row):
        ctx = resolve_staff_context({"sub": "user-abc123", "organisation_id": "org-fake"})
    assert ctx.organisation_id == "org-real"


# ---------------------------------------------------------------------------
# _fetch_membership fail-safe behaviour (4S.108C)
# External dependency failures must convert to a controlled HTTPException(503),
# never a raw exception (which would surface as a 500) and never an open grant.
# ---------------------------------------------------------------------------

def _set_membership_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")


def test_membership_missing_config_raises_503(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(HTTPException) as exc:
        _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_network_failure_raises_503(monkeypatch):
    _set_membership_env(monkeypatch)
    with patch("app.membership.httpx.get", side_effect=httpx.ConnectError("network down")):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_timeout_raises_503(monkeypatch):
    _set_membership_env(monkeypatch)
    with patch("app.membership.httpx.get", side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_postgrest_500_raises_503(monkeypatch):
    _set_membership_env(monkeypatch)
    mock_resp = MagicMock()
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        "500 Server Error", request=MagicMock(), response=MagicMock()
    )
    with patch("app.membership.httpx.get", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_malformed_json_raises_503(monkeypatch):
    _set_membership_env(monkeypatch)
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.side_effect = ValueError("not json")
    with patch("app.membership.httpx.get", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_non_list_response_raises_503(monkeypatch):
    _set_membership_env(monkeypatch)
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = {"unexpected": "dict"}  # not a list
    with patch("app.membership.httpx.get", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    assert exc.value.status_code == 503


def test_membership_failure_detail_has_no_secrets(monkeypatch):
    _set_membership_env(monkeypatch)
    with patch("app.membership.httpx.get", side_effect=httpx.ConnectError("network down")):
        with pytest.raises(HTTPException) as exc:
            _fetch_membership("user-abc123")
    detail = str(exc.value.detail)
    assert "test-service-key" not in detail
    assert "example.supabase.co" not in detail
    assert "user-abc123" not in detail


def test_membership_empty_rows_returns_none(monkeypatch):
    _set_membership_env(monkeypatch)
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = []
    with patch("app.membership.httpx.get", return_value=mock_resp):
        result = _fetch_membership("user-abc123")
    assert result is None


def test_membership_valid_row_returned(monkeypatch):
    _set_membership_env(monkeypatch)
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = [_VALID_ROW]
    with patch("app.membership.httpx.get", return_value=mock_resp):
        result = _fetch_membership("user-abc123")
    assert result == _VALID_ROW
