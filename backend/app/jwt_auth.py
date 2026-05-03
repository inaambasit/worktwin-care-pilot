import os

import jwt
from fastapi import HTTPException

_ALGORITHM = "HS256"


def validate_staff_jwt(token: str) -> dict:
    """Decode and validate a Supabase-issued JWT.

    Reads SUPABASE_JWT_SECRET at call time so tests can patch the env var.
    Returns the decoded payload dict on success.
    Raises HTTPException 401 for missing/expired/invalid tokens.
    Raises HTTPException 503 when the secret is not configured.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token.")

    secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Staff auth not configured.")

    try:
        return jwt.decode(token, secret, algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
