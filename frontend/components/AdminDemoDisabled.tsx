import Link from 'next/link'

export default function AdminDemoDisabled() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Admin demo disabled</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          This public deployment does not expose admin demo screens. Staff-facing demo pages remain available.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
