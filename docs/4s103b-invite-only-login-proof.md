# 4S.103B — Invite-Only Login: Proof of Implementation

**Slice:** 4S.103B  
**Date:** 2026-05-28  
**Status:** Implemented. Does not make WorkTwin ready for trusted staff access on its own.  
**Depends on:** 4S.103A (auth readiness audit — NO-GO issued)

---

## What this slice does

Makes the staff magic-link login form invite-only at code level and documents the
required Supabase dashboard setting. It does not enable pilot auth mode, does not
protect routes, and does not create or seed real staff accounts.

---

## Code changes

### 1. `shouldCreateUser: false` added

`frontend/app/login/page.tsx` — the `signInWithOtp` call now includes:

```ts
options: {
  emailRedirectTo: callbackUrl,
  shouldCreateUser: false,
}
```

Effect: Supabase will send a magic link only to addresses that already have a
confirmed Supabase Auth account. An unknown email address will not result in a new
user being created. The form still redirects to `/login/sent` for any submitted
address so that the response does not reveal whether an address is registered.

### 2. Login page wording updated

`frontend/app/login/page.tsx`

- Heading: "Sign in to WorkTwin Care Pilot"
- Subheading states: this is for invited pilot staff only; access must be set up by
  the organisation; entering an email address does not create a new account; if
  access has not been arranged, speak to the organisation lead.
- Invite-only notice (below the form) states: invite-only staff login; email must
  already be set up; entering an unknown address does not create a new account.
- Removed: "Explore the pilot preview →" footer link. That link implied open access
  and contradicted the invite-only message.

### 3. Login sent page wording updated

`frontend/app/login/sent/page.tsx`

Updated confirmation text to: "If that address has been given pilot access, a secure
sign-in link has been sent. A link will only work where access has already been set
up by the organisation."

Previous wording ("If that address is registered on this pilot") was not incorrect
but did not clearly state the invite-only constraint.

### 4. Auth callback comment tightened

`frontend/app/auth/callback/route.ts`

Replaced comment "token_hash flow used by sandbox admin magic links" with
"OTP token-hash verification path for magic-link sign-in". The original comment
implied the path was only for developer/admin use; it is the standard OTP
verification flow for all magic-link sign-ins.

No functional change. The callback does not create accounts: it calls
`exchangeCodeForSession` or `verifyOtp`, both of which require a pre-existing
Supabase Auth user. Allowed next paths are unchanged.

---

## Required Supabase dashboard setting

`shouldCreateUser: false` in the client call alone is not sufficient. The Supabase
Auth dashboard must also have **public signup disabled** (or equivalent invite-only
configuration) before any real staff accounts are relevant:

- Go to: Supabase project → Authentication → Providers → Email
- Disable "Enable email signup" (or set "Confirm email" with an invite-only workflow)
- Alternatively, use Supabase's "Invite user" flow so that only explicitly invited
  addresses can ever have an account in the project

Until this dashboard setting is confirmed, a misconfigured Supabase project could
still create accounts through other surfaces even with `shouldCreateUser: false` set
on the client call.

This setting must be verified and confirmed before any trusted staff login attempt.

---

## What this slice does NOT do

- Does not enable `NEXT_PUBLIC_PILOT_AUTH_MODE=true`.
- Does not protect `/ask`, `/policies`, or any other staff route.
- Does not create Supabase user accounts for Thumhara Centre staff.
- Does not add the `organisation_memberships` table or any SQL migration.
- Does not enable `ADMIN_PROXY_ENABLED`.
- Does not make WorkTwin ready for trusted staff use.

---

## Next blocker

The next blocker identified in the 4S.103A audit remains:
**membership-aware staff route protection** — routes must check not only that a
valid Supabase Auth session exists but also that the authenticated user has an active
record in the `organisation_memberships` table for the relevant organisation before
any pilot content is served.

This is addressed in the 4S.85E and 4S.85F sub-milestones defined in
`docs/auth-implementation-checklist.md`.

---

## Smoke test coverage added

`frontend/tests/smoke.spec.ts` — section `4S.103B: Invite-only login smoke tests`:

| Assertion | Test |
|---|---|
| Login page says "invited pilot staff only" | `/login is invite-only: says invited pilot staff only and access must already be set up` |
| Login page says access must be set up by the organisation | same test |
| Login page does not imply public self-registration | `/login does not imply public self-registration` |
| Login page says entering an address does not create a new account | same test |
| Login page has no "Explore the pilot preview" link | same test |
| Login sent page says link only works where access is set up | `/login/sent states the link only works where access has already been set up` |
