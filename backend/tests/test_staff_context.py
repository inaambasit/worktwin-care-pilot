from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.membership import StaffContext
from app.staff_context import staff_context_from_header

_FAKE_PAYLOAD = {"sub": "user-abc123", "role": "authenticated"}
_FAKE_CONTEXT = StaffContext(user_id="user-abc123", organisation_id="org-xyz", role="staff")


# ---------------------------------------------------------------------------
# Missing / malformed Authorization header
# ---------------------------------------------------------------------------

def test_none_header_raises_401():
    with pytest.raises(HTTPException) as exc:
        staff_context_from_header(None)
    assert exc.value.status_code == 401


def test_empty_header_raises_401():
    with pytest.raises(HTTPException) as exc:
        staff_context_from_header("")
    assert exc.value.status_code == 401


def test_non_bearer_scheme_raises_401():
    with pytest.raises(HTTPException) as exc:
        staff_context_from_header("Basic dXNlcjpwYXNz")
    assert exc.value.status_code == 401


def test_token_scheme_only_raises_401():
    with pytest.raises(HTTPException) as exc:
        staff_context_from_header("Token abc123")
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Empty bearer token
# ---------------------------------------------------------------------------

def test_bearer_with_no_token_raises_401():
    with pytest.raises(HTTPException) as exc:
        staff_context_from_header("Bearer ")
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Valid path
# ---------------------------------------------------------------------------

def test_valid_header_calls_jwt_then_membership_and_returns_context():
    with patch("app.staff_context.validate_staff_jwt", return_value=_FAKE_PAYLOAD) as mock_jwt, \
         patch("app.staff_context.resolve_staff_context", return_value=_FAKE_CONTEXT) as mock_ctx:
        result = staff_context_from_header("Bearer some.jwt.token")

    mock_jwt.assert_called_once_with("some.jwt.token")
    mock_ctx.assert_called_once_with(_FAKE_PAYLOAD)
    assert result is _FAKE_CONTEXT


def test_returned_value_is_staff_context():
    with patch("app.staff_context.validate_staff_jwt", return_value=_FAKE_PAYLOAD), \
         patch("app.staff_context.resolve_staff_context", return_value=_FAKE_CONTEXT):
        result = staff_context_from_header("Bearer some.jwt.token")

    assert isinstance(result, StaffContext)
    assert result.user_id == "user-abc123"
    assert result.organisation_id == "org-xyz"
    assert result.role == "staff"


# ---------------------------------------------------------------------------
# JWT errors pass through unchanged
# ---------------------------------------------------------------------------

def test_jwt_401_propagates():
    err = HTTPException(status_code=401, detail="Token expired.")
    with patch("app.staff_context.validate_staff_jwt", side_effect=err):
        with pytest.raises(HTTPException) as exc:
            staff_context_from_header("Bearer some.jwt.token")
    assert exc.value.status_code == 401
    assert exc.value.detail == "Token expired."


def test_jwt_503_propagates():
    err = HTTPException(status_code=503, detail="Staff auth not configured.")
    with patch("app.staff_context.validate_staff_jwt", side_effect=err):
        with pytest.raises(HTTPException) as exc:
            staff_context_from_header("Bearer some.jwt.token")
    assert exc.value.status_code == 503
    assert exc.value.detail == "Staff auth not configured."


# ---------------------------------------------------------------------------
# Membership errors pass through unchanged
# ---------------------------------------------------------------------------

def test_membership_401_propagates():
    err = HTTPException(status_code=401, detail="No membership found.")
    with patch("app.staff_context.validate_staff_jwt", return_value=_FAKE_PAYLOAD), \
         patch("app.staff_context.resolve_staff_context", side_effect=err):
        with pytest.raises(HTTPException) as exc:
            staff_context_from_header("Bearer some.jwt.token")
    assert exc.value.status_code == 401
    assert exc.value.detail == "No membership found."


def test_membership_403_propagates():
    err = HTTPException(status_code=403, detail="Membership is not active.")
    with patch("app.staff_context.validate_staff_jwt", return_value=_FAKE_PAYLOAD), \
         patch("app.staff_context.resolve_staff_context", side_effect=err):
        with pytest.raises(HTTPException) as exc:
            staff_context_from_header("Bearer some.jwt.token")
    assert exc.value.status_code == 403
    assert exc.value.detail == "Membership is not active."
