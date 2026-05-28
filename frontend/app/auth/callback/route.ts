import { NextRequest, NextResponse } from 'next/server'
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

  // OTP token-hash verification path for magic-link sign-in.
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash && type === 'magiclink') {
    try {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
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
