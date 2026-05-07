# Documentation Maintenance Plan

Milestone: 4S.68
Date: 2026-05-03
Status: Active

---

## 1. Purpose

This document captures the state of the project's four README files as of milestone 4S.68 and defines the
agreed roadmap for bringing them up to date. The goal is a consistent, readable documentation baseline
that accurately reflects the current state of the WorkTwin Care Pilot demo build.

Documentation work is isolated from app work. No milestone in this plan touches application code,
backend logic, frontend logic, environment configuration, packages, governance flags, RAG behaviour,
or admin behaviour. Each milestone covers exactly one README file and is committed separately once
the diff has been reviewed.

---

## 2. The Four README Files and Their Responsibilities

| File | Responsibility |
|---|---|
| `README.md` | Top-level project overview. Entry point for anyone new to the repository. Covers what the project is, why it exists, the tech stack, how to run locally, and the current milestone status. |
| `backend/README.md` | Backend-specific detail. Covers the FastAPI app structure, API endpoints, environment variables, safety rules, and how to run the Python service. |
| `frontend/README.md` | Frontend-specific detail. Covers the Next.js app structure, pages, key components, environment variables, and how to run the Next.js dev server. |
| `docs/README.md` | Docs index. Acts as a table of contents for everything under the `docs/` directory and gives a one-paragraph summary of each document. |

---

## 3. Current Issues Found in Each README

### `README.md`

- Encoding and mojibake issues throughout (corrupted punctuation, special characters rendered as gibberish).
- Content is outdated: does not reflect milestones past the early M4 phase.
- Does not mention the admin proxy introduced in 4S.2A.
- Does not mention the mobile-responsive staff app shipped in ada2852.
- Does not mention the Vercel and Render environment variable requirements introduced in 4S.2A.

### `backend/README.md`

- Encoding and mojibake issues throughout (corrupted punctuation, special characters rendered as gibberish).
- Content is largely correct for the API endpoints and environment variables but has grown stale in places.
- Does not clearly note the admin safety status: admin routes are protected by bearer token; the
  server-side proxy in the frontend means `NEXT_PUBLIC_ADMIN_TOKEN` has been removed.
- Some sections describe intended future behaviour as if it is already implemented.

### `frontend/README.md`

- No encoding issues. File is clean ASCII.
- Content is significantly outdated: still describes the frontend as a starter/placeholder.
- Does not list the full set of pages now in the app (including `/policies`, `/admin/documents`,
  `/admin/insights`, `/admin/roles`, `/admin/escalation`).
- Does not mention the server-side admin proxy (`frontend/app/api/admin/[...path]/route.ts`).
- Does not mention mobile responsiveness or the mobile drawer navigation added in ada2852.
- Does not mention the environment variables (`NEXT_PUBLIC_API_URL`, `API_BASE_URL`, `ADMIN_TOKEN`).

### `docs/README.md`

- No encoding issues. File is clean and newly written.
- Content is current as of its creation but will need a one-line entry added once
  `docs/documentation-maintenance-plan.md` (this file) exists.

---

## 4. Documentation Roadmap

### 4S.69 -- Clean encoding in root README and backend README

Scope: `README.md` and `backend/README.md` only.
Work: Replace or remove all mojibake and corrupted punctuation. Use plain ASCII punctuation throughout.
Do not change meaning, do not add content, do not restructure sections.
Commit: One commit covering both files. Diff review before commit.

### 4S.70 -- Update root README as the main current project overview

Scope: `README.md` only.
Work: Rewrite the content (after encoding is clean from 4S.69) to reflect:
- Current milestone status (up to and including 4S.68).
- Correct tech stack (Next.js 14, FastAPI, Supabase, Render, Vercel).
- Current environment variable requirements (Vercel and Render sides).
- Admin proxy architecture (server-side proxy, no NEXT_PUBLIC_ADMIN_TOKEN in browser).
- Mobile-responsive staff app (drawer navigation on mobile, desktop sidebar on wider screens).
- How to run locally (backend and frontend commands).
- Privacy guarantee summary (one paragraph).
Commit: One commit covering README.md only. Diff review before commit.

### 4S.71 -- Update frontend README to reflect the polished and mobile-responsive staff demo

