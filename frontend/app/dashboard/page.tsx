import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import {
  MessageCircle, ClipboardList, PlayCircle, Lock, BookOpen,
  CheckCircle, ShieldCheck, Shield, Home,
} from 'lucide-react'

const quickActions = [
  { href: '/ask', icon: MessageCircle, label: 'Ask WorkTwin', desc: 'Ask policy-grounded questions' },
  { href: '/policies', icon: BookOpen, label: 'Policy Library', desc: 'Browse approved documents' },
  { href: '/onboarding', icon: ClipboardList, label: 'My Onboarding', desc: 'Continue where you left off' },
  { href: '/scenarios', icon: PlayCircle, label: 'Practice Scenarios', desc: 'Build confidence safely' },
  { href: '/notes', icon: Lock, label: 'Private Notes', desc: 'Session-only pilot notes' },
]

const CONTEXT_CHIPS = ['Staff pilot view', 'Thumhara Centre', 'Controlled Pilot', 'Privacy-first support']

const onboardingTasks = [
  { label: 'Read the Staff Handbook', done: true },
  { label: 'Meet your line manager', done: true },
  { label: 'Complete fire safety walkthrough', done: true },
  { label: 'Shadow a senior carer for a shift', done: true },
  { label: 'Complete the medication module', done: false },
  { label: 'Review the safeguarding policy', done: false },
  { label: 'Book your 2-week check-in', done: false },
]

const completedCount = onboardingTasks.filter(t => t.done).length

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

        {/* Pilot walkthrough strip */}
        <div className="bg-white border border-teal-100 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Suggested pilot walkthrough</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'Dashboard', href: '/', active: true },
              { label: 'Ask WorkTwin', href: '/ask', active: false },
              { label: 'Policy Library', href: '/policies', active: false },
              { label: 'Access Refusal', href: '/scenarios/access-refusal', active: false },
              { label: 'Escalation', href: '/escalation', active: false },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <Link
                  href={item.href}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    item.active
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 bg-white'
                  }`}
                >
                  {item.label}
                </Link>
                {i < arr.length - 1 && <span className="text-slate-300 text-xs select-none">›</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Follow this path to walk through the controlled pilot flow from guidance to escalation.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">{completedCount} of {onboardingTasks.length}</p>
              <p className="text-xs text-slate-500">Onboarding progress</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <PlayCircle size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">9</p>
              <p className="text-xs text-slate-500">Practice scenarios available</p>
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
                  New guided scenario
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
                    Practise the safe route: stay calm, contact the named family contact, escalate to the registered manager if needed, and record the visit clearly.
                  </p>
                </div>
              </div>
              <Link
                href="/scenarios/access-refusal"
                className="flex items-center justify-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm w-full"
              >
                <PlayCircle size={15} />
                Start guided scenario
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
              Private notes and personal Ask WorkTwin questions stay private in this controlled pilot. Structured visit records may be shared with authorised leads where required.
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
