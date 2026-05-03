// Milestone 4S.85G — Admin proxy test foundation.
// Tests the catch-all route at /api/admin/[...path].
//
// ACTIVE: disabled-proxy baseline (ADMIN_PROXY_ENABLED absent/false → 403).
// SKIPPED: all hardening cases that need implementation not yet written.
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Disabled-proxy baseline — no env changes needed, runs in dev environment
// ---------------------------------------------------------------------------

test.describe('Admin proxy — disabled baseline', () => {
  test('GET /api/admin/documents returns 403 when proxy disabled', async ({ request }) => {
    const response = await request.get('/api/admin/documents')
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toMatch(/disabled/i)
  })

  test('POST /api/admin/documents/search-vector returns 403 when proxy disabled', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toMatch(/disabled/i)
  })

  test('disabled proxy returns exact detail message — confirms no forwarding attempted', async ({
    request,
  }) => {
    // Any message other than this exact string (e.g. "Backend unreachable" or a real
    // backend response) would mean the 403 guard was bypassed and a forward attempted.
    const response = await request.get('/api/admin/documents')
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toBe('Admin proxy is disabled for this deployment.')
  })
})

// ---------------------------------------------------------------------------
// Authentication & authorisation — requires session auth middleware (TODO)
// ---------------------------------------------------------------------------

test.describe('Admin proxy — authentication and authorisation (TODO)', () => {
  test.skip('unauthenticated request returns 401 when proxy enabled', async () => {
    // Needs: ADMIN_PROXY_ENABLED=true + Supabase session check added to route handler
  })

  test.skip('staff role returns 403 when proxy enabled', async () => {
    // Needs: session auth + role check; staff role must be denied at proxy layer
  })

  test.skip('registered_manager role returns 403 when proxy enabled', async () => {
    // Needs: session auth + role check; registered_manager must be denied
  })

  test.skip('inactive membership returns 403 when proxy enabled', async () => {
    // Needs: is_active membership status check added to route handler
  })

  test.skip('organisation_admin GET /api/admin/documents is allowed', async () => {
    // Needs: session auth + role check; organisation_admin allowed on GET
  })

  test.skip('organisation_admin POST /api/admin/documents/search-vector is denied', async () => {
    // Needs: per-method + per-path ACL; organisation_admin blocked on search-vector POST
  })

  test.skip('worktwin_dev_admin POST /api/admin/documents/search-vector is allowed', async () => {
    // Needs: worktwin_dev_admin role check; this role is allowed on search-vector POST
  })
})

// ---------------------------------------------------------------------------
// Path and method validation — requires proxy enabled or route-level guards (TODO)
// ---------------------------------------------------------------------------

test.describe('Admin proxy — path and method validation (TODO)', () => {
  test.skip('unknown path returns 404 when proxy enabled', async () => {
    // Needs: proxy enabled + route allow-list or backend passes 404 back through proxy
  })

  test.skip('disallowed method DELETE returns 405', async () => {
    // Needs: proxy enabled; DELETE is not exported by the route — Next.js returns 405
  })
})

// ---------------------------------------------------------------------------
// Upload safety — requires proxy-layer guards not yet implemented (TODO)
// ---------------------------------------------------------------------------

test.describe('Admin proxy — upload safety (TODO)', () => {
  test.skip('upload with wrong Content-Type returns 415', async () => {
    // Needs: Content-Type allow-list guard in route (PDF-only enforcement at proxy layer)
  })

  test.skip('upload exceeding size limit returns 413', async () => {
    // Needs: request body size cap added to route or Next.js config bodyParser limit
  })

  test.skip('PATCH without CSRF token returns 403', async () => {
    // Needs: CSRF double-submit or header-check middleware added to route handler
  })
})
