import os
from dataclasses import dataclass
from typing import Optional

import httpx
from fastapi import HTTPException


@dataclass
class StaffContext:
    user_id: str
    organisation_id: str
    role: str


def _fetch_membership(user_id: str) -> Optional[dict]:
    """Query organisation_memberships via PostgREST and return the first row, or None."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        raise HTTPException(status_code=503, detail="Membership lookup not configured.")

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    params = {
        "user_id": f"eq.{user_id}",
        "select": "user_id,organisation_id,role,active",
        "limit": "1",
    }
    resp = httpx.get(
        f"{url}/rest/v1/organisation_memberships",
        params=params,
        headers=headers,
        timeout=10,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


def resolve_staff_context(payload: dict) -> StaffContext:
    """Convert a verified JWT payload into a StaffContext via DB membership lookup.

    Role and organisation_id are taken exclusively from the membership row --
    never from JWT claims.

    Raises HTTPException 401 for missing sub or no membership row.
    Raises HTTPException 403 for inactive membership or missing org/role in row.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim.")

    row = _fetch_membership(user_id)

    if row is None:
        raise HTTPException(status_code=401, detail="No membership found.")

    if row.get("active") is not True:
        raise HTTPException(status_code=403, detail="Membership is not active.")

    organisation_id = row.get("organisation_id")
    if not organisation_id:
        raise HTTPException(status_code=403, detail="Membership missing organisation_id.")

    role = row.get("role")
    if not role:
        raise HTTPException(status_code=403, detail="Membership missing role.")

    return StaffContext(
        user_id=user_id,
        organisation_id=organisation_id,
        role=role,
    )
