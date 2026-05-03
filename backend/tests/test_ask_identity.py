from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.membership import StaffContext

client = TestClient(app)

_FAKE_CTX = StaffContext(user_id="user-abc", organisation_id="demo-org", role="Care Worker")
_QUESTION = {"question": "What is the holiday policy?"}


# ---------------------------------------------------------------------------
# (a) PILOT_AUTH_MODE absent or false -- demo path is used
# ---------------------------------------------------------------------------

def test_demo_path_used_when_pilot_auth_mode_absent(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.post("/ask", json=_QUESTION)
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_demo_path_used_when_pilot_auth_mode_false(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "false")
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.post("/ask", json=_QUESTION)
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_staff_context_from_header_not_called_in_demo_mode(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")), \
         patch("app.main.staff_context_from_header") as mock_ctx:
        client.post("/ask", json=_QUESTION)
    mock_ctx.assert_not_called()


# ---------------------------------------------------------------------------
# (b) PILOT_AUTH_MODE=true, no Authorization header -> 401
# ---------------------------------------------------------------------------

def test_no_auth_header_returns_401_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.post("/ask", json=_QUESTION)
    assert resp.status_code == 401


def test_empty_auth_header_returns_401_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    resp = client.post("/ask", json=_QUESTION, headers={"Authorization": ""})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# (c) PILOT_AUTH_MODE=true with mocked valid StaffContext -> verified context used
# ---------------------------------------------------------------------------

def test_verified_context_used_when_pilot_auth_mode_true(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX):
        resp = client.post(
            "/ask",
            json=_QUESTION,
            headers={"Authorization": "Bearer fake.jwt.token"},
        )
    assert resp.status_code == 200


def test_demo_path_not_called_in_pilot_auth_mode(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX), \
         patch("app.main._get_pilot_staff_context") as mock_demo:
        client.post(
            "/ask",
            json=_QUESTION,
            headers={"Authorization": "Bearer fake.jwt.token"},
        )
    mock_demo.assert_not_called()


def test_verified_context_fields_used(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    ctx = StaffContext(user_id="verified-user", organisation_id="demo-org", role="Manager")
    captured = {}

    def _fake_rate_limit(org_id, uid):
        captured["organisation_id"] = org_id
        captured["user_id"] = uid

    with patch("app.main.staff_context_from_header", return_value=ctx), \
         patch("app.main._check_ask_rate_limit", side_effect=_fake_rate_limit):
        client.post(
            "/ask",
            json=_QUESTION,
            headers={"Authorization": "Bearer fake.jwt.token"},
        )

    assert captured["organisation_id"] == "demo-org"
    assert captured["user_id"] == "verified-user"


# ---------------------------------------------------------------------------
# (d) Client-supplied identity fields in body do not influence context
# ---------------------------------------------------------------------------

def test_body_identity_fields_ignored_in_demo_mode(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    with patch("app.main._get_pilot_staff_context", return_value=("demo-org", "demo-user", "Care Worker")) as mock_demo:
        resp = client.post(
            "/ask",
            json={
                "question": "What is the holiday policy?",
                "user_id": "injected-user",
                "user_role": "admin",
                "organisation_id": "injected-org",
            },
        )
    assert resp.status_code == 200
    mock_demo.assert_called_once()


def test_body_identity_fields_ignored_in_pilot_auth_mode(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "true")
    with patch("app.main.staff_context_from_header", return_value=_FAKE_CTX) as mock_ctx:
        resp = client.post(
            "/ask",
            json={
                "question": "What is the holiday policy?",
                "user_id": "injected-user",
                "user_role": "admin",
                "organisation_id": "injected-org",
            },
            headers={"Authorization": "Bearer fake.jwt.token"},
        )
    assert resp.status_code == 200
    mock_ctx.assert_called_once()
