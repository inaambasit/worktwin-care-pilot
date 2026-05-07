/**
 * Middleware route protection tests.
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
    for (const path of STAFF_PATHS) {
      await page.goto(path)
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

  test('unauthenticated /notes redirects to /login?next=/notes', async ({ page }) => {
    await page.goto('/notes')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('next')).toBe('/notes')
  })

  test('unauthenticated /scenarios/access-refusal redirects to /login?next=/scenarios/access-refusal', async ({
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

  test('/admin is not protected by this middleware slice', async ({ page }) => {
    await page.goto('/admin')
    const url = new URL(page.url())
    // Admin route protection is a separate concern — must not redirect to /login here
    expect(url.pathname).not.toBe('/login')
    expect(url.pathname).toBe('/admin')
  })
})
