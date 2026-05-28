import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'

export default function LoginSentPage() {
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
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
            <Mail size={26} className="text-teal-700" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          If that address has been given pilot access, a secure sign-in link has
          been sent. A link will only work where access has already been set up by
          the organisation. The link expires after a short time and can only be
          used once.
        </p>

        <div className="flex items-start gap-2.5 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-left mb-5">
          <CheckCircle size={15} className="text-teal-600 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-800 leading-relaxed">
            Click the link in your email to complete sign-in. You do not need
            to enter a password.
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Did not receive an email? Check your junk or spam folder, or{' '}
          <Link
            href="/login"
            className="text-teal-700 hover:text-teal-900 underline underline-offset-2"
          >
            try again
          </Link>
          .
        </p>
      </div>

      {/* Footer links */}
      <div className="mt-6 flex gap-4 text-xs text-slate-400">
        <Link href="/login" className="hover:text-slate-600 underline underline-offset-2">
          Back to sign in
        </Link>
        <span aria-hidden="true">|</span>
        <Link href="/" className="hover:text-slate-600 underline underline-offset-2">
          WorkTwin home
        </Link>
      </div>
    </div>
  )
}
