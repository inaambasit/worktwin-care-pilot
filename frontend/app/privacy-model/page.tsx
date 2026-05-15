import Link from 'next/link'
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react'

const boundaries = [
  {
    heading: 'Controlled pilot preview - not production software',
    text: 'This is a controlled pilot preview designed to show how the WorkTwin platform could work. It uses sample documents and fictional scenarios only. It is not approved for use with real staff, service-user or care data at this stage.',
  },
  {
    heading: 'No real data should be entered',
    text: 'Do not enter real staff, service-user, HR, safeguarding, medication, payroll, complaints or care-plan data into this controlled pilot preview at any point. Sample and fictional content only.',
  },
  {
    heading: 'Private Notes are session-only',
    text: 'Private Notes in this controlled pilot preview exist only in your browser session. They are not submitted to any care system, saved to a server, or retained after you close the tab.',
  },
  {
    heading: 'Personal Ask questions are private from managers',
    text: 'In this controlled pilot preview, personal Ask questions are not visible to managers. The pilot is designed to show that this boundary is respected in the platform design.',
  },
  {
    heading: 'Practice records are not submitted to a real care system',
    text: 'Structured practice records and scenario completions may be shown in this controlled pilot preview but are not submitted to a real care system, external platform or regulatory database.',
  },
  {
    heading: 'Anonymous Insights show themes - not individuals',
    text: 'Anonymous Insights in this controlled pilot preview are designed to show themes and patterns, not individual conversations, transcripts or identifiable staff information.',
  },
  {
    heading: 'Human escalation is always the priority',
    text: 'If anyone is in immediate danger, call 999 first. WorkTwin does not replace human judgement, safeguarding procedures or emergency services at any point.',
  },
  {
    heading: 'Production use requires additional governance steps',
    text: 'Production deployment of WorkTwin would require authentication, a Data Protection Agreement (DPA) sign-off, governance review, content permissions and a final safety review before any real data is handled.',
  },
]

export default function PrivacyModelPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wider">
            <Shield size={12} />
            Privacy model
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">
            How this controlled pilot handles data and privacy
          </h1>
          <p className="text-slate-600 leading-relaxed">
            This page explains the privacy boundaries for the WorkTwin Care Pilot.
            It is a one-minute read. Please read it before using the controlled pilot preview.
          </p>
        </div>

        {/* Pilot status notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Controlled pilot preview - not production software</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              WorkTwin Care Pilot is an early-stage controlled pilot preview. It is not approved for use with
              real staff data, service-user data or care records at this stage.
            </p>
          </div>
        </div>

        {/* Boundaries */}
        <div className="space-y-4 mb-10">
          {boundaries.map(({ heading, text }, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl p-5 hover:border-teal-200 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">{heading}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency notice */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800 mb-1">Emergency reminder</p>
              <p className="text-sm text-red-700 leading-relaxed">
                If anyone is in immediate danger, call <strong>999</strong> immediately.
                WorkTwin does not replace emergency services or human safeguarding procedures.
              </p>
            </div>
          </div>
        </div>

        {/* Summary trust panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-teal-400" />
            <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Summary</p>
          </div>
          <ul className="space-y-2.5">
            {[
              'No real staff, service-user or care data should be entered into this controlled pilot preview.',
              'All notes, questions and practice records are session-only and not submitted anywhere.',
              'Insights show themes only - not individual conversations or identifiable people.',
              'Human escalation is always the priority. Call 999 if there is immediate danger.',
              'Production use requires DPA sign-off, auth and a full governance review.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={15} className="text-teal-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer nav */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-sm transition-colors text-center"
          >
            Back to the pilot overview
          </Link>
          <Link
            href="/book-pilot"
            className="inline-block px-5 py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl text-sm transition-colors text-center"
          >
            Book a pilot
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="text-white text-sm font-semibold">WorkTwin</span>
          </div>
          <p className="text-slate-500 text-xs text-center">
            Controlled pilot preview - sample data only. No real staff, service-user or care data.
            &copy; {new Date().getFullYear()} WorkTwin.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/privacy-model" className="hover:text-slate-300">Privacy model</Link>
            <Link href="/escalation" className="hover:text-slate-300">Escalation</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
