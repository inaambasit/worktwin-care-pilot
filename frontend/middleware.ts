import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const STAFF_ROOTS = [
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
]

function isProtectedStaffPath(pathname: string): boolean {
  return STAFF_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(root + '/')
  )
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function apiHostOnly(): string {
  try {
    return new URL(API_BASE).host
  } catch {
    return 'invalid-api-host'
  }
}

// 4S.109B — staff route protection fails closed by default.
// The staff auth gate is SKIPPED only when NEXT_PUBLIC_PILOT_AUTH_MODE is
// explicitly set to a recognised demo value (false / 0 / off / no / demo,
// case/space-insensitive). A missing, empty, mistyped, or otherwise
// unrecognised value — including "true" — keeps the gate ON, removing the
// previous silent fail-open where any value other than "true" disabled gating.
const PILOT_AUTH_EXPLICIT_DEMO_VALUES = new Set(['false', '0', 'off', 'no', 'demo'])

function pilotAuthRequired(): boolean {
  const raw = (process.env.NEXT_PUBLIC_PILOT_AUTH_MODE ?? '').trim().toLowerCase()
  return !PILOT_AUTH_EXPLICIT_DEMO_VALUES.has(raw)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (!pilotAuthRequired()) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (!isProtectedStaffPath(pathname)) {
    return NextResponse.next()
  }

  const gateStartedAt = Date.now()
  const apiHost = apiHostOnly()
  console.info('staff_route_gate_start', {
    pathname,
    api_host: apiHost,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured in pilot-auth mode: fail closed.
    console.warn('staff_route_gate_no_session', {
      pathname,
      api_host: apiHost,
      has_access_token: false,
      elapsed_ms: Date.now() - gateStartedAt,
      final_redirect_reason: 'auth_unavailable',
    })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    console.warn('staff_route_gate_no_session', {
      pathname,
      api_host: apiHost,
      has_access_token: Boolean(session?.access_token),
      elapsed_ms: Date.now() - gateStartedAt,
      final_redirect_reason: 'access_denied',
    })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Backend is the authority: validate JWT, organisation membership, and staff role.
  let allowed = false
  let sessionCheckError: 'access_denied' | 'auth_unavailable' = 'auth_unavailable'

  try {
    const checkResp = await fetch(`${API_BASE}/staff/session-check`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: AbortSignal.timeout(15_000),
    })

    if (checkResp.ok) {
      const body = (await checkResp.json()) as { allowed?: boolean }
      if (body.allowed === true) {
        allowed = true
      } else {
        sessionCheckError = 'access_denied'
      }
    } else if (checkResp.status >= 500) {
      sessionCheckError = 'auth_unavailable'
    } else {
      // 401 or 403
      sessionCheckError = 'access_denied'
    }

    console.info('staff_route_gate_check_result', {
      pathname,
      api_host: apiHost,
      has_access_token: true,
      response_status: checkResp.status,
      elapsed_ms: Date.now() - gateStartedAt,
      allowed,
      final_redirect_reason: allowed ? null : sessionCheckError,
    })
  } catch {
    sessionCheckError = 'auth_unavailable'
    console.warn('staff_route_gate_fetch_error', {
      pathname,
      api_host: apiHost,
      has_access_token: true,
      elapsed_ms: Date.now() - gateStartedAt,
      final_redirect_reason: sessionCheckError,
    })
  }

  if (!allowed) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', sessionCheckError)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ask/:path*',
    '/policies/:path*',
    '/onboarding/:path*',
    '/scenarios/:path*',
    '/notes/:path*',
    '/escalation/:path*',
  ],
}
