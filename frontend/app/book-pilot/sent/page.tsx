import Link from 'next/link'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function BookPilotSentPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-20 px-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">WorkTwin</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-teal-700" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Preview enquiry noted
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-5">
            Your preview enquiry has not been sent.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Session-only enquiry preview
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              This controlled pilot preview stores nothing. No data has been sent to a live CRM, care system,
              server or external service. Nothing leaves your browser session.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              No email has been sent. This is a controlled pilot preview only — not a live production onboarding.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left flex gap-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              To open a real conversation about a WorkTwin pilot, use the real contact route or email address
              when provided by the WorkTwin team. Do not enter real service-user, staff, care-plan,
              medication or confidential data anywhere in this controlled preview.
            </p>
          </div>

          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Back to the pilot overview
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/privacy-model" className="hover:text-slate-700 underline underline-offset-2">
              Privacy model
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
