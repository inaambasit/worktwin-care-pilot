import os

import jwt
from fastapi import HTTPException
from jwt import PyJWKClient


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
        client = PyJWKClient(jwks_url)
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
