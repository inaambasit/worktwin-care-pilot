'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function BookPilotPage() {
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    router.push('/book-pilot/sent')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">WorkTwin</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            &larr; Back to pilot overview
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-block mb-4 text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Care Pilot | Controlled enquiry
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Book a WorkTwin Care Pilot</h1>
          <p className="text-slate-600 leading-relaxed">
            This is a pilot enquiry form, not a live production onboarding. Submitting this form does not create
            an account, provision any services, or bind either party to any commitment. The next step after
            enquiry is a short human conversation to understand your organisation&rsquo;s context.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">What not to include</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Please do not include service-user details, staff HR records, care plans, MAR charts or any
              private personal data in this form. This is an initial exploratory enquiry only.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Alex Sharma"
              required
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="organisation" className="block text-sm font-medium text-slate-700 mb-1.5">
              Organisation
            </label>
            <input
              id="organisation"
              name="organisation"
              type="text"
              placeholder="e.g. Riverside Care Ltd"
              required
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
              Role
            </label>
            <input
              id="role"
              name="role"
              type="text"
              placeholder="e.g. Registered Manager, HR Lead, Operations Director"
              required
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="exploration" className="block text-sm font-medium text-slate-700 mb-1.5">
              What are you looking to explore?
            </label>
            <textarea
              id="exploration"
              name="exploration"
              placeholder="e.g. Better onboarding for new care staff, reducing repeated policy questions, supporting staff confidence in safeguarding procedures..."
              required
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400 leading-relaxed">
              This controlled pilot preview stores nothing. No data is sent to a server, CRM or care system.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto shrink-0 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Preview enquiry
            </button>
          </div>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          Not ready yet?{' '}
          <Link href="/" className="text-teal-700 hover:text-teal-800 font-medium underline underline-offset-2">
            Return to the pilot overview
          </Link>
        </p>
      </main>
    </div>
  )
}
