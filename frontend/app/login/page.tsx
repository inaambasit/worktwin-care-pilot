import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Shield } from 'lucide-react'
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

async function requestMagicLink(formData: FormData) {
  'use server'
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  if (!email) {
    redirect('/login?error=invalid')
  }

  const next = safeNext(formData.get('next') as string | null)

  const h = headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const callbackUrl = `${proto}://${host}/auth/callback?next=${encodeURIComponent(next)}`

  try {
    const supabase = createServerSupabaseClient()
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: false,
      },
    })
  } catch {
    // Do not expose internal errors. Always proceed to /login/sent
    // so the form does not reveal whether an address is registered.
  }

  redirect('/login/sent')
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string }
}) {
  const hasError = Boolean(searchParams?.error)
  const next = safeNext(searchParams?.next)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">WorkTwin</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to WorkTwin Care Pilot</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          This login is for invited pilot staff only. Access must be set up by
          the organisation. Entering your email address does not create a new
          account. If access has not been arranged, speak to your organisation
          lead.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
        {hasError && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">
              Something went wrong. Please check your email address and try again.
            </p>
          </div>
        )}

        <form action={requestMagicLink} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Work email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Send sign-in link
          </button>
        </form>

        {/* Invite-only notice */}
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <Shield size={15} className="text-teal-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            WorkTwin Care Pilot is in controlled preparation. This is an
            invite-only staff login — your email must already be set up by
            the organisation before a sign-in link will work. Entering an
            unknown address does not create a new account.
          </p>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600 underline underline-offset-2">
            Back to WorkTwin home
          </Link>
        </p>
      </div>
    </div>
  )
}
