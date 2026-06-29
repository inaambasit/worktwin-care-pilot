import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const STAFF_ROOTS = [
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
]

const ALLOWED_EMAIL_OTP_TYPES = ['email', 'magiclink'] as const

function safeNext(raw: string | null | undefined): string {
  if (!raw) return '/dashboard'
  const isSafe = STAFF_ROOTS.some(
    (root) => raw === root || raw.startsWith(root + '/')
  )
  return isSafe ? raw : '/dashboard'
}

function safeDiagnosticText(value: string | null | undefined): string | null {
  if (!value) return null
  return value.replace(/[\r\n\t]/g, ' ').slice(0, 200)
}

function authErrorDiagnostics(error: {
  name?: string
  status?: number
  message?: string
} | null) {
  if (!error) return {}
  return {
    error_name: safeDiagnosticText(error.name),
    error_status: error.status ?? null,
    error_message: safeDiagnosticText(error.message),
  }
}

function createCallbackSupabaseClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured for auth callback.')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeNext(searchParams.get('next'))
  const baseDiagnostics = {
    safe_next: next,
    has_code: Boolean(code),
    has_token_hash: Boolean(tokenHash),
    otp_type: safeDiagnosticText(type),
  }

  console.info('staff_auth_callback_start', baseDiagnostics)

  if (code) {
    const successResponse = NextResponse.redirect(`${origin}${next}`)
    try {
      const supabase = createCallbackSupabaseClient(request, successResponse)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        console.info('staff_auth_callback_success', {
          ...baseDiagnostics,
          flow_type: 'code',
        })
        return successResponse
      }
      console.warn('staff_auth_callback_error', {
        ...baseDiagnostics,
        flow_type: 'code',
        ...authErrorDiagnostics(error),
      })
    } catch {
      console.warn('staff_auth_callback_error', {
        ...baseDiagnostics,
        flow_type: 'code',
        error_name: 'CallbackException',
        error_status: null,
        error_message: 'Auth callback code exchange failed.',
      })
    }
  }

  // OTP token-hash verification path for staff email sign-in links.
  // Supabase's standard token-hash email template emits type=email, while some
  // magic-link configurations emit type=magiclink. Accept only these two staff
  // sign-in types and pass the validated value through to verifyOtp, instead of
  // a single hardcoded type. Other email-OTP types (signup, invite, recovery)
  // are intentionally NOT accepted by this staff sign-in route — they would need
  // separate justification/approval — so they fail closed below.
  if (tokenHash && type && (ALLOWED_EMAIL_OTP_TYPES as readonly string[]).includes(type)) {
    const successResponse = NextResponse.redirect(`${origin}${next}`)
    try {
      const supabase = createCallbackSupabaseClient(request, successResponse)
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      })
      if (!error) {
        console.info('staff_auth_callback_success', {
          ...baseDiagnostics,
          flow_type: 'token_hash',
        })
        return successResponse
      }
      console.warn('staff_auth_callback_error', {
        ...baseDiagnostics,
        flow_type: 'token_hash',
        ...authErrorDiagnostics(error),
      })
    } catch {
      console.warn('staff_auth_callback_error', {
        ...baseDiagnostics,
        flow_type: 'token_hash',
        error_name: 'CallbackException',
        error_status: null,
        error_message: 'Auth callback token hash verification failed.',
      })
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
