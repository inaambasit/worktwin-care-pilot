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

    const { data, error } = await client.auth.getSession()
    if (error || !data.session?.access_token) return null

    return data.session.access_token
  } catch {
    return null
  }
}
