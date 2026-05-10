# WorkTwin Care Pilot - Docs Index

> Controlled prototype. Not production-ready. Public auth disabled. Admin proxy disabled publicly. Staff demo is Visitor SOP-only (checkpoint ac2d6ac, 4S.91C). Real staff and pilot use blocked pending DPA, pilot governance, auth activation, content permissions, and final sign-off.

## Current state

| Document | Notes |
|---|---|
| [Current state](current-state.md) | **Main source of truth.** Current checkpoint, feature state, blockers, demo posture and do-not-touch list |
| [Policy upload and AI testing tracker](policy-upload-testing-tracker.md) | Source of truth for policy and document governance, upload testing scope and results |
| [Clean-corpus policy approval template](clean-corpus-policy-approval-template.md) | Reusable approval template -- complete before uploading any document to WorkTwin |
| [Visitor SOP clean-corpus approval record](visitor-sop-corpus-approval.md) | Completed approval record for Visitor Sign-In and Identification Procedure -- first confirmed clean-corpus document; Lane A; approved for controlled internal demo use |
| [Auth E2E proof blocker (4S.88G)](4s88g-auth-e2e-proof-blocker.md) | Current auth E2E blocker record — blocked pending safe migration path |
| [Sandbox auth E2E setup plan (4S.90I)](4s90i-sandbox-auth-e2e-plan.md) | Plan to prove auth E2E in a separate sandbox Supabase project without touching the production-labelled Thumhara project |
| [Sandbox auth E2E proof (4S.90L)](4s90l-sandbox-auth-e2e-proof.md) | Proof record — local sandbox auth E2E passed; `/policies` wrong-org boundary fix committed in `23632a4`; public auth still disabled |
| [Sandbox RLS baseline proof (4S.90M)](4s90m-sandbox-rls-baseline-proof.md) | Proof record — sandbox RLS/grants posture inspected; anon/authenticated direct REST blocked; service_role allowed; no RLS policies yet; backend-gated posture confirmed |
| [RLS strategy decision (4S.90M-B)](4s90m-b-rls-strategy-decision.md) | Decision record -- WorkTwin remains backend-gated for the controlled pilot; no direct authenticated Supabase table access or new RLS policies introduced; backend enforces all policy checks via service_role |
| [Admin proxy real session guard design (4S.90N-A)](4s90n-admin-proxy-real-session-guard-design.md) | Design record -- admin proxy session guard approach decided; frontend/Vercel kept free of service_role; backend remains membership authority via a future /admin/session-check endpoint; proxy remains disabled |
| [Admin proxy sandbox E2E proof (4S.90N-D)](4s90n-d-admin-proxy-sandbox-e2e-proof.md) | Proof record -- sandbox E2E passed for admin proxy session-check flow; real sandbox organisation_admin session verified; backend `/admin/session-check` returned 200 OK; proxy returned 503 "not_configured" (expected pass - ADMIN_TOKEN intentionally empty); proxy remains disabled publicly; CSRF still a stub |
| [Admin proxy CSRF / same-origin guard proof (4S.90N-E)](4s90n-e-admin-proxy-csrf-proof.md) | Proof record -- real same-origin / fetch-metadata CSRF guard implemented; POST and PATCH protected; GET CSRF-bypassed; 13 CSRF tests passed; full E2E 40 passed, 0 failed; admin response minimisation (4S.90N-F) outstanding |
| [Admin response minimisation proof (4S.90N-F)](4s90n-f-admin-response-minimisation-proof.md) | Proof record -- upload error sanitisation, answer-debug field minimisation, and per-role admin proxy response stripping complete; organisation_admin responses stripped; worktwin_dev_admin passthrough unchanged; ADMIN_PROXY_ENABLED remains disabled publicly |
| [Public deployment safety proof (4S.90P)](4s90p-public-deployment-safety-proof.md) | Proof record -- admin proxy disabled in public Vercel deployment; admin and debug endpoints return 403 with safe static message; no data exposed; all public demo pages load; current demo posture confirmed safe; does not activate production auth; real staff use, DPA/content permissions, pilot governance, QCS permissions, and final controlled pilot sign-off remain outstanding |
| Visitor SOP-only demo journey (4S.91B) | Milestone closed -- Dashboard guides demo path; Ask focuses on Visitor SOP questions; Policy Library fallback is Visitor Sign-In only; Access Refusal connects to Visitor SOP and escalation; Escalation uses sample/non-personal contact labels; no real staff names; smoke 16/16; live route check passed; admin proxy 403 confirmed; checkpoint ac2d6ac |
| [Pilot identity and environment decision record (4S.95A, amended 4S.95B-R)](4s95a-pilot-identity-and-environment-decision-record.md) | Docs-only decision record -- authoritative pre-migration reference for organisation_id, Supabase project (Section 2B supersedes new-project assumption: reuse existing `worktwin-care-pilot` with `thumhara-centre` isolation, updated 4S.95B-R), bootstrap admin, membership model, middleware scope, admin proxy, DPA/governance prerequisites, QCS content restrictions, JWT wording, and next-slice sequence (4S.95C–4S.95I); checkpoint 04fc14c |