Scope: `frontend/README.md` only.
Work: Replace the placeholder/starter description with an accurate summary of the frontend. Include:
- Full list of pages and their purpose.
- Key components (navigation, escalation sidebar, mobile drawer).
- Environment variables required (`NEXT_PUBLIC_API_URL`, `API_BASE_URL`, `ADMIN_TOKEN`).
- Admin proxy route and why it exists (server-side token, no browser exposure).
- Mobile responsiveness note (drawer on mobile, sidebar hidden on small screens).
- How to run the dev server.
Commit: One commit covering frontend/README.md only. Diff review before commit.

### 4S.72 -- Light backend README update to reflect current backend/admin safety status

Scope: `backend/README.md` only.
Work: After encoding is clean from 4S.69, make targeted updates to:
- Clarify that `NEXT_PUBLIC_ADMIN_TOKEN` has been removed; admin token is now server-only.
- Correct any sections that describe future behaviour as current.
- No structural rewrite. Targeted edits only, reviewed line by line.
Commit: One commit covering backend/README.md only. Diff review before commit.

### 4S.73 -- Final docs consistency check across all four project READMEs

Scope: Any of the four README files, plus `docs/README.md` index entry for this plan file.
Work: Read all four files in sequence. Check:
- No file contradicts another on facts (tech stack, env vars, URLs, milestone status).
- `docs/README.md` index includes an entry for `docs/documentation-maintenance-plan.md`.
- UK English throughout all four files.
- Plain ASCII punctuation throughout all four files.
- No encoding issues remain.
Small corrections only. If a larger change is needed, note it and raise a new milestone.
Commit: One commit per file changed. Diff review before each commit.

---

## 5. Rules

The following rules apply to every milestone in this plan.

- One README per milestone. Do not edit two README files in the same milestone unless the milestone
  explicitly lists both (as 4S.69 does for the encoding pass).
- No app code changes. No backend logic changes. No frontend logic changes.
- No environment or package changes.
- No governance flag changes. No RAG behaviour changes. No admin behaviour changes.
- No large rewrite without a diff review. Inspect the diff before committing.
- Commit each clean documentation milestone separately with a clear commit message.
- UK English throughout.
- Plain ASCII punctuation only. No smart quotes, no em dashes, no non-breaking spaces.
- If an encoding issue is found during any milestone other than 4S.69, fix it in that file at that
  milestone rather than deferring it.

---

## 6. 2026-05-07 alignment log -- 4S.89F to 4S.89L

Documentation drift after `1e75756 Align current-state documentation` was reviewed and addressed
across the current documentation set.

- The active truth layer now starts with `docs/current-state.md`. All other docs should be read
  against it, not instead of it.
- `docs/policy-upload-testing-tracker.md` is the policy and document governance source of truth.
- `docs/4s88g-auth-e2e-proof-blocker.md` is the current auth E2E blocker record.
- Root README, backend README, frontend README, staff demo walkthrough, external review pack,
  auth docs (`auth-readiness-review.md`, `auth-schema-plan.md`, `supabase-auth-configuration-checklist.md`,
  `auth-dependencies.md`, `auth-implementation-checklist.md`), and `docs/README.md` index have been
  aligned to the current state as of this log entry.
- Historical Claude Code, Codex, and Claude Design review snapshots under `docs/reviews/` remain
  useful for understanding earlier decisions but must be read as dated snapshots, not current truth.
  Some findings have been addressed in subsequent milestones; check `docs/current-state.md` first.
- Future technical changes should update `docs/current-state.md` first if they alter any of:
  readiness scores or blockers, auth state or PILOT_AUTH_MODE, admin proxy real session/CSRF/RBAC,
  policy governance or document lane assignments, staff visibility or RAG behaviour, or pilot
  readiness posture.
- Do not claim production readiness unless auth E2E proof (4S.88G), DPA/legal sign-off, QCS
  AI/RAG confirmation, governance gate tests, and admin proxy real session/CSRF/RBAC are all
  complete.

### Maintenance rules

- Every milestone that changes truth must update `docs/current-state.md`.
- Every policy or document governance change must update `docs/policy-upload-testing-tracker.md`.
- Every auth blocker or resolution must update `docs/4s88g-auth-e2e-proof-blocker.md` or the
  relevant auth doc.
- Review docs under `docs/reviews/` are snapshots and must not be silently rewritten to match
  later state; add a dated note if a finding has been addressed.
- README files should point to `docs/current-state.md` for current state rather than duplicating
  every detail.
