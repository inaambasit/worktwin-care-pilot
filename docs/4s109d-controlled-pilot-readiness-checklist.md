# 4S.109D Controlled Pilot Readiness Checklist

## Purpose

This checklist records what must be true before WorkTwin Care Pilot is shown to any additional staff users.

Current status: NO-GO for wider staff use until all required checks are passed.

## Current checkpoint

- Current repo commit: 98c64a9 - Document staff login auth callback proof
- Frontend: https://worktwin-care-pilot.vercel.app
- Backend: https://worktwin-care-pilot-api.onrender.com
- Controlled pilot only
- No real care data approved
- Staff Ask remains off unless separately approved
- Staff visibility remains off unless separately approved
- Written sign-off still required before wider staff use

## 1. Auth and login readiness

- [x] Correct Supabase publishable key configured in Vercel.
- [x] Correct production Supabase URL configured in Vercel.
- [x] Correct NEXT_PUBLIC_API_URL configured in Vercel.
- [x] Magic Link template changed to token_hash flow.
- [x] Auth callback writes Supabase cookies onto the redirect response.
- [x] Route gate timeout increased from 5 seconds to 15 seconds.
- [ ] Fresh login retested after Supabase email rate limit clears.
- [ ] Page switching retested after fresh login.
- [ ] Vercel logs confirm staff_auth_callback_success.
- [ ] Vercel logs confirm staff_route_gate_check_result allowed true.

## 2. Email delivery readiness

- [x] Current blocker identified as Supabase built-in email rate limit.
- [ ] Custom SMTP decision made before real pilot users are invited.
- [ ] SMTP sender domain selected.
- [ ] SMTP provider configured and tested.
- [ ] Magic link delivery tested without hitting low Supabase built-in limits.

## 3. Backend reliability readiness

- [x] Render backend health endpoint confirmed.
- [x] Middleware fails closed when backend check is unavailable.
- [ ] Decide whether Render free cold start is acceptable for demos only.
- [ ] Upgrade/move backend before real staff pilot if cold starts continue.
- [ ] Confirm /staff/session-check responds reliably while logged in.

## 4. Policy Library readiness

- [x] Policy Library loads five staff-visible documents when backend is awake.
- [ ] Confirm every visible policy is appropriate for controlled preview.
- [ ] Confirm draft policies clearly say not approved for live operational use.
- [ ] Confirm no QCS/third-party content is shown unless properly approved.
- [ ] Confirm document count shown in UI matches the backend-approved list.

## 5. Staff-facing wording readiness

- [ ] Dashboard clearly says Controlled Pilot / No Real Data.
- [ ] Policy Library does not overclaim operational approval.
- [ ] Ask WorkTwin disabled wording is clear if Staff Ask remains off.
- [ ] Escalation and safety reminders are visible.
- [ ] Immediate danger instruction remains 999.

## 6. Escalation contacts readiness

- [ ] Escalation contacts are real, current and approved.
- [ ] If sample contacts are used, UI clearly labels them as sample-only.
- [ ] Staff know who to speak to if WorkTwin cannot answer safely.

## 7. Governance boundary readiness

- [x] No real care data approved.
- [x] Staff Ask remains off unless separately approved.
- [x] Staff visibility remains off unless separately approved.
- [x] Backend membership logic was not loosened during auth fixes.
- [ ] Written sign-off obtained before any wider staff cohort.
- [ ] Pilot runbook updated before staff are invited.

## 8. Go / no-go decision

Current decision: NO-GO for wider staff use.

Reason:

- Fresh login/page switching still needs final test after email rate limit clears.
- Supabase built-in email sender is too limited for reliable pilot use.
- Render free backend cold start may still affect user experience.
- Written sign-off is still required.

## Next required proof

After email rate limit clears:

1. Warm backend health endpoint.
2. Request one new magic link only.
3. Click newest email only.
4. Confirm dashboard loads.
5. Switch between Dashboard, Policy Library, My Onboarding and Scenario Guidance.
6. Confirm Vercel logs show callback success and route-gate allowed true.

## Non-goals

This checklist does not approve real care data, Staff Ask, RAG changes, policy indexing, wider staff access, or live operational use.
