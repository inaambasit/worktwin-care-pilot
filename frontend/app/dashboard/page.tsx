import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import { MessageCircle, ClipboardList, PlayCircle, Lock, AlertTriangle, BookOpen, CheckCircle, ShieldCheck } from 'lucide-react'

const quickActions = [
  { href: '/ask', icon: MessageCircle, label: 'Ask WorkTwin', desc: 'Get a policy-grounded answer' },
  { href: '/policies', icon: BookOpen, label: 'Policy Library', desc: 'Browse approved documents' },
  { href: '/onboarding', icon: ClipboardList, label: 'My Onboarding', desc: 'Continue where you left off' },
  { href: '/scenarios', icon: PlayCircle, label: 'Practice Scenarios', desc: 'Build confidence safely' },
  { href: '/notes', icon: Lock, label: 'Private Notes', desc: 'Private notes demo' },
]

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 text-white">
          <div className="mb-2">
            <span className="text-xs font-medium bg-white/20 text-teal-50 px-2.5 py-0.5 rounded-full">
              Pilot demo
            </span>
          </div>
          <p className="text-teal-200 text-sm mb-1">Good morning,</p>
          <h1 className="text-2xl font-bold mb-1">Welcome back, Demo User</h1>
          <p className="text-teal-100 text-sm">Thumhara Centre &middot; Care Worker &middot; Week 2</p>
          <p className="text-teal-200 text-xs mt-2">
            WorkTwin helps with approved policies, onboarding and safe escalation &mdash; private Ask questions and notes are not shown to managers in this prototype.
          </p>
        </div>

        {/* Onboarding progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Onboarding progress</h2>
            <Link href="/onboarding" className="text-sm text-teal-700 hover:text-teal-800 font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                className="bg-teal-600 h-2.5 rounded-full"
                style={{ width: `${(completedCount / onboardingTasks.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 font-medium shrink-0">
              {completedCount} of {onboardingTasks.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {onboardingTasks.slice(0, 4).map((task) => (
              <div key={task.label} className="flex items-center gap-2.5 text-sm">
                <CheckCircle
                  size={16}
                  className={task.done ? 'text-teal-600' : 'text-slate-300'}
                />
                <span className={task.done ? 'text-slate-500 line-through' : 'text-slate-800'}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/onboarding"
            className="mt-3 inline-block text-xs text-slate-400 hover:text-slate-600"
          >
            + {onboardingTasks.length - 4} more tasks
          </Link>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Icon size={18} className="text-teal-700" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Learning suggestion + Safe support reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Learning suggestion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-teal-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Learning suggestion</h2>
            </div>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              You have not yet completed the medication module. Build confidence with a safe practice scenario before your next shift.
            </p>
            <Link
              href="/scenarios"
              className="inline-block text-sm bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Practise a medication scenario
            </Link>
          </div>

          {/* Safe support reminders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-teal-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Safe support reminders</h2>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">&middot;</span>
                <span>WorkTwin answers from approved, staff-visible documents only.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">&middot;</span>
                <span>Safeguarding, medication, HR, legal, compliance and wellbeing concerns must be escalated to a human lead.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">&middot;</span>
                <span>No manager can view your private questions in this prototype.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Escalation reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Sensitive concerns? Always escalate to a person.</p>
            <p className="text-xs text-amber-700 mt-0.5">
              For safeguarding, medication incidents, HR concerns or health and safety issues, speak to your
              escalation contact &mdash; not only WorkTwin.{' '}
              <Link href="/escalation" className="underline font-medium">View escalation contacts</Link>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
