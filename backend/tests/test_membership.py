from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.membership import StaffContext, resolve_staff_context

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
