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
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripAdminProxyResponseForRole } from '@/lib/admin-proxy-response-strip'

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

// 4S.85G-8: Proxy-layer cap for upload requests -- checked via Content-Length before reading body.
const ADMIN_PROXY_UPLOAD_MAX_BYTES = 10 * 1024 * 1024

// 4S.85G-9: Safe structured audit logging -- never logs secrets, bodies, paths, or personal data.
type AuditEvent = {
  component: 'admin_proxy'
  event_type: string
  method: string
  status: number
  decision: 'deny' | 'allow'
  reason: string
  route_key?: string
  role?: string
  active?: boolean
}

function auditAdminProxyEvent(event: AuditEvent): void {
  try {
    if (event.decision === 'deny') {
      console.warn(JSON.stringify(event))
    } else {
      console.info(JSON.stringify(event))
    }
  } catch {
    // swallow -- logging must never break request handling
  }
}

type AdminSessionContext = {
  userId: string
  organisationId: string
  role: string
  active: boolean
}

// 4S.90N-C: Session guard -- validates via Supabase SSR + backend /admin/session-check.
// Never derive user_id, organisation_id, or role from client headers in production.
// Test-only: x-worktwin-test-admin-role / x-worktwin-test-admin-active are accepted
// only when NODE_ENV=test or PLAYWRIGHT_TEST is set. Never active in production.
async function getAdminProxySessionContext(
  request: NextRequest,
): Promise<AdminSessionContext | null> {
  const isTestMode =
    process.env.NODE_ENV === 'test' || !!process.env.PLAYWRIGHT_TEST
  if (isTestMode) {
    const role = request.headers.get('x-worktwin-test-admin-role')
    if (role) {
      const activeHeader = request.headers.get('x-worktwin-test-admin-active')
      const active = activeHeader !== 'false'
      return { userId: 'test-user', organisationId: 'test-org', role, active }
    }
  }

  // Non-test mode: validate Supabase session then call backend session-check.
  try {
    if (!BACKEND_URL) return null

    const supabase = createServerSupabaseClient()

    // getSession to obtain the access token; validate it with getUser before trusting it.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token)
    if (userError || !user) return null

    const accessToken = session.access_token

    // Backend verifies organisation membership and role; ADMIN_TOKEN is not sent here.
    const checkResponse = await fetch(`${BACKEND_URL}/admin/session-check`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!checkResponse.ok) return null

    const body: unknown = await checkResponse.json()
    if (
      typeof body !== 'object' ||
      body === null ||
      (body as Record<string, unknown>).allowed !== true
    ) return null

    const { user_id, organisation_id, role, active } =
      body as Record<string, unknown>
    if (
      typeof user_id !== 'string' || !user_id ||
      typeof organisation_id !== 'string' || !organisation_id ||
      typeof role !== 'string' || !role ||
      typeof active !== 'boolean'
    ) return null

    return {
      userId: user_id,
      organisationId: organisation_id,
      role,
      active,
    }
  } catch {
    return null
  }
}

// 4S.90N-E: Same-origin / fetch-metadata CSRF check.
// Priority: (1) test seam, (2) Sec-Fetch-Site, (3) Origin fallback, (4) fail closed.
// Sec-Fetch-Site present: only same-origin is accepted; cross-site, same-site, none, or any
// other present value is rejected. Sec-Fetch-Site absent: Origin fallback is used and must
// exactly equal new URL(request.url).origin. Invalid or malformed URL fails closed.
// Never logs raw header values.
function isSameOriginAdminProxyRequest(request: NextRequest): boolean {
  const isTestMode = process.env.NODE_ENV === 'test' || !!process.env.PLAYWRIGHT_TEST
  if (isTestMode && request.headers.get('x-worktwin-test-csrf') === 'test') {
    return true
  }

  const secFetchSite = request.headers.get('Sec-Fetch-Site')
  if (secFetchSite !== null) {
    return secFetchSite === 'same-origin'
  }

  const originHeader = request.headers.get('Origin')
  if (!originHeader) {
    return false
  }

  try {
    const requestOrigin = new URL(request.url).origin
    return originHeader === requestOrigin
  } catch {
    return false
  }
}

