# 4S.109C Staff Login Auth Callback Proof

## Current checkpoint

- Current commit: 5a5b04e - Increase staff route gate timeout
- Frontend: https://worktwin-care-pilot.vercel.app
- Backend: https://worktwin-care-pilot-api.onrender.com
- Status: controlled pilot only
- No real care data approved
- Staff Ask remains off unless separately approved
- Staff visibility remains off unless separately approved
- Written sign-off still required before wider staff use

## Fixed issues

### 1. Invalid Supabase publishable key

Vercel logs showed staff_login_otp_error with status 401 and message Invalid API key.

Fix: updated NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel to the correct WorkTwin Care Pilot Supabase publishable key.

### 2. Missing or wrong backend API URL

After email delivery worked, the app showed /login?error=auth_unavailable.

Fix: set NEXT_PUBLIC_API_URL in Vercel to https://worktwin-care-pilot-api.onrender.com.

### 3. Safe login diagnostics

Commit cf8f608 added safe login diagnostics: staff_login_otp_request_completed, staff_login_otp_error and staff_login_otp_exception.

No emails, magic links, tokens, cookies, JWTs, API keys or service-role keys are logged.

### 4. Safe route-gate diagnostics

Commit 228e3ed added safe route-gate diagnostics: staff_route_gate_start, staff_route_gate_no_session, staff_route_gate_check_result and staff_route_gate_fetch_error.

No access tokens, refresh tokens, cookies, JWTs, Authorization headers, API keys or service-role keys are logged.

### 5. Auth callback cookie persistence

Commit 690b66b fixed the callback so Supabase auth cookies are written onto the same redirect response after successful auth.

This fixed the server-readable cookie problem after magic-link login.

### 6. Supabase Magic Link template

Supabase Magic Link / OTP template was changed away from ConfirmationURL code flow.

Current required link:

<p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Log In</a></p>

This avoids the PKCE code verifier missing problem and uses token_hash verification instead.

### 7. Staff route-gate timeout

Commit 5a5b04e changed the middleware session-check timeout from 5 seconds to 15 seconds.

Auth still fails closed. No access rules were loosened.

## Current blocker

Current blocker is Supabase built-in email send rate limit.

Latest log showed:

- error_status: 429
- error_code: over_email_send_rate_limit
- error_message: email rate limit exceeded

This means WorkTwin showed /login/sent for privacy, but Supabase did not send the email.

## Next test after rate limit clears

1. Confirm Vercel production is 5a5b04e.
2. Confirm the Supabase Magic Link template still uses token_hash and type=email.
3. Warm the backend health endpoint.
4. Request one new magic link only.
5. Click the newest email only.
6. Expected logs: staff_login_otp_request_completed, staff_auth_callback_success, staff_route_gate_check_result, allowed true.

## Non-goals

This work did not change backend membership logic, Staff Ask, policy content, RAG, governance flags, staff visibility, admin proxy or real care data.
