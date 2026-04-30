'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { CheckCircle, Circle, Calendar, ChevronDown, ChevronRight } from 'lucide-react'

const weeks = [
  {
    label: 'Week 1 — Getting started',
    status: 'complete',
    tasks: [
      { label: 'Read the Staff Handbook', done: true, type: 'read' },
      { label: 'Meet your line manager', done: true, type: 'action' },
      { label: 'Complete fire safety walkthrough', done: true, type: 'action' },
      { label: 'Shadow a senior carer for a shift', done: true, type: 'action' },
      { label: 'Set up your WorkTwin account', done: true, type: 'action' },
    ],
  },
  {
    label: 'Week 2 — Policies and procedures',
    status: 'inprogress',
    tasks: [
      { label: 'Complete the medication administration module', done: false, type: 'module' },
      { label: 'Read the Safeguarding Policy', done: false, type: 'read' },
      { label: 'Review the Infection Control Procedure', done: true, type: 'read' },
      { label: 'Complete the manual handling refresher', done: false, type: 'module' },
      { label: 'Book your 2-week check-in with your manager', done: false, type: 'action' },
    ],
  },
  {
    label: 'Week 3 — Scenarios and confidence',
    status: 'upcoming',
    tasks: [
      { label: 'Practise medication refusal scenario', done: false, type: 'scenario' },
      { label: 'Practise safeguarding disclosure scenario', done: false, type: 'scenario' },
      { label: 'Read the Complaints Procedure', done: false, type: 'read' },
      { label: 'Complete health and safety quiz', done: false, type: 'module' },
    ],
  },
  {
    label: 'Week 4 — Sign-off and review',
    status: 'upcoming',
    tasks: [
      { label: 'Probation review with line manager', done: false, type: 'action' },
      { label: 'Complete all remaining policy reads', done: false, type: 'read' },
      { label: 'Submit self-assessment form', done: false, type: 'action' },
    ],
  },
]

const typeLabel: Record<string, string> = {
  read: 'Document',
  action: 'Action',
  module: 'Module',
  scenario: 'Scenario',
}

const typeColour: Record<string, string> = {
  read: 'bg-blue-50 text-blue-700',
  action: 'bg-slate-100 text-slate-600',
  module: 'bg-violet-50 text-violet-700',
  scenario: 'bg-teal-50 text-teal-700',
}

const statusLabel: Record<string, { label: string; colour: string }> = {
  complete: { label: 'Complete', colour: 'text-teal-700 bg-teal-50' },
  inprogress: { label: 'In progress', colour: 'text-amber-700 bg-amber-50' },
  upcoming: { label: 'Upcoming', colour: 'text-slate-500 bg-slate-100' },
}

const allTasks = weeks.flatMap(w => w.tasks)
const completedCount = allTasks.filter(t => t.done).length

export default function OnboardingPage() {
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 0: false, 1: true, 2: false, 3: false })

  function toggle(i: number) {
    setOpenWeeks(prev => ({ ...prev, [i]: !prev[i] }))
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Onboarding</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pilot onboarding pathway for Thumhara Centre staff</p>
        </div>

        {/* Progress summary */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-teal-200 text-sm">Overall progress</p>
              <p className="text-2xl font-bold">{completedCount} of {allTasks.length} tasks</p>
            </div>
            <div className="text-right">
              <p className="text-teal-200 text-sm">Pathway</p>
              <p className="font-semibold">Demo pathway</p>
            </div>
          </div>
          <div className="bg-teal-800/50 rounded-full h-2.5">
            <div
              className="bg-white rounded-full h-2.5 transition-all"
              style={{ width: `${(completedCount / allTasks.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-teal-200 mt-1.5">
            {Math.round((completedCount / allTasks.length) * 100)}% complete — keep going!
          </p>
        </div>

        {/* Check-in banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Calendar size={18} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">2-week check-in due soon</p>
            <p className="text-xs text-amber-700">Discuss your 2-week check-in with your line manager.</p>
          </div>
          <p className="text-xs text-amber-700 font-medium">Speak to your line manager to book this.</p>
        </div>

        {/* Safety note */}
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          Safeguarding, medication and wellbeing topics are for awareness and scenario practice only. Real concerns must be escalated to the appropriate human lead.
        </p>

        {/* Week sections */}
        <div className="space-y-3">
          {weeks.map((week, i) => {
            const { label, colour } = statusLabel[week.status]
            const isOpen = openWeeks[i]
            const weekDone = week.tasks.filter(t => t.done).length

            return (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {week.status === 'complete' ? (
                      <CheckCircle size={18} className="text-teal-600 shrink-0" />
                    ) : (
                      <Circle size={18} className="text-slate-300 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{week.label}</p>
                      <p className="text-xs text-slate-400">{weekDone}/{week.tasks.length} complete</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colour}`}>{label}</span>
                    {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-3 space-y-2.5">
                    {week.tasks.map((task, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-5 h-5 shrink-0">
                          {task.done ? (
                            <CheckCircle size={18} className="text-teal-600" />
                          ) : (
                            <Circle size={18} className="text-slate-300" />
                          )}
                        </div>
                        <span className={`flex-1 text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {task.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColour[task.type]}`}>
                          {typeLabel[task.type]}
                        </span>
                        {!task.done && task.type === 'scenario' && (
                          <a
                            href="/scenarios"
                            className="text-xs text-teal-700 hover:underline font-medium"
                          >
                            Start →
                          </a>
                        )}
                        {!task.done && task.type === 'read' && (
                          <Link href="/policies" className="text-xs text-teal-700 hover:underline font-medium">
                            View policy →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Prototype note: this pathway is for demonstration only. Private notes and Ask questions are not shown to managers in this prototype.
        </p>
      </div>
    </AppLayout>
  )
}
