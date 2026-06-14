"""4S.109B — staff auth-mode resolution must fail closed.

Central rule under test (app.main._pilot_auth_required):
  Staff protected routes require verified auth BY DEFAULT. The demo (static
  server-side identity) path is selected ONLY when PILOT_AUTH_MODE is explicitly
  set to a recognised demo value: false / 0 / off / no / demo (case/space
  insensitive). Every other value — missing, empty, "true", "True", "TRUE",
  "1", "yes", "on", a typo such as "ture" — means auth required / fail closed.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import _pilot_auth_required, app

client = TestClient(app)


# Explicit demo values → demo path allowed (auth NOT required).
EXPLICIT_DEMO_VALUES = ["false", "0", "off", "no", "demo"]

# Case/whitespace variants of recognised demo values also resolve to demo.
DEMO_VARIANTS = ["False", "FALSE", "  false  ", "Off", "NO", "Demo"]

# Everything else → auth required / fail closed.
AUTH_REQUIRED_VALUES = [
    "true", "True", "TRUE", "1", "yes", "on", "ture",
    "enabled", "y", "t", "demo-mode", "false-ish", "x",
]


@pytest.mark.parametrize("value", EXPLICIT_DEMO_VALUES + DEMO_VARIANTS)
def test_explicit_demo_values_do_not_require_auth(monkeypatch, value):
    monkeypatch.setenv("PILOT_AUTH_MODE", value)
    assert _pilot_auth_required() is False


@pytest.mark.parametrize("value", AUTH_REQUIRED_VALUES)
def test_unrecognised_values_require_auth(monkeypatch, value):
    monkeypatch.setenv("PILOT_AUTH_MODE", value)
    assert _pilot_auth_required() is True


def test_missing_env_var_requires_auth(monkeypatch):
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    assert _pilot_auth_required() is True


def test_empty_env_var_requires_auth(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "")
    assert _pilot_auth_required() is True


def test_whitespace_only_env_var_requires_auth(monkeypatch):
    monkeypatch.setenv("PILOT_AUTH_MODE", "   ")
    assert _pilot_auth_required() is True


# ---------------------------------------------------------------------------
# Admin-gated, non-secret posture indicator on /debug/storage-config.
# Reports the resolved mode only — never a token, key, secret, or identity.
# ---------------------------------------------------------------------------

def test_debug_indicator_reports_auth_required(monkeypatch):
    monkeypatch.setenv("DEBUG_ENDPOINTS_ENABLED", "true")
    monkeypatch.delenv("PILOT_AUTH_MODE", raising=False)
    monkeypatch.setattr("app.main._ADMIN_TOKEN", "test-admin-token")
    resp = client.get(
        "/debug/storage-config",
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["staff_auth_mode"] == "auth-required"
    assert "staff_auth_configured" in body
    # The indicator must never echo the admin token or any secret value.
    assert "test-admin-token" not in resp.text


def test_debug_indicator_reports_explicit_demo(monkeypatch):
    monkeypatch.setenv("DEBUG_ENDPOINTS_ENABLED", "true")
    monkeypatch.setenv("PILOT_AUTH_MODE", "false")
    monkeypatch.setattr("app.main._ADMIN_TOKEN", "test-admin-token")
    resp = client.get(
        "/debug/storage-config",
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert resp.status_code == 200
    assert resp.json()["staff_auth_mode"] == "explicit-demo"


def test_debug_indicator_requires_admin(monkeypatch):
    # Without the admin bearer token the indicator is not reachable.
    monkeypatch.setenv("DEBUG_ENDPOINTS_ENABLED", "true")
    monkeypatch.setattr("app.main._ADMIN_TOKEN", "test-admin-token")
    resp = client.get("/debug/storage-config")
    assert resp.status_code == 401
