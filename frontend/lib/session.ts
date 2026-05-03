import { createServerSupabaseClient } from './supabase-server'

export interface VerifiedSession {
  user_id: string
  email: string
}

export async function getVerifiedSession(): Promise<VerifiedSession | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    return {
      user_id: user.id,
      email: user.email ?? '',
    }
  } catch {
    return null
  }
}
