import os

import jwt
from fastapi import HTTPException
from jwt import PyJWKClient


def validate_staff_jwt(token: str) -> dict:
    """Decode and validate a Supabase-issued JWT.

    Supports ES256 (Supabase ECC key via JWKS) and HS256 (legacy/test fallback).
    Reads env vars at call time so tests can patch them.
    Returns the decoded payload dict on success.
    Raises HTTPException 401 for missing/expired/invalid tokens.
    Raises HTTPException 503 when required config is absent.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token.")

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    alg = header.get("alg", "")

    if alg == "ES256":
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

    elif alg == "HS256":
        secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if not secret:
            raise HTTPException(status_code=503, detail="Staff auth not configured.")

        supabase_url = os.getenv("SUPABASE_URL", "")
        decode_options: dict = {"algorithms": ["HS256"]}
        if supabase_url:
            decode_options["audience"] = "authenticated"
            decode_options["issuer"] = f"{supabase_url}/auth/v1"

        try:
            return jwt.decode(token, secret, **decode_options)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token.")

    else:
        raise HTTPException(status_code=401, detail="Invalid token.")
