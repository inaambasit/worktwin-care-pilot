// Milestone 4S.85G -- Admin proxy test foundation.
// Tests the catch-all route at /api/admin/[...path].
//
// ACTIVE: disabled-proxy baseline (ADMIN_PROXY_ENABLED absent/false -> 403).
// ACTIVE: allowlist classification unit-style tests (import helper directly, no HTTP).
// ACTIVE (conditional): path/method guard tests -- skip unless ADMIN_PROXY_ENABLED=true in dev server.
// ACTIVE (conditional): 401 session guard test -- skip unless ADMIN_PROXY_ENABLED=true in dev server.
// ACTIVE (conditional): CSRF guard tests -- skip unless ADMIN_PROXY_ENABLED=true in dev server.
// ACTIVE (conditional): upload safety guards -- skip unless ADMIN_PROXY_ENABLED=true in dev server (4S.85G-8).
import { test, expect } from '@playwright/test'
import { classifyPath, ADMIN_ALLOWLIST, isDebugToolingRoute } from '../lib/admin-proxy-allowlist'

// ---------------------------------------------------------------------------
// Disabled-proxy baseline -- no env changes needed, runs in dev environment
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- disabled baseline', () => {
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

  test('disabled proxy returns exact detail message -- confirms no forwarding attempted', async ({
    request,
  }) => {
    // Any message other than this exact string (e.g. "Backend unreachable" or a real
    // backend response) would mean the 403 guard was bypassed and a forward attempted.
    const response = await request.get('/api/admin/documents')
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toBe('Admin proxy is disabled for this deployment.')
  })

  test('all admin proxy responses include Cache-Control: no-store', async ({ request }) => {
    const response = await request.get('/api/admin/documents')
    expect(response.headers()['cache-control']).toBe('no-store')
  })
})

