import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import {
  MessageCircle, ClipboardList, PlayCircle, Lock, BookOpen,
  CheckCircle, ShieldCheck, Shield, Home,
} from 'lucide-react'

const quickActions = [
  { href: '/ask', icon: MessageCircle, label: 'Ask WorkTwin', desc: 'Ask policy-grounded questions' },
  { href: '/policies', icon: BookOpen, label: 'Policy Library', desc: 'Browse approved documents' },
  { href: '/onboarding', icon: ClipboardList, label: 'My Onboarding', desc: 'Continue the example pathway' },
  { href: '/scenarios', icon: PlayCircle, label: 'Scenario Guidance', desc: 'Guidance for real care situations' },
  { href: '/notes', icon: Lock, label: 'Private Notes', desc: 'Session-only pilot notes' },
]

const CONTEXT_CHIPS = ['Staff pilot view', 'Thumhara Centre', 'Controlled Pilot', 'No real data', 'Privacy-first support']

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
              <Home size={11} />
              Employee home
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Welcome back, Pilot User</h1>
            <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
              WorkTwin helps you find approved guidance, practise safe scenarios and keep private notes during this controlled pilot.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CONTEXT_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-teal-200 text-xs">
              Private Ask questions and personal notes are not shown to managers in this controlled pilot.
            </p>
          </div>
        </div>

        {/* Start here — suggested first steps */}
        <div className="bg-white border border-teal-100 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Start here — suggested first steps</p>
          <ol className="space-y-2">
            {[
              { n: 1, label: 'Ask a safe example question', sub: 'Ask WorkTwin', href: '/ask' },
              { n: 2, label: 'Browse approved pilot policies', sub: 'Policy Library', href: '/policies' },
              { n: 3, label: 'Try Scenario Guidance', sub: 'Realistic care situations', href: '/scenarios' },
              { n: 4, label: 'Check escalation contacts', sub: 'Who to call for high-risk situations', href: '/escalation' },
              { n: 5, label: 'Continue your onboarding preview', sub: 'Example induction pathway', href: '/onboarding' },
            ].map(({ n, label, sub, href }) => (
              <li key={n}>
                <Link href={href} className="flex items-center gap-3 group py-0.5">
                  <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] flex items-center justify-center shrink-0 font-bold group-hover:bg-teal-800 transition-colors">{n}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">{label}</span>
                    <span className="text-xs text-slate-400 ml-1.5">— {sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="text-xs text-red-600 font-medium mt-3 bg-red-50 rounded-xl px-3 py-2 leading-relaxed">
            Do not enter real staff, service-user, medication, safeguarding, HR, complaint, care-plan or confidential information in this controlled preview.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">6 of 17</p>
              <p className="text-xs text-slate-500">Example tasks completed</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <PlayCircle size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">9</p>
              <p className="text-xs text-slate-500">Scenario guidance sessions</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
              <Lock size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Session only</p>
              <p className="text-xs text-slate-500">Private notes</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-teal-200 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Icon size={18} className="text-teal-700" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* New scenario highlight + Safe support reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* New scenario highlight - access refusal */}
          <div className="bg-white border-2 border-teal-200 rounded-3xl overflow-hidden shadow-sm ring-2 ring-teal-100 hover:shadow-md transition-all">
            <div className="p-6">
              <div className="mb-4">
                <span className="text-xs font-bold bg-teal-700 text-white px-2.5 py-1 rounded-full">
                  New scenario guidance
                </span>
              </div>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
                  <PlayCircle size={22} className="text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base leading-snug mb-2">
                    Service user refuses entry at the door
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Practise the safe route: stay calm, contact the named family contact, escalate to the registered manager if needed, and follow your provider's recording process.
                  </p>
                </div>
              </div>
              <Link
                href="/scenarios/access-refusal"
                className="flex items-center justify-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm w-full"
              >
                <PlayCircle size={15} />
                Open scenario guidance
              </Link>
            </div>
          </div>

          {/* Safe support reminders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={17} className="text-teal-600" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm">Safe support reminders</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
                <span className="text-sm text-slate-600 leading-relaxed">
                  WorkTwin supports approved staff guidance, not emergency decision-making.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
                <span className="text-sm text-slate-600 leading-relaxed">
                  Safeguarding, medication, HR, wellbeing or legal concerns should be escalated to the right human lead.
                </span>
              </li>
              <li className="flex items-start gap-2.5 bg-red-50 rounded-xl px-3 py-2.5 -mx-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-[7px]" />
                <span className="text-sm text-red-700 font-medium leading-relaxed">
                  If someone is in immediate danger, call{' '}
                  <a href="tel:999" className="font-bold underline">999</a>.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Privacy-first card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={16} className="text-teal-700" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Privacy-first pilot</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Private notes and personal Ask WorkTwin questions stay private in this controlled pilot. Real records stay in your existing care-recording system — WorkTwin is for guidance and reflection only.
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
