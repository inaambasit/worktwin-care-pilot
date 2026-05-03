from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.membership import StaffContext

client = TestClient(app)

_FAKE_CTX = StaffContext(user_id="user-abc", organisation_id="demo-org", role="Care Worker")


# ---------------------------------------------------------------------------
# (a) PILOT_AUTH_MODE absent or false -- demo path is used
# ---------------------------------------------------------------------------

def test_demo_path_used_when_pilot_auth_mode_absent(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.get("/policies")
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_demo_path_used_when_pilot_auth_mode_false(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "false")
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.get("/policies")
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_staff_context_from_header_not_called_in_demo_mode(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")), \
         patch("app.main.staff_context_from_header") as mock_ctx:
        client.get("/policies")
    mock_ctx.assert_not_called()


# ---------------------------------------------------------------------------
# (b) PILOT_AUTH_MODE=true, no Authorization header -> 401
# ---------------------------------------------------------------------------

def test_no_auth_header_returns_401_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.get("/policies")
    assert resp.status_code == 401


def test_empty_auth_header_returns_401_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.get("/policies", headers={"Authorization": ""})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# (c) PILOT_AUTH_MODE=true with mocked valid StaffContext -> 200, demo not called
# ---------------------------------------------------------------------------

def test_verified_context_used_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX):
        resp = client.get("/policies", headers={"Authorization": "Bearer fake.jwt.token"})
    assert resp.status_code == 200


def test_demo_path_not_called_in_pilot_auth_mode(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX), \
         patch("app.main._get_pilot_staff_context") as mock_demo:
        client.get("/policies", headers={"Authorization": "Bearer fake.jwt.token"})
    mock_demo.assert_not_called()


# ---------------------------------------------------------------------------
# (d) Verified organisation_id and role are used for filtering
# ---------------------------------------------------------------------------

def test_verified_organisation_id_used_for_filtering(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    ctx = StaffContext(user_id="verified-user", organisation_id="demo-org", role="Manager")
    with patch("app.main.staff_context_from_header", return_value=ctx):
        resp = client.get("/policies", headers={"Authorization": "Bearer fake.jwt.token"})
    assert resp.status_code == 200
    # All returned docs must belong to the verified organisation
    for doc in resp.json():
        assert doc["organisation_id"] == "demo-org"


def test_verified_role_used_for_filtering(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    # Use a role that has no matching docs to verify role filtering is applied
    ctx = StaffContext(user_id="verified-user", organisation_id="demo-org", role="NonexistentRole")
    with patch("app.main.staff_context_from_header", return_value=ctx):
        resp = client.get("/policies", headers={"Authorization": "Bearer fake.jwt.token"})
    assert resp.status_code == 200
    # Only "All Staff" docs should appear; no role-specific docs for this role
    for doc in resp.json():
        assert "All Staff" in doc["access_roles"]


# ---------------------------------------------------------------------------
# (e) Client-supplied identity query params do not influence context
# ---------------------------------------------------------------------------

def test_query_param_identity_ignored_in_demo_mode(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.get("/policies?user_id=injected&user_role=admin&organisation_id=injected-org")
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_query_param_identity_ignored_in_pilot_auth_mode(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX) as mock_ctx:
        resp = client.get(
            "/policies?user_id=injected&user_role=admin&organisation_id=injected-org",
            headers={"Authorization": "Bearer fake.jwt.token"},
        )
    assert resp.status_code == 200
    mock_ctx.assert_called_once()
