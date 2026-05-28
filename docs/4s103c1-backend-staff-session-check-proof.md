# 4S.103C-1 — Backend Staff Session-Check Endpoint: Proof of Implementation

## Slice

4S.103C-1

## Endpoint added

`GET /staff/session-check`

Requires `Authorization: Bearer <Supabase access token>`.

The backend is the authority for JWT validation and membership checks. No client-supplied organisation, role or user fields are trusted.

## Allowed roles

The following roles are permitted through the staff session-check:

- `staff`
- `senior_care_staff`
- `registered_manager`

The organisation must also be present in `ALLOWED_ORGANISATION_IDS`.

## Denied roles

The following roles are explicitly **not** granted staff route access by this endpoint:

- `organisation_admin`
- `worktwin_dev_admin`
- `read_only_reviewer`

These roles may be added to the staff allow-list in a later slice if required and approved.

## Response shapes

**Allowed (200):**
```json
{
  "allowed": true,
  "organisation_id": "...",
  "role": "...",
  "active": true
}
```

**Denied (401 or 403):**
```json
{
  "allowed": false,
  "reason": "access_denied"
}
```

**Configuration missing (503):**
```json
{
  "allowed": false,
  "reason": "auth_unavailable"
}
```

`Cache-Control: no-store` is set on all responses. The response never contains `user_id`, token, email, membership id, document data, storage keys, admin fields or secrets.

## Status codes

| Condition | Status |
|---|---|
| Missing or non-Bearer Authorization | 401 |
| Invalid or expired JWT | 401 |
| Valid token but no membership row | 403 |
| Valid token but inactive membership | 403 |
| Valid token but organisation not in allowlist | 403 |
| Valid token but role not in staff allowlist | 403 |
| Backend auth/membership not configured | 503 |
| Active allowed membership confirmed | 200 |

## Tests added

`backend/tests/test_staff_session_check.py`

Covers:
- Missing Authorization → 401
- Invalid token → 401
- No membership row → 403
- Inactive membership → 403
- Wrong organisation → 403
- Wrong role → 403
- `staff` role → 200 allowed
- `senior_care_staff` role → 200 allowed
- `registered_manager` role → 200 allowed
- `organisation_admin` not automatically allowed → 403
- Allowed response contains no sensitive fields
- `Cache-Control: no-store` present on allowed response
- `Cache-Control: no-store` present on denied response

Tests use mocks and do not require real Supabase network access.

## What is NOT yet in place

- No frontend route protection has been added in this slice.
- No Next.js middleware integration has been added in this slice.
- `PILOT_AUTH_MODE` is not enabled.
- `NEXT_PUBLIC_PILOT_AUTH_MODE` is not enabled.
- `ADMIN_PROXY_ENABLED` is not enabled.
- This slice alone does not make trusted staff access ready for production.

## Next slice

The next slice is frontend middleware integration, which will use this endpoint to gate access to staff routes in Next.js middleware.
