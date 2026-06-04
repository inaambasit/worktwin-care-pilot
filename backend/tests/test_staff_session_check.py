from unittest.mock import patch

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.membership import StaffContext

client = TestClient(app)

_STAFF_CTX = StaffContext(user_id="u-staff", organisation_id="demo-org", role="staff")
_SENIOR_CTX = StaffContext(user_id="u-senior", organisation_id="demo-org", role="senior_care_staff")
_REG_MGR_CTX = StaffContext(user_id="u-mgr", organisation_id="demo-org", role="registered_manager")
_ORG_ADMIN_CTX = StaffContext(user_id="u-admin", organisation_id="demo-org", role="organisation_admin")
_WRONG_ORG_CTX = StaffContext(user_id="u-staff2", organisation_id="other-org", role="staff")
_DEV_ADMIN_CTX = StaffContext(user_id="u-dev", organisation_id="demo-org", role="worktwin_dev_admin")

_FORBIDDEN_FIELDS = frozenset({
    "token", "access_token", "refresh_token", "secret",
    "service_role_key", "admin_token", "document", "sources",
    "membership", "chunks", "user_id", "email", "membership_id",
})

_URL = "/staff/session-check"
_AUTH = {"Authorization": "Bearer fake.jwt"}
_VALID_PAYLOAD = {"sub": "u-test"}


# 1. Missing Authorization header returns 401.
def test_missing_authorization_returns_401():
    resp = client.get(_URL)
    assert resp.status_code == 401


# 2. Invalid token returns 401.
def test_invalid_token_returns_401():
    with patch(
        "app.main.validate_staff_jwt",
        side_effect=HTTPException(status_code=401, detail="Invalid token."),
    ):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 401
    assert resp.json()["allowed"] is False


# 3. No membership row returns 403.
def test_no_membership_returns_403():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch(
             "app.main.resolve_staff_context",
             side_effect=HTTPException(status_code=401, detail="No membership found."),
         ):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "access_denied"


# 4. Inactive membership returns 403.
def test_inactive_membership_returns_403():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch(
             "app.main.resolve_staff_context",
             side_effect=HTTPException(status_code=403, detail="Membership is not active."),
         ):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "access_denied"


# 5. Wrong organisation returns 403.
def test_wrong_organisation_returns_403():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_WRONG_ORG_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "access_denied"


# 6. Wrong role (worktwin_dev_admin) returns 403.
def test_wrong_role_returns_403():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_DEV_ADMIN_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "access_denied"


# 7. staff role returns 200 allowed.
def test_staff_role_allowed():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_STAFF_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["organisation_id"] == "demo-org"
    assert body["role"] == "staff"
    assert body["active"] is True


# 8. senior_care_staff role returns 200 allowed.
def test_senior_care_staff_role_allowed():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_SENIOR_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["role"] == "senior_care_staff"


# 9. registered_manager role returns 200 allowed.
def test_registered_manager_role_allowed():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_REG_MGR_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["role"] == "registered_manager"


# 10. organisation_admin is not automatically allowed for staff routes.
def test_organisation_admin_not_automatically_allowed():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_ORG_ADMIN_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 403
    body = resp.json()
    assert body["allowed"] is False


# 11. Allowed response does not contain sensitive fields.
def test_allowed_response_has_no_sensitive_fields():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_STAFF_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    for field in _FORBIDDEN_FIELDS:
        assert field not in body, f"Response must not contain field: {field}"


# 12. Cache-Control: no-store is present on an allowed response.
def test_cache_control_no_store_on_allowed():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_STAFF_CTX):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 200
    assert resp.headers.get("cache-control") == "no-store"


# 13. Cache-Control: no-store is present on a denied response.
def test_cache_control_no_store_on_denied():
    resp = client.get(_URL)  # no auth header → 401
    assert resp.status_code == 401
    assert "no-store" in (resp.headers.get("cache-control") or "")


# 14. Membership-lookup dependency failure fails closed with a safe 503
#     auth_unavailable response — never a 500, never an allowed grant. (4S.108C)
def test_membership_lookup_failure_returns_auth_unavailable(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.membership.httpx.get", side_effect=httpx.ConnectError("down")):
        resp = client.get(_URL, headers=_AUTH)
    assert resp.status_code == 503
    assert resp.status_code != 500
    body = resp.json()
    assert body["allowed"] is False
    assert body["reason"] == "auth_unavailable"
    assert resp.headers.get("cache-control") == "no-store"
