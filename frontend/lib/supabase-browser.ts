import { createBrowserClient } from '@supabase/ssr'

function getBrowserClient() {
  if (typeof window === 'undefined') return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createBrowserClient(url, anonKey)
}

export interface SessionIdentity {
  email: string
  displayName: string | null
}

// Display-only identity for the signed-in staff user. Mirrors the
// validate-then-trust pattern used by getSupabaseAccessToken: getSession()
// reads localStorage, so we pass the token to getUser() for server-side
// verification before trusting any field. Returns ONLY the user's own email
// and (if set) display name — never the user id, token or organisation id.
export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  try {
    const client = getBrowserClient()
    if (!client) return null

    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null

    const { data: userData, error: userError } = await client.auth.getUser(token)
    if (userError) return null

    const user = userData.user
    const email = user?.email
    if (!email) return null

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const rawName = meta.full_name ?? meta.name
    const displayName =
      typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null

    return { email, displayName }
  } catch {
    return null
  }
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
