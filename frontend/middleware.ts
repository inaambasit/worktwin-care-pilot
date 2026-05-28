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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_PILOT_AUTH_MODE !== 'true') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (!isProtectedStaffPath(pathname)) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured in pilot-auth mode: fail closed.
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
      signal: AbortSignal.timeout(5_000),
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
  } catch {
    sessionCheckError = 'auth_unavailable'
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
