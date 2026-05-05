import base64
import json
import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.jwt_auth import validate_staff_jwt

_SECRET = "test-supabase-jwt-secret-for-pytest"
_ALGORITHM = "HS256"
_SUPABASE_URL = "https://example.supabase.co"


def _make_token(payload: dict) -> str:
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def _valid_payload(offset: int = 3600) -> dict:
    return {
        "sub": "user-abc123",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": f"{_SUPABASE_URL}/auth/v1",
        "iat": int(time.time()),
        "exp": int(time.time()) + offset,
    }


def _make_fake_es256_token(payload: dict) -> str:
    """Structurally-valid JWT with ES256 header; signature bytes are zeroed (not real)."""
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "ES256", "typ": "JWT", "kid": "test-kid"}).encode()
    ).rstrip(b"=").decode()
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    # PyJWT's get_unverified_header decodes all three segments, so the signature
    # segment must be valid base64url even though we never verify it.
    sig = base64.urlsafe_b64encode(b"\x00" * 64).rstrip(b"=").decode()
    return f"{header}.{body}.{sig}"


# ---------------------------------------------------------------------------
# Valid HS256 token
# ---------------------------------------------------------------------------

def test_valid_token_returns_payload(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_token(_valid_payload())
    result = validate_staff_jwt(token)
    assert result["sub"] == "user-abc123"
    assert result["role"] == "authenticated"


# ---------------------------------------------------------------------------
# Expired HS256 token
# ---------------------------------------------------------------------------

def test_expired_token_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
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
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = jwt.encode(_valid_payload(), "wrong-secret-that-is-long-enough-for-hs256", algorithm=_ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Wrong audience / wrong issuer
# ---------------------------------------------------------------------------

def test_wrong_audience_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    payload = _valid_payload()
    payload["aud"] = "anon"
    token = _make_token(payload)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_wrong_issuer_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    payload = _valid_payload()
    payload["iss"] = "https://evil.example.com/auth/v1"
    token = _make_token(payload)
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
# HS256 secret not configured
# ---------------------------------------------------------------------------

def test_unconfigured_secret_raises_503(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    token = _make_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 503


# ---------------------------------------------------------------------------
# Unsupported algorithm
# ---------------------------------------------------------------------------

def test_unsupported_alg_raises_401():
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "RS256", "typ": "JWT"}).encode()
    ).rstrip(b"=").decode()
    body = base64.urlsafe_b64encode(json.dumps(_valid_payload()).encode()).rstrip(b"=").decode()
    token = f"{header}.{body}.fakesignature"
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# ES256 — missing SUPABASE_URL
# ---------------------------------------------------------------------------

def test_es256_missing_supabase_url_raises_503(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    token = _make_fake_es256_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 503


# ---------------------------------------------------------------------------
# ES256 — happy path (mocked JWKS)
# ---------------------------------------------------------------------------

def test_es256_valid_token_returns_payload(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    payload = _valid_payload()
    token = _make_fake_es256_token(payload)

    mock_signing_key = MagicMock()
    mock_signing_key.key = "mock-ec-key"

    with patch("app.jwt_auth.PyJWKClient") as MockClient, \
         patch("jwt.decode", return_value=payload):
        MockClient.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
        result = validate_staff_jwt(token)

    assert result["sub"] == "user-abc123"


# ---------------------------------------------------------------------------
# ES256 — JWKS fetch failure
# ---------------------------------------------------------------------------

def test_es256_jwks_failure_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_fake_es256_token(_valid_payload())

    with patch("app.jwt_auth.PyJWKClient") as MockClient:
        MockClient.return_value.get_signing_key_from_jwt.side_effect = Exception("JWKS fetch failed")
        with pytest.raises(HTTPException) as exc:
            validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# ES256 — expired token
# ---------------------------------------------------------------------------

def test_es256_expired_token_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_fake_es256_token(_valid_payload(offset=-10))

    mock_signing_key = MagicMock()
    mock_signing_key.key = "mock-ec-key"

    with patch("app.jwt_auth.PyJWKClient") as MockClient, \
         patch("jwt.decode", side_effect=jwt.ExpiredSignatureError()):
        MockClient.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
        with pytest.raises(HTTPException) as exc:
            validate_staff_jwt(token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()
