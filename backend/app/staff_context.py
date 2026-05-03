from typing import Optional

from fastapi import HTTPException

from app.jwt_auth import validate_staff_jwt
from app.membership import StaffContext, resolve_staff_context


def staff_context_from_header(authorization: Optional[str]) -> StaffContext:
    """Extract a bearer token, validate it, resolve membership, and return StaffContext.

    Raises HTTPException 401 for a missing, non-Bearer, or empty token.
    JWT and membership errors propagate unchanged.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must use Bearer scheme.")

    token = authorization[len("Bearer "):]
    if not token:
        raise HTTPException(status_code=401, detail="Bearer token is empty.")

    payload = validate_staff_jwt(token)
    return resolve_staff_context(payload)
