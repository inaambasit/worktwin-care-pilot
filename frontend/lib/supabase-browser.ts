import { createBrowserClient } from '@supabase/ssr'

function getBrowserClient() {
  if (typeof window === 'undefined') return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createBrowserClient(url, anonKey)
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const client = getBrowserClient()
    if (!client) return null

    // getSession() reads localStorage without server verification; pass the token to
    // getUser() so Supabase Auth validates it server-side before we forward it.
    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null

    const { error: userError } = await client.auth.getUser(token)
    if (userError) return null

    return token
  } catch {
    return null
  }
}
