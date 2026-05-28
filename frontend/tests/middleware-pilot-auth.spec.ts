/**
 * Middleware route protection tests — 4S.103C-2.
 *
 * NEXT_PUBLIC_PILOT_AUTH_MODE limitation
 * ──────────────────────────────────────
 * Next.js embeds NEXT_PUBLIC_* vars at dev-server / build start time.
 * Playwright cannot toggle this env var between tests without restarting
 * the dev server.  The second describe block (pilot-auth mode) is therefore
 * skipped by default.
 *
 * To run pilot-auth tests locally:
 *   cd frontend
 *   NEXT_PUBLIC_PILOT_AUTH_MODE=true npm run dev
 *   # in a second terminal (or with reuseExistingServer: false):
 *   NEXT_PUBLIC_PILOT_AUTH_MODE=true npx playwright test tests/middleware-pilot-auth.spec.ts
 *
 * The test runner process must also carry the var so that the PILOT_AUTH_ENABLED
 * flag below evaluates to true and the skip condition is lifted.
 *
 * Login page error-message tests (bottom of file) do not require the server to
 * be running in pilot-auth mode — the login page is always public.
 */

import { test, expect } from '@playwright/test'

const PILOT_AUTH_ENABLED = process.env.NEXT_PUBLIC_PILOT_AUTH_MODE === 'true'

const STAFF_PATHS = [
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
]

// ─── Default / public-demo mode (fail-open) ──────────────────────────────────

test.describe('Middleware — public demo mode (NEXT_PUBLIC_PILOT_AUTH_MODE not set)', () => {
  test.skip(
    PILOT_AUTH_ENABLED,
    'Server is running in pilot-auth mode — skip public-demo assertions'
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

// ─── Pilot-auth mode (requires NEXT_PUBLIC_PILOT_AUTH_MODE=true server) ──────

test.describe('Middleware — pilot-auth mode (NEXT_PUBLIC_PILOT_AUTH_MODE=true)', () => {
  test.skip(
    !PILOT_AUTH_ENABLED,
    'Start both the dev server and the Playwright runner with NEXT_PUBLIC_PILOT_AUTH_MODE=true to run these tests'
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
