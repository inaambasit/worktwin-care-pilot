import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const STAFF_ROOTS = [
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
]

function safeNext(raw: string | null | undefined): string {
  if (!raw) return '/dashboard'
  const isSafe = STAFF_ROOTS.some(
    (root) => raw === root || raw.startsWith(root + '/')
  )
  return isSafe ? raw : '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const next = safeNext(searchParams.get('next'))
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch {
      // Fall through to error redirect below.
    }
  }

  // OTP token-hash verification path for staff email sign-in links.
  // Supabase's standard token-hash email template emits type=email, while some
  // magic-link configurations emit type=magiclink. Accept only these two staff
  // sign-in types and pass the validated value through to verifyOtp, instead of
  // a single hardcoded type. Other email-OTP types (signup, invite, recovery)
  // are intentionally NOT accepted by this staff sign-in route — they would need
  // separate justification/approval — so they fail closed below.
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const ALLOWED_EMAIL_OTP_TYPES = ['email', 'magiclink'] as const

  if (tokenHash && type && (ALLOWED_EMAIL_OTP_TYPES as readonly string[]).includes(type)) {
    try {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      if (!error) {
        const next = safeNext(searchParams.get('next'))
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch {
      // Fall through to error redirect below.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
