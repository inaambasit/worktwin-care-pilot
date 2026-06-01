"""
JWT auth tests — Milestone 4S.105D.

Only ES256/JWKS tokens are accepted. HS256, alg=none, and all other algorithms
are rejected with 401 immediately at the algorithm check — before any secret or
JWKS fetch is attempted. There is no HS256 fallback path.
"""
import base64
import json
import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.jwt_auth import validate_staff_jwt

_SECRET = "test-supabase-jwt-secret-for-pytest"
_SUPABASE_URL = "https://example.supabase.co"


def _make_hs256_token(payload: dict) -> str:
    """Create a real HS256-signed token — used to prove these are rejected."""
    return jwt.encode(payload, _SECRET, algorithm="HS256")


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
    sig = base64.urlsafe_b64encode(b"\x00" * 64).rstrip(b"=").decode()
    return f"{header}.{body}.{sig}"


def _make_token_with_alg(alg: str, payload: dict) -> str:
    """Build a structurally-valid JWT with an arbitrary alg header value."""
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": alg, "typ": "JWT"}).encode()
    ).rstrip(b"=").decode()
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    sig = base64.urlsafe_b64encode(b"\x00" * 32).rstrip(b"=").decode()
    return f"{header}.{body}.{sig}"


# ---------------------------------------------------------------------------
# Missing / empty token
# ---------------------------------------------------------------------------

def test_empty_string_raises_401():
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt("")
    assert exc.value.status_code == 401


def test_malformed_token_raises_401():
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt("not.a.valid.jwt")
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# HS256 tokens are rejected — algorithm check fires before any secret lookup
# ---------------------------------------------------------------------------

def test_hs256_valid_payload_is_rejected(monkeypatch):
    """A perfectly valid HS256 token must be rejected with 401, not accepted."""
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_hs256_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_rejected_regardless_of_secret_presence(monkeypatch):
    """HS256 is rejected even when SUPABASE_JWT_SECRET is absent — no 503 path for HS256."""
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_hs256_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_rejected_regardless_of_supabase_url(monkeypatch):
    """HS256 is rejected even when SUPABASE_URL is absent — algorithm check happens first."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    token = _make_hs256_token(_valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_expired_token_is_rejected(monkeypatch):
    """Expired HS256 token is still rejected at the algorithm gate (401), not at expiry."""
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = _make_hs256_token(_valid_payload(offset=-10))
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_wrong_audience_is_rejected(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    payload = _valid_payload()
    payload["aud"] = "anon"
    token = _make_hs256_token(payload)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_wrong_issuer_is_rejected(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    payload = _valid_payload()
    payload["iss"] = "https://evil.example.com/auth/v1"
    token = _make_hs256_token(payload)
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs256_wrong_signature_is_rejected(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setenv("SUPABASE_URL", _SUPABASE_URL)
    token = jwt.encode(_valid_payload(), "wrong-secret-that-is-long-enough-for-hs256", algorithm="HS256")
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# alg=none is rejected
# ---------------------------------------------------------------------------

def test_alg_none_is_rejected():
    """alg=none must be rejected immediately with 401."""
    token = _make_token_with_alg("none", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_alg_none_lowercase_is_rejected():
    token = _make_token_with_alg("none", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Unsupported algorithms (RS256, HS512, PS256, etc.) are rejected
# ---------------------------------------------------------------------------

def test_rs256_is_rejected():
    token = _make_token_with_alg("RS256", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_hs512_is_rejected():
    token = _make_token_with_alg("HS512", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_ps256_is_rejected():
    token = _make_token_with_alg("PS256", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


def test_unknown_alg_is_rejected():
    token = _make_token_with_alg("UNKNOWN", _valid_payload())
    with pytest.raises(HTTPException) as exc:
        validate_staff_jwt(token)
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# ES256 — missing SUPABASE_URL raises 503 (config absent)
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
    assert result["role"] == "authenticated"


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
