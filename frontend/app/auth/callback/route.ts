import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ALLOWED_NEXT_PATHS = new Set([
  '/dashboard',
  '/ask',
  '/policies',
  '/onboarding',
  '/scenarios',
  '/notes',
  '/escalation',
])

function safeNext(raw: string | null | undefined): string {
  if (raw && ALLOWED_NEXT_PATHS.has(raw)) return raw
  return '/dashboard'
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

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
