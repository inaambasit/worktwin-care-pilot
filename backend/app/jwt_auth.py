import os
import threading

import jwt
from fastapi import HTTPException
from jwt import PyJWKClient

# ---------------------------------------------------------------------------
# JWKS client cache (keyed by JWKS URL).
#
# The previous implementation constructed a new PyJWKClient on every staff
# request, which discarded PyJWT's internal JWKS cache each time and forced a
# fresh JWKS HTTP fetch from Supabase per request. Under trusted-staff cohort
# load (and Render cold starts) that is slow and adds a per-request network
# dependency. Caching the client instance preserves PyJWT's signing-key cache
# across requests.
#
# Safety notes:
# - Only the PyJWKClient instance is cached — NEVER decoded payloads, JWTs,
#   membership rows, or roles.
# - The cache is keyed by the JWKS URL (derived from SUPABASE_URL), so a change
#   of SUPABASE_URL produces a different key and never reuses the wrong client.
# - This does not weaken algorithm/issuer/audience/expiry checks: every token is
#   still fully verified by jwt.decode on each call. Only key retrieval is cached
#   (PyJWKClient also enforces its own 300s JWKS lifespan refresh internally).
# ---------------------------------------------------------------------------
_jwks_clients: dict[str, PyJWKClient] = {}
_jwks_lock = threading.Lock()


def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Return a cached PyJWKClient for the given JWKS URL, constructing one on
    first use. Thread-safe via double-checked locking."""
    client = _jwks_clients.get(jwks_url)
    if client is None:
        with _jwks_lock:
            client = _jwks_clients.get(jwks_url)
            if client is None:
                client = PyJWKClient(jwks_url, cache_keys=True)
                _jwks_clients[jwks_url] = client
    return client


def _reset_jwks_cache_for_tests() -> None:
    """Clear cached JWKS clients. Test-only helper; never called at runtime."""
    with _jwks_lock:
        _jwks_clients.clear()


def validate_staff_jwt(token: str) -> dict:
    """Decode and validate a Supabase-issued ES256 JWT via JWKS.

    Only ES256 tokens are accepted. HS256, alg=none, and all other algorithms
    are rejected immediately with 401 — there is no fallback path.
    Reads env vars at call time so tests can patch them.
    Returns the decoded payload dict on success.
    Raises HTTPException 401 for missing/expired/invalid/wrong-algorithm tokens.
    Raises HTTPException 503 when SUPABASE_URL is absent.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token.")

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    if header.get("alg") != "ES256":
        raise HTTPException(status_code=401, detail="Invalid token.")

    supabase_url = os.getenv("SUPABASE_URL", "")
    if not supabase_url:
        raise HTTPException(status_code=503, detail="Staff auth not configured.")

    expected_issuer = f"{supabase_url}/auth/v1"
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        client = _get_jwks_client(jwks_url)
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=expected_issuer,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")