// ---------------------------------------------------------------------------
// Allowlist classification -- unit-style, no HTTP, safe while proxy is disabled
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- allowlist classification (unit-style)', () => {
  test('unknown path is classified as not found (would be 404)', () => {
    const result = classifyPath(['completely-unknown-resource'])
    expect(result.match).toBe('not_found')
  })

  test('DELETE on documents is not in allowed methods (would be 405)', () => {
    const result = classifyPath(['documents'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].methods).not.toContain('DELETE')
    }
  })

  test('organisation_admin is in allowed roles for documents', () => {
    const result = classifyPath(['documents'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).toContain('organisation_admin')
    }
  })

  test('organisation_admin is not in allowed roles for documents/search-vector', () => {
    const result = classifyPath(['documents', 'search-vector'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).not.toContain('organisation_admin')
    }
  })

  test('worktwin_dev_admin is allowed for documents/search-vector', () => {
    const result = classifyPath(['documents', 'search-vector'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).toContain('worktwin_dev_admin')
    }
  })

  test('extra segment after documents/{id}/governance is rejected', () => {
    const result = classifyPath(['documents', '123', 'governance', 'extra'])
    expect(result.match).toBe('not_found')
  })

  test('extra segment after documents/{id}/generate-embeddings is rejected', () => {
    const result = classifyPath(['documents', '123', 'generate-embeddings', 'extra'])
    expect(result.match).toBe('not_found')
  })

  test('extra segment after debug/storage-config is rejected', () => {
    const result = classifyPath(['debug', 'storage-config', 'extra'])
    expect(result.match).toBe('not_found')
  })

  test('extra segment after documents/upload is rejected', () => {
    const result = classifyPath(['documents', 'upload', 'extra'])
    expect(result.match).toBe('not_found')
  })

  test('organisation_admin is not in allowed roles for documents/answer-debug', () => {
    const result = classifyPath(['documents', 'answer-debug'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).not.toContain('organisation_admin')
    }
  })

  test('organisation_admin is not in allowed roles for debug/storage-config', () => {
    const result = classifyPath(['debug', 'storage-config'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).not.toContain('organisation_admin')
    }
  })

  test('worktwin_dev_admin is allowed for documents/answer-debug', () => {
    const result = classifyPath(['documents', 'answer-debug'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).toContain('worktwin_dev_admin')
    }
  })

  test('worktwin_dev_admin is allowed for debug/storage-config', () => {
    const result = classifyPath(['debug', 'storage-config'])
    expect(result.match).toBe('found')
    if (result.match === 'found') {
      expect(ADMIN_ALLOWLIST[result.routeKey].roles).toContain('worktwin_dev_admin')
    }
  })

  test('isDebugToolingRoute returns true for documents/search-vector', () => {
    expect(isDebugToolingRoute('documents/search-vector')).toBe(true)
  })

  test('isDebugToolingRoute returns true for documents/answer-debug', () => {
    expect(isDebugToolingRoute('documents/answer-debug')).toBe(true)
  })

  test('isDebugToolingRoute returns true for debug/storage-config', () => {
    expect(isDebugToolingRoute('debug/storage-config')).toBe(true)
  })

  test('isDebugToolingRoute returns false for non-debug routes', () => {
    expect(isDebugToolingRoute('documents')).toBe(false)
    expect(isDebugToolingRoute('documents/upload')).toBe(false)
    expect(isDebugToolingRoute('documents/{id}')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Authentication & authorisation
// 401 session guard is now active (conditional on ADMIN_PROXY_ENABLED=true).
// Role, CSRF, and upload guards are all active (conditional on ADMIN_PROXY_ENABLED=true).
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- authentication and authorisation (TODO)', () => {
  test('unauthenticated request returns 401 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true in dev server',
    )
    const response = await request.get('/api/admin/documents')
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.detail).toBe('Authentication required.')
  })

  test('staff role returns 403 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.get('/api/admin/documents', {
      headers: { 'x-worktwin-test-admin-role': 'staff', 'x-worktwin-test-admin-active': 'true' },
    })
    expect(response.status()).toBe(403)
  })

  test('registered_manager role returns 403 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.get('/api/admin/documents', {
      headers: { 'x-worktwin-test-admin-role': 'registered_manager', 'x-worktwin-test-admin-active': 'true' },
    })
    expect(response.status()).toBe(403)
  })

  test('inactive membership returns 403 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.get('/api/admin/documents', {
      headers: { 'x-worktwin-test-admin-role': 'organisation_admin', 'x-worktwin-test-admin-active': 'false' },
    })
    expect(response.status()).toBe(403)
  })

  test('organisation_admin role is recognised as admin-capable (passes role guard)', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // 503 expected when ADMIN_TOKEN/BACKEND_URL absent; any status except 403 proves role guard passed
    const response = await request.get('/api/admin/documents', {
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).not.toBe(403)
  })

  test('worktwin_dev_admin role is recognised as admin-capable (passes role guard)', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // 503 expected when ADMIN_TOKEN/BACKEND_URL absent; any status except 403 proves role guard passed
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    expect(response.status()).not.toBe(403)
  })

  test('organisation_admin GET /api/admin/documents passes route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // organisation_admin is in documents.roles; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    const response = await request.get('/api/admin/documents', {
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).not.toBe(403)
  })

  test('organisation_admin POST /api/admin/documents/search-vector is blocked by route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // organisation_admin is NOT in documents/search-vector.roles (worktwin_dev_admin only)
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).toBe(403)
  })

  test('worktwin_dev_admin POST /api/admin/documents/search-vector passes route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // worktwin_dev_admin is in documents/search-vector.roles; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    expect(response.status()).not.toBe(403)
  })

  test('organisation_admin POST /api/admin/documents/answer-debug is blocked by route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // organisation_admin is NOT in documents/answer-debug.roles (worktwin_dev_admin only)
    const response = await request.post('/api/admin/documents/answer-debug', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).toBe(403)
  })

  test('organisation_admin GET /api/admin/debug/storage-config is blocked by route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // organisation_admin is NOT in debug/storage-config.roles (worktwin_dev_admin only)
    const response = await request.get('/api/admin/debug/storage-config', {
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).toBe(403)
  })

  test('worktwin_dev_admin POST /api/admin/documents/answer-debug passes route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // worktwin_dev_admin is in documents/answer-debug.roles; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    const response = await request.post('/api/admin/documents/answer-debug', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    expect(response.status()).not.toBe(403)
  })

  test('worktwin_dev_admin GET /api/admin/debug/storage-config passes route-role guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // GET bypasses CSRF; worktwin_dev_admin in debug/storage-config.roles; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    const response = await request.get('/api/admin/debug/storage-config', {
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).not.toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Path and method validation -- proxy-enabled local/test mode
// Run with ADMIN_PROXY_ENABLED=true in the dev-server environment to activate.
// Each test skips itself when ADMIN_PROXY_ENABLED is not set (safe for CI).
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- path and method validation', () => {
  test('unknown path returns 404 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true in dev server',
    )
    const response = await request.get('/api/admin/completely-unknown-resource')
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body).toHaveProperty('detail')
  })

  test('DELETE /api/admin/documents returns 405 when proxy enabled', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true in dev server',
    )
    const response = await request.delete('/api/admin/documents')
    expect(response.status()).toBe(405)
    const body = await response.json()
    expect(body).toHaveProperty('detail')
  })
})

