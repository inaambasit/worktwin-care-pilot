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
