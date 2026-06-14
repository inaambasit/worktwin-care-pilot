/**
 * Middleware route protection tests — 4S.103C-2, updated 4S.109B.
 *
 * Fail-closed rule (4S.109B)
 * ──────────────────────────
 * Staff routes are GATED by default. The gate is skipped only when
 * NEXT_PUBLIC_PILOT_AUTH_MODE is explicitly a recognised demo value
 * (false / 0 / off / no / demo). Missing / empty / mistyped / "true" all keep
 * the gate ON. This mirrors middleware.ts:pilotAuthRequired().
 *
 * NEXT_PUBLIC_PILOT_AUTH_MODE limitation
 * ──────────────────────────────────────
 * Next.js embeds NEXT_PUBLIC_* vars at dev-server / build start time.
 * Playwright cannot toggle this env var between tests without restarting the
 * dev server, so the two describe blocks below are selected by the value the
 * server (and runner) were started with: the explicit-demo block runs when the
 * gate is OFF; the auth-gated block runs when the gate is ON (the default,
 * including when the var is unset).
 *
 * To run the auth-gated assertions locally:
 *   cd frontend
 *   # the gate is ON by default (var unset) — or set it explicitly:
 *   NEXT_PUBLIC_PILOT_AUTH_MODE=true npm run dev
 *   NEXT_PUBLIC_PILOT_AUTH_MODE=true npx playwright test tests/middleware-pilot-auth.spec.ts
 *
 * To run the explicit-demo assertions, start both the dev server and the runner
 * with a recognised demo value, e.g. NEXT_PUBLIC_PILOT_AUTH_MODE=false.
 *
 * Login page error-message tests (bottom of file) do not depend on the mode —
 * the login page is always public.
 */

import { test, expect } from '@playwright/test'

const PILOT_AUTH_EXPLICIT_DEMO_VALUES = new Set(['false', '0', 'off', 'no', 'demo'])
const PILOT_AUTH_GATED = !PILOT_AUTH_EXPLICIT_DEMO_VALUES.has(
  (process.env.NEXT_PUBLIC_PILOT_AUTH_MODE ?? '').trim().toLowerCase()
)

const STAFF_PATHS = [
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
]

// ─── Explicit demo mode (gate OFF — requires a recognised demo value) ─────────

test.describe('Middleware — explicit demo mode (NEXT_PUBLIC_PILOT_AUTH_MODE=false/0/off/no/demo)', () => {
  test.skip(
    PILOT_AUTH_GATED,
    'Staff gate is ON (default / not an explicit demo value) — skip demo-open assertions'
  )

  test('all staff pages remain accessible (no redirect to /login)', async ({ page }) => {
    test.setTimeout(60_000)
    for (const path of STAFF_PATHS) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const url = new URL(page.url())
      expect(url.pathname, `${path} should not redirect to /login`).not.toBe('/login')
      expect(url.pathname, `${path} should stay on its own path`).toBe(path)
    }
  })

  test('/login is accessible and does not redirect to itself', async ({ page }) => {
    await page.goto('/login')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    await expect(page.getByRole('heading', { name: 'Sign in to WorkTwin' })).toBeVisible()
  })

  test('/book-pilot is accessible', async ({ page }) => {
    await page.goto('/book-pilot')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/book-pilot')
    await expect(page.getByRole('heading', { name: 'Book a WorkTwin Care Pilot' })).toBeVisible()
  })

  test('/admin is accessible without redirect in public demo mode', async ({ page }) => {
    await page.goto('/admin')
    const url = new URL(page.url())
    expect(url.pathname).not.toBe('/login')
  })
})

// ─── Auth-gated mode (gate ON — the fail-closed default, incl. unset/true) ───

test.describe('Middleware — auth-gated mode (gate ON: unset / true / unrecognised)', () => {
  test.skip(
    !PILOT_AUTH_GATED,
    'Server is in explicit demo mode (gate OFF) — skip auth-gated assertions'
  )

  test('unauthenticated /dashboard redirects to /login?next=/dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/dashboard')
  })

  test('unauthenticated /ask redirects to /login?next=/ask', async ({ page }) => {
    await page.goto('/ask')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/ask')
  })

  test('unauthenticated /policies redirects to /login?next=/policies', async ({ page }) => {
    await page.goto('/policies')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/policies')
  })

  test('unauthenticated /notes redirects to /login?next=/notes', async ({ page }) => {
    await page.goto('/notes')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/notes')
  })

  test('unauthenticated /scenarios/access-refusal preserves safe nested next param', async ({
    page,
  }) => {
    await page.goto('/scenarios/access-refusal')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/scenarios/access-refusal')
  })

  test('/login is not redirected (stays on /login)', async ({ page }) => {
    await page.goto('/login')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
  })

  test('/book-pilot is not redirected', async ({ page }) => {
    await page.goto('/book-pilot')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/book-pilot')
  })

  test('admin routes are not gated by the staff session-check middleware', async ({ page }) => {
    // Admin routes are not in STAFF_ROOTS — they have their own API-proxy auth layer.
    // The staff gate must not redirect /admin to /login.
    await page.goto('/admin')
    const url = new URL(page.url())
    expect(url.pathname).not.toBe('/login')
  })
})

// ─── Login page error messages (always runs — login page is always public) ───

test.describe('Login page — staff session-check error messages', () => {
  test('access_denied error renders safe wording', async ({ page }) => {
    await page.goto('/login?error=access_denied')
    await expect(
      page.getByText(
        'Access has not been confirmed for this pilot. Please speak to your organisation lead.'
      )
    ).toBeVisible()
  })

  test('auth_unavailable error renders safe wording', async ({ page }) => {
    await page.goto('/login?error=auth_unavailable')
    await expect(
      page.getByText(
        'We could not confirm pilot access just now. Please try again later or speak to your organisation lead.'
      )
    ).toBeVisible()
  })

  test('access_denied message does not reveal membership, role, or organisation details', async ({
    page,
  }) => {
    await page.goto('/login?error=access_denied')
    await expect(page.getByText(/membership/i)).not.toBeVisible()
    await expect(page.getByText(/role/i)).not.toBeVisible()
    await expect(page.getByText(/organisation_id/i)).not.toBeVisible()
    await expect(page.getByText(/email.*exist/i)).not.toBeVisible()
  })

  test('auth_unavailable message does not reveal internal error detail', async ({ page }) => {
    await page.goto('/login?error=auth_unavailable')
    await expect(page.getByText(/membership/i)).not.toBeVisible()
    await expect(page.getByText(/500|503|database|fetch/i)).not.toBeVisible()
  })
})
