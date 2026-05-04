// Milestone 4S.2A -- Server-side proxy for admin/document endpoints.
// ADMIN_TOKEN stays server-side; the browser never receives or sends it.
// Proxy is disabled unless ADMIN_PROXY_ENABLED=true in the deployment environment.
//
// SECURITY NOTE (interim):
// - ADMIN_TOKEN stays server-side; never exposed to the browser.
// - Proxy is disabled unless ADMIN_PROXY_ENABLED=true.
// - This is not a replacement for real admin session auth; a later milestone
//   must add proper session protection before real users access the admin area.
//
// Milestone 4S.85G-3 -- Deny-by-default path/method guard.
// ADMIN_ALLOWLIST and classifyPath live in lib/admin-proxy-allowlist.ts so that
// Playwright tests can import them without pulling in Next.js server modules.
import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_ALLOWLIST, classifyPath } from '@/lib/admin-proxy-allowlist'

// Allow up to 120 s on Vercel -- generate-embeddings can take that long
export const maxDuration = 120

const ADMIN_PROXY_ENABLED = process.env.ADMIN_PROXY_ENABLED === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? ''
const BACKEND_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ''

// Roles that are permitted to use the admin proxy at all.
// Others (staff, registered_manager, unknown) are denied before ADMIN_TOKEN/BACKEND_URL checks.
const ADMIN_CAPABLE_ROLES: readonly string[] = ['organisation_admin', 'worktwin_dev_admin']

type AdminSessionContext = {
  userId: string
  role: string
  active: boolean
}

// 4S.85G-5: Session seam -- returns null (unauthenticated) until real Supabase
// session validation is added in a later 4S.85G slice.
// Never derive user_id, organisation_id, or role from client headers in production.
// Test-only: x-worktwin-test-admin-role / x-worktwin-test-admin-active are accepted
// only when NODE_ENV=test or PLAYWRIGHT_TEST is set. Never active in production.
function getAdminProxySessionContext(
  request: NextRequest,
): AdminSessionContext | null {
  const isTestMode =
    process.env.NODE_ENV === 'test' || !!process.env.PLAYWRIGHT_TEST
  if (isTestMode) {
    const role = request.headers.get('x-worktwin-test-admin-role')
    if (role) {
      const activeHeader = request.headers.get('x-worktwin-test-admin-active')
      const active = activeHeader !== 'false'
      return { userId: 'test-user', role, active }
    }
  }
  return null
}

async function proxyHandler(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<NextResponse> {
  // Disabled guard must remain first -- all active Playwright tests depend on this 403.
  if (!ADMIN_PROXY_ENABLED) {
    return NextResponse.json(
      { detail: 'Admin proxy is disabled for this deployment.' },
      { status: 403 },
    )
  }

  const classified = classifyPath(params.path)
  if (classified.match === 'not_found') {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
  }

  const allowedMethods = ADMIN_ALLOWLIST[classified.routeKey].methods as readonly string[]
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json({ detail: 'Method not allowed.' }, { status: 405 })
  }

  // 4S.85G-5: Session guard -- must come before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  // Real Supabase session validation and membership lookup will replace this in later 4S.85G slices.
  const session = getAdminProxySessionContext(request)
  if (!session) {
    return NextResponse.json({ detail: 'Authentication required.' }, { status: 401 })
  }

  // 4S.85G-5: Role/membership guard -- before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  if (!ADMIN_CAPABLE_ROLES.includes(session.role)) {
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }
  if (!session.active) {
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }

  // 4S.85G-6: Route-specific role allowlist -- before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  if (!(ADMIN_ALLOWLIST[classified.routeKey].roles as readonly string[]).includes(session.role)) {
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }

  // 4S.85G-7: CSRF/same-site guard -- POST and PATCH only; GET bypasses.
  // Test-only: x-worktwin-test-csrf: test accepted when NODE_ENV=test or PLAYWRIGHT_TEST is set.
  // Production/non-test mode fails closed -- a real CSRF mechanism must be added before go-live.
  if (request.method === 'POST' || request.method === 'PATCH') {
    const isTestMode = process.env.NODE_ENV === 'test' || !!process.env.PLAYWRIGHT_TEST
    const csrfValid = isTestMode && request.headers.get('x-worktwin-test-csrf') === 'test'
    if (!csrfValid) {
      return NextResponse.json({ detail: 'CSRF check failed.' }, { status: 403 })
    }
  }

  if (!ADMIN_TOKEN || !BACKEND_URL) {
    return NextResponse.json({ detail: 'Admin proxy not configured.' }, { status: 503 })
  }

  const backendPath = params.path.join('/')
  const backendUrl = `${BACKEND_URL}/${backendPath}${request.nextUrl.search}`

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  }
  // Forward Content-Type verbatim -- multipart/form-data must include its boundary
  const contentType = request.headers.get('content-type')
  if (contentType) forwardHeaders['Content-Type'] = contentType

  // blob() forwards body without re-parsing, preserving multipart form boundaries
  const requestBody: BodyInit | null =
    request.method !== 'GET' ? await request.blob() : null

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: requestBody,
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable.' }, { status: 502 })
  }

  const responseBlob = await upstream.blob()
  return new NextResponse(responseBlob, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}

export const GET = proxyHandler
export const POST = proxyHandler
export const PATCH = proxyHandler
// DELETE is exported so method-guard tests can reach the 405 path; it never forwards.
export const DELETE = proxyHandler
