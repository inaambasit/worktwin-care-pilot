from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.membership import StaffContext

client = TestClient(app)

_ORG_ADMIN_CTX = StaffContext(user_id="u-admin", organisation_id="demo-org", role="organisation_admin")
_DEV_ADMIN_CTX = StaffContext(user_id="u-dev", organisation_id="demo-org", role="worktwin_dev_admin")
_STAFF_CTX = StaffContext(user_id="u-staff", organisation_id="demo-org", role="staff")
_REG_MGR_CTX = StaffContext(user_id="u-mgr", organisation_id="demo-org", role="registered_manager")
_WRONG_ORG_CTX = StaffContext(user_id="u-admin2", organisation_id="other-org", role="organisation_admin")

_FORBIDDEN_FIELDS = frozenset({
    "token", "access_token", "refresh_token", "secret",
    "service_role_key", "admin_token", "document", "sources",
    "membership", "chunks",
})


# 1. Missing Authorization header returns 401.
def test_missing_authorization_header_returns_401():
    resp = client.get("/admin/session-check")
    assert resp.status_code == 401


# 2. staff_context_from_header raising 401 invalid token returns 401.
def test_invalid_token_propagates_401():
    with patch(
        "app.main.staff_context_from_header",
        side_effect=HTTPException(status_code=401, detail="Invalid token."),
    ):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer bad.token"},
        )
    assert resp.status_code == 401


# 3. staff role returns 403 with allowed false and reason role_not_allowed.
def test_staff_role_returns_403_role_not_allowed():
    with patch("app.main.staff_context_from_header", return_value=_STAFF_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "role_not_allowed"


# 4. registered_manager role returns 403 with allowed false and reason role_not_allowed.
def test_registered_manager_returns_403_role_not_allowed():
    with patch("app.main.staff_context_from_header", return_value=_REG_MGR_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "role_not_allowed"


# 5. Inactive membership propagated as 403.
def test_inactive_membership_propagated_as_403():
    with patch(
        "app.main.staff_context_from_header",
        side_effect=HTTPException(status_code=403, detail="Membership is not active."),
    ):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 403


# 6. Wrong-org organisation_admin returns 403 with reason organisation_not_allowed.
def test_wrong_org_organisation_admin_returns_403_org_not_allowed():
    with patch("app.main.staff_context_from_header", return_value=_WRONG_ORG_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "organisation_not_allowed"


# 7. Active organisation_admin in demo-org returns 200.
def test_organisation_admin_demo_org_returns_200():
    with patch("app.main.staff_context_from_header", return_value=_ORG_ADMIN_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["user_id"] == "u-admin"
    assert body["organisation_id"] == "demo-org"
    assert body["role"] == "organisation_admin"
    assert body["active"] is True
    assert body["reason"] == "admin_session_allowed"


# 8. Active worktwin_dev_admin in demo-org returns 200.
def test_worktwin_dev_admin_demo_org_returns_200():
    with patch("app.main.staff_context_from_header", return_value=_DEV_ADMIN_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["role"] == "worktwin_dev_admin"
    assert body["reason"] == "admin_session_allowed"


# 9. Allowed response does not include sensitive fields.
def test_allowed_response_has_no_sensitive_fields():
    with patch("app.main.staff_context_from_header", return_value=_ORG_ADMIN_CTX):
        resp = client.get(
            "/admin/session-check",
            headers={"Authorization": "Bearer fake.jwt"},
        )
    assert resp.status_code == 200
    body = resp.json()
    for field in _FORBIDDEN_FIELDS:
        assert field not in body, f"Response must not contain field: {field}"
