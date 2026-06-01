"""
Milestone 4S.104E-6d — Cache-Control: no-store on staff-facing responses.

Staff-facing endpoints (/staff/session-check, /policies, /ask) return
organisation- and role-scoped data that must never be cached by browsers or
shared proxies. These tests prove the no-store header is present on both the
authorised response and the auth-failure response for each endpoint.

The header is applied to /policies and /ask by a path-scoped HTTP middleware
(app.main._no_store_on_staff_endpoints) so it covers success, safe fallback and
auth/error responses alike; /staff/session-check sets it per-response.
"""

from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.membership import StaffContext

client = TestClient(app)

_STAFF_CTX = StaffContext(user_id="u-staff", organisation_id="demo-org", role="staff")
_FAKE_CTX = StaffContext(user_id="user-abc", organisation_id="demo-org", role="Care Worker")
_VALID_PAYLOAD = {"sub": "u-test"}
_AUTH = {"Authorization": "Bearer fake.jwt.token"}
_QUESTION = {"question": "What is the holiday policy?"}


def _cache_control(resp):
    return resp.headers.get("cache-control") or ""


# ---------------------------------------------------------------------------
# /staff/session-check
# ---------------------------------------------------------------------------

def test_session_check_authorised_has_no_store():
    with patch("app.main.validate_staff_jwt", return_value=_VALID_PAYLOAD), \
         patch("app.main.resolve_staff_context", return_value=_STAFF_CTX):
        resp = client.get("/staff/session-check", headers=_AUTH)
    assert resp.status_code == 200
    assert _cache_control(resp) == "no-store"


def test_session_check_denied_has_no_store():
    resp = client.get("/staff/session-check")  # no auth header -> 401
    assert resp.status_code == 401
    assert "no-store" in _cache_control(resp)


# ---------------------------------------------------------------------------
# /policies
# ---------------------------------------------------------------------------

def test_policies_authorised_has_no_store(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX):
        resp = client.get("/policies", headers=_AUTH)
    assert resp.status_code == 200
    assert _cache_control(resp) == "no-store"


def test_policies_auth_failure_has_no_store(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.get("/policies")  # no auth header -> 401
    assert resp.status_code == 401
    assert _cache_control(resp) == "no-store"


# ---------------------------------------------------------------------------
# /ask
# ---------------------------------------------------------------------------

def test_ask_authorised_has_no_store(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX):
        resp = client.post("/ask", json=_QUESTION, headers=_AUTH)
    assert resp.status_code == 200
    assert _cache_control(resp) == "no-store"


def test_ask_auth_failure_has_no_store(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.post("/ask", json=_QUESTION)  # no auth header -> 401
    assert resp.status_code == 401
    assert _cache_control(resp) == "no-store"