async function proxyHandlerCore(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<NextResponse> {
  // Disabled guard must remain first -- all active Playwright tests depend on this 403.
  if (!ADMIN_PROXY_ENABLED) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 403, decision: 'deny', reason: 'proxy_disabled' })
    return NextResponse.json(
      { detail: 'Admin proxy is disabled for this deployment.' },
      { status: 403 },
    )
  }

  const classified = classifyPath(params.path)
  if (classified.match === 'not_found') {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 404, decision: 'deny', reason: 'path_not_found' })
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
  }

  const allowedMethods = ADMIN_ALLOWLIST[classified.routeKey].methods as readonly string[]
  if (!allowedMethods.includes(request.method)) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 405, decision: 'deny', reason: 'method_not_allowed', route_key: classified.routeKey })
    return NextResponse.json({ detail: 'Method not allowed.' }, { status: 405 })
  }

  // 4S.90N-C: Session guard -- must come before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  const session = await getAdminProxySessionContext(request)
  if (!session) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 401, decision: 'deny', reason: 'unauthenticated', route_key: classified.routeKey })
    return NextResponse.json({ detail: 'Authentication required.' }, { status: 401 })
  }

  // 4S.85G-5: Role/membership guard -- before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  if (!ADMIN_CAPABLE_ROLES.includes(session.role)) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 403, decision: 'deny', reason: 'role_denied', route_key: classified.routeKey, role: session.role, active: session.active })
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }
  if (!session.active) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 403, decision: 'deny', reason: 'inactive_membership', route_key: classified.routeKey, role: session.role, active: session.active })
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }

  // 4S.85G-6: Route-specific role allowlist -- before ADMIN_TOKEN/BACKEND_URL checks and before fetch().
  if (!(ADMIN_ALLOWLIST[classified.routeKey].roles as readonly string[]).includes(session.role)) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 403, decision: 'deny', reason: 'route_role_denied', route_key: classified.routeKey, role: session.role, active: session.active })
    return NextResponse.json({ detail: 'Access denied.' }, { status: 403 })
  }

  // 4S.90N-E: CSRF guard -- POST and PATCH only; GET bypasses.
  if (request.method === 'POST' || request.method === 'PATCH') {
    if (!isSameOriginAdminProxyRequest(request)) {
      auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 403, decision: 'deny', reason: 'csrf_failed', route_key: classified.routeKey, role: session.role, active: session.active })
      return NextResponse.json({ detail: 'CSRF check failed.' }, { status: 403 })
    }
  }

  // 4S.85G-8: Upload content-type and size guards -- after CSRF, before ADMIN_TOKEN/BACKEND_URL and fetch().
  if (classified.routeKey === 'documents/upload' && request.method === 'POST') {
    const ct = request.headers.get('content-type') ?? ''
    if (!ct.startsWith('multipart/form-data')) {
      auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 415, decision: 'deny', reason: 'unsupported_media_type', route_key: classified.routeKey, role: session.role, active: session.active })
      return NextResponse.json({ detail: 'Unsupported media type.' }, { status: 415 })
    }
    const clHeader = request.headers.get('content-length')
    if (clHeader !== null) {
      const cl = parseInt(clHeader, 10)
      if (!isNaN(cl) && cl > ADMIN_PROXY_UPLOAD_MAX_BYTES) {
        auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 413, decision: 'deny', reason: 'upload_too_large', route_key: classified.routeKey, role: session.role, active: session.active })
        return NextResponse.json({ detail: 'Upload too large.' }, { status: 413 })
      }
    }
  }

  if (!ADMIN_TOKEN || !BACKEND_URL) {
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 503, decision: 'deny', reason: 'not_configured', route_key: classified.routeKey, role: session.role, active: session.active })
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
    auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: 502, decision: 'deny', reason: 'backend_unreachable', route_key: classified.routeKey, role: session.role, active: session.active })
    return NextResponse.json({ detail: 'Backend unreachable.' }, { status: 502 })
  }

  auditAdminProxyEvent({ component: 'admin_proxy', event_type: 'proxy_guard', method: request.method, status: upstream.status, decision: 'allow', reason: 'forwarded', route_key: classified.routeKey, role: session.role, active: session.active })

  const upstreamContentType = upstream.headers.get('content-type') ?? ''
  if (upstreamContentType.includes('application/json')) {
    const parsed: unknown = await upstream.json()
    const stripped = stripAdminProxyResponseForRole(parsed, classified.routeKey, session.role)
    return NextResponse.json(stripped, { status: upstream.status })
  }

  const responseBlob = await upstream.blob()
  return new NextResponse(responseBlob, {
    status: upstream.status,
    headers: {
      'Content-Type': upstreamContentType || 'application/octet-stream',
    },
  })
}

// 4S.85G-10: Response-hardening wrapper -- adds Cache-Control: no-store to every admin proxy
// response, including guard denials, to prevent caching of sensitive admin metadata.
async function proxyHandler(
  request: NextRequest,
  ctx: { params: { path: string[] } },
): Promise<NextResponse> {
  const response = await proxyHandlerCore(request, ctx)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const GET = proxyHandler
export const POST = proxyHandler
export const PATCH = proxyHandler
// DELETE is exported so method-guard tests can reach the 405 path; it never forwards.
export const DELETE = proxyHandler
