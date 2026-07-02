# 4S.109E Final Staff Login Smoke Test Script

## Purpose

This script should be used for the next live staff login proof after the Supabase email rate limit clears.

Goal: prove one clean staff login and protected-page navigation without being redirected back to login.

## Preconditions

- Vercel production is deployed from commit 5a5b04e or later.
- Supabase Magic Link / OTP template uses token_hash and type=email.
- Backend health endpoint is awake.
- No old magic-link emails are used.
- Only one new magic link is requested.

## Step 1 - Confirm deployment

Confirm Vercel production deployment is ready and includes:

- 5a5b04e - Increase staff route gate timeout
- 690b66b - Persist auth callback cookies on redirect
- 228e3ed - Add safe route gate diagnostics
- cf8f608 - Add safe login diagnostics

## Step 2 - Confirm Supabase template

Magic Link / OTP template must contain:

<p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Log In</a></p>

## Step 3 - Warm backend

Open:

https://worktwin-care-pilot-api.onrender.com/health

Expected:

{"status":"ok","service":"worktwin-api"}

## Step 4 - Request one new magic link

Open:

https://worktwin-care-pilot.vercel.app/login

Enter the authorised staff email address and request one new sign-in link.

Do not request more than one link.

## Step 5 - Click newest email only

Open the newest magic-link email only.

Do not use older emails.

Expected callback logs:

- staff_login_otp_request_completed
- staff_auth_callback_success
- flow_type: token_hash
- has_token_hash: true

## Step 6 - Confirm dashboard

Expected page:

/dashboard

Expected visible proof:

- Logged in staff identity visible
- Employee Portal visible
- Staff pilot view visible
- Thumhara Centre context visible
- Controlled Pilot / No Real Data wording visible

## Step 7 - Switch protected pages

Click through slowly:

1. Dashboard
2. Policy Library
3. My Onboarding
4. Scenario Guidance
5. Dashboard

Expected:

- No redirect back to /login
- No /login?error=auth
- No /login?error=auth_unavailable
- No /login?next=...

## Step 8 - Confirm Vercel route-gate logs

Expected Vercel logs:

- staff_route_gate_start
- staff_route_gate_check_result
- has_access_token: true
- allowed: true
- final_redirect_reason: null

Unexpected failure logs:

- staff_login_otp_error
- staff_auth_callback_error
- staff_route_gate_no_session
- staff_route_gate_fetch_error
- final_redirect_reason: auth_unavailable
- final_redirect_reason: access_denied

## Step 9 - Policy Library proof

Open Policy Library.

Expected:

- Five staff-visible documents load.
- Draft policies remain clearly labelled as controlled preview / not approved for live operational use where applicable.
- Safety reminders remain visible.
- Immediate danger instruction remains 999.

## Result fields

Record after testing:

- Date/time tested:
- Email delivery accepted: yes/no
- Callback success: yes/no
- Dashboard loaded: yes/no
- Page switching passed: yes/no
- Policy Library loaded five documents: yes/no
- Vercel route-gate allowed true: yes/no
- Overall result: PASS / BLOCKED

## Non-goals

This smoke test does not approve real care data, Staff Ask, RAG changes, policy indexing, wider staff access or live operational use.