// ---------------------------------------------------------------------------
// CSRF/same-site guard (4S.85G-7)
// GET bypasses CSRF; POST and PATCH require a valid same-site proof.
// Test-only proof: x-worktwin-test-csrf: test, accepted only when PLAYWRIGHT_TEST is set.
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- CSRF guard', () => {
  test('GET /api/admin/documents with organisation_admin does not require CSRF (passes to 503)', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.get('/api/admin/documents', {
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    // GET bypasses CSRF; no ADMIN_TOKEN/BACKEND_URL in test -> 503
    expect(response.status()).toBe(503)
  })

  test('POST /api/admin/documents/search-vector with worktwin_dev_admin and no CSRF returns 403', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toBe('CSRF check failed.')
  })

  test('POST /api/admin/documents/search-vector with worktwin_dev_admin and valid test CSRF passes CSRF guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.post('/api/admin/documents/search-vector', {
      data: { query: 'test' },
      headers: {
        'x-worktwin-test-admin-role': 'worktwin_dev_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    // CSRF guard passed; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    expect(response.status()).not.toBe(403)
  })

  test('PATCH /api/admin/documents/123/governance with organisation_admin and no CSRF returns 403', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.patch('/api/admin/documents/123/governance', {
      data: {},
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
      },
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.detail).toBe('CSRF check failed.')
  })

  test('PATCH /api/admin/documents/123/governance with organisation_admin and valid test CSRF passes CSRF guard', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.patch('/api/admin/documents/123/governance', {
      data: {},
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    // CSRF guard passed; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    expect(response.status()).not.toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Upload safety guards (4S.85G-8)
// Run with ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server.
// ---------------------------------------------------------------------------

test.describe('Admin proxy -- upload safety', () => {
  test('POST /api/admin/documents/upload with wrong Content-Type returns 415', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.post('/api/admin/documents/upload', {
      data: '{}',
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
        'content-type': 'application/json',
      },
    })
    expect(response.status()).toBe(415)
    const body = await response.json()
    expect(body.detail).toBe('Unsupported media type.')
  })

  test('POST /api/admin/documents/upload exceeding size limit returns 413', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    // Body exceeds ADMIN_PROXY_UPLOAD_MAX_BYTES (10 * 1024 * 1024); Node.js sets content-length automatically.
    const oversizedBody = 'x'.repeat(10 * 1024 * 1024 + 1)
    const response = await request.post('/api/admin/documents/upload', {
      data: oversizedBody,
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
        'content-type': 'multipart/form-data; boundary=----TestBoundary',
      },
    })
    expect(response.status()).toBe(413)
    const body = await response.json()
    expect(body.detail).toBe('Upload too large.')
  })

  test('POST /api/admin/documents/upload with multipart/form-data passes upload guards', async ({ request }) => {
    test.skip(
      !process.env.ADMIN_PROXY_ENABLED,
      'Requires ADMIN_PROXY_ENABLED=true and PLAYWRIGHT_TEST=true in dev server',
    )
    const response = await request.post('/api/admin/documents/upload', {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('test'),
        },
      },
      headers: {
        'x-worktwin-test-admin-role': 'organisation_admin',
        'x-worktwin-test-admin-active': 'true',
        'x-worktwin-test-csrf': 'test',
      },
    })
    // Upload guards passed; 503 expected when ADMIN_TOKEN/BACKEND_URL absent
    const status = response.status()
    expect(status).not.toBe(415)
    expect(status).not.toBe(413)
    expect(status).not.toBe(403)
  })
})
