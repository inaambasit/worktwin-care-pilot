import time

import jwt
import pytest
from fastapi import HTTPException

from app.jwt_auth import validate_staff_jwt

_SECRET = "test-supabase-jwt-secret-for-pytest"
_ALGORITHM = "HS256"


def _make_token(payload: dict) -> str:
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def _valid_payload(offset: int = 3600) -> dict:
    return {
        "sub": "user-abc123",
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + offset,
    }


# ---------------------------------------------------------------------------
# Valid token
# ---------------------------------------------------------------------------

def test_valid_token_returns_payload(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    token = _make_token(_valid_payload())
    result = validate_staff_jwt(token)
    assert result["sub"] == "user-abc123"
    assert result["role"] == "authenticated"


# ---------------------------------------------------------------------------
# Expired token
# ---------------------------------------------------------------------------

def test_expired_token_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    token = _make_token(_valid_payload(offset=-10))  # expired 10 s ago
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


# ---------------------------------------------------------------------------
# Malformed token
# ---------------------------------------------------------------------------

def test_malformed_token_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt("not.a.valid.jwt")
    assert exc.value.status_code == 401


def test_wrong_signature_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    token = jwt.encode(_valid_payload(), "wrong-secret-that-is-long-enough-for-hs256", algorithm=_ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Missing token
# ---------------------------------------------------------------------------

def test_empty_string_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt("")
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Secret not configured
# ---------------------------------------------------------------------------

def test_unconfigured_secret_raises_503(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    token = _make_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 503
