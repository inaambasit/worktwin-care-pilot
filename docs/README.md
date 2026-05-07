# WorkTwin Care Pilot - Docs Index

> Controlled prototype. Not production-ready. Public auth disabled. Admin proxy disabled publicly. Real staff and pilot use blocked pending auth completion and safety sign-off.

## Current state

| Document | Notes |
|---|---|
| [Current state](current-state.md) | **Main source of truth.** Current checkpoint, feature state, blockers, demo posture and do-not-touch list |
| [Policy upload and AI testing tracker](policy-upload-testing-tracker.md) | Source of truth for policy and document governance, upload testing scope and results |
| [Auth E2E proof blocker (4S.88G)](4s88g-auth-e2e-proof-blocker.md) | Current auth E2E blocker record — blocked pending safe migration path |

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
