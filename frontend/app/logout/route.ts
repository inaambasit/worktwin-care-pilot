import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin

  try {
    const supabase = createServerSupabaseClient()
    await supabase.auth.signOut()
  } catch {
    // Session may already be invalid. Still redirect to /login.
  }

  return NextResponse.redirect(`${origin}/login`)
}