## Product and planning

| Document | Notes |
|---|---|
| [Product vision](product-vision.md) | Platform overview and privacy-first model |
| [Care pilot overview](care-pilot.md) | Care vertical context, workflows and safety rules |
| [01 Product brief](01-product-brief.md) | High-level brief defining product goals and target market |
| [02 MVP scope](02-mvp-scope.md) | Feature scope and exclusions for the minimum viable product |
| [03 Demo script - care](03-demo-script-care.md) | Step-by-step script for running the care pilot demo |
| [04 Customer discovery](04-customer-discovery.md) | Research notes and findings from customer interviews |
| [05 Privacy and trust principles](05-privacy-trust-principles.md) | Core privacy rules and data handling commitments |
| [06 Landing page copy](06-landing-page-copy.md) | Marketing copy and messaging for the product landing page |
| [07 Technical architecture](07-technical-architecture.md) | System design, tech stack decisions and infrastructure notes |
| [08 First pilot offer](08-first-pilot-offer.md) | Pricing and terms for the first pilot client offer |
| [Documentation maintenance plan](documentation-maintenance-plan.md) | Plan for keeping project documentation consistent and up to date |

## Auth and security planning

All auth planning documents are design and documentation only. No auth code is active, no public auth is enabled, and no migrations have been run.

| Document | Notes |
|---|---|
| [Auth readiness review](auth-readiness-review.md) | Auth readiness assessment (4S.88A) — review and planning only, no auth activated |
| [Auth schema plan](auth-schema-plan.md) | Schema and membership design (4S.85C) — documentation only, no migration run |
| [Supabase auth configuration checklist](supabase-auth-configuration-checklist.md) | Dashboard checks required before any controlled auth activation (4S.88B) — no dashboard changes made |
| [Auth dependencies and environment plan](auth-dependencies.md) | Package and environment dependencies for auth (4S.85B) — documentation only, no packages installed |
| [Auth implementation checklist](auth-implementation-checklist.md) | Implementation checklist (4S.85A) — design only, no auth code implemented |
| [Pilot security boundary](pilot-security-boundary.md) | Security boundary design (4S.83) — admin proxy disabled publicly |
| [Admin proxy hardening plan](admin-proxy-hardening-plan.md) | Admin proxy hardening design (4S.84) — disabled publicly |

## Demo and external review

| Document | Notes |
|---|---|
| [Staff demo walkthrough](staff-demo-walkthrough.md) | Staff-facing pilot journey, safety controls, live proof checks and known limitations |
| [External review pack](external-review-pack.md) | Independent review pack for external technical and design reviewers |

## Historical review snapshots

The following are historical review snapshots taken at a point in time. Some findings have since been addressed in subsequent milestones. Do not treat them as current without first checking current-state.md and later alignment docs.

| Document | Notes |
|---|---|
| [Engineering review (Claude Code)](reviews/claude-code-engineering-review.md) | Code quality and architecture assessment (milestone 4S.74) |
| [Strict technical review (Codex)](reviews/codex-strict-technical-review.md) | Strict technical audit (milestone 4S.76) |
| [Design and UX mobile review (Claude)](reviews/claude-design-ux-mobile-review.md) | Mobile UX and design assessment (milestone 4S.77) |
| [Consolidated 10-10 roadmap](reviews/consolidated-10-10-roadmap.md) | Consolidated roadmap from review findings (milestone 4S.78) |
