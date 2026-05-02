'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import {
  CheckCircle, Circle, Calendar, ChevronDown, ChevronRight,
  ClipboardList, Clock, Shield,
} from 'lucide-react'

const weeks = [
  {
    label: 'Week 1 - Getting started',
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
    label: 'Week 2 - Policies and procedures',
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
    label: 'Week 3 - Scenarios and confidence',
    status: 'upcoming',
    tasks: [
      { label: 'Practise medication refusal scenario', done: false, type: 'scenario' },
      { label: 'Practise safeguarding disclosure scenario', done: false, type: 'scenario' },
      { label: 'Read the Complaints Procedure', done: false, type: 'read' },
      { label: 'Complete health and safety quiz', done: false, type: 'module' },
    ],
  },
  {
    label: 'Week 4 - Sign-off and review',
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

const CONTEXT_CHIPS = ['Induction pathway', 'Staff guidance', 'Private learning', 'Demo progress']

const allTasks = weeks.flatMap(w => w.tasks)
const completedCount = allTasks.filter(t => t.done).length
const remainingCount = allTasks.length - completedCount
const currentWeek = weeks.find(w => w.status === 'inprogress') ?? weeks[0]
const allComplete = completedCount === allTasks.length
const pct = Math.round((completedCount / allTasks.length) * 100)

export default function OnboardingPage() {
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 0: false, 1: true, 2: false, 3: false })

  function toggle(i: number) {
    setOpenWeeks(prev => ({ ...prev, [i]: !prev[i] }))
  }

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
              <ClipboardList size={11} />
              Induction pathway
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">My Onboarding</h1>
            <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
              Follow your induction pathway, review key guidance and build confidence during the WorkTwin pilot demo.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CONTEXT_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-teal-200 text-xs">
              Your private learning notes and Ask WorkTwin questions stay private in this demo.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">{completedCount}</p>
              <p className="text-xs text-slate-500">Tasks completed</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{remainingCount}</p>
              <p className="text-xs text-slate-500">Tasks remaining</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Demo pathway</p>
              <p className="text-xs text-slate-500">Current pathway</p>
            </div>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm mb-0.5">Overall progress</p>
              <p className="text-xs text-slate-500">{completedCount} of {allTasks.length} tasks completed</p>
            </div>
            <span className="text-2xl font-bold text-teal-700">{pct}%</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-teal-600 rounded-full h-2.5 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2.5">
            {allComplete
              ? 'All pathway tasks complete - well done!'
              : `Currently in: ${currentWeek.label}. Keep going to complete your induction pathway.`}
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

        {/* Completed state */}
        {allComplete && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} className="text-teal-600" />
            </div>
            <p className="font-bold text-teal-800 text-lg mb-1">Onboarding pathway complete</p>
            <p className="text-sm text-teal-700 max-w-sm mx-auto">
              You can still revisit guidance, practise scenarios or ask WorkTwin policy questions.
            </p>
          </div>
        )}

        {/* Pathway week sections */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Pathway weeks</h2>
          <div className="space-y-3">
            {weeks.map((week, i) => {
              const { label, colour } = statusLabel[week.status]
              const isOpen = openWeeks[i]
              const weekDone = week.tasks.filter(t => t.done).length

              return (
                <div key={i} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        week.status === 'complete'
                          ? 'bg-teal-100'
                          : week.status === 'inprogress'
                          ? 'bg-amber-50'
                          : 'bg-slate-100'
                      }`}>
                        {week.status === 'complete' ? (
                          <CheckCircle size={18} className="text-teal-600" />
                        ) : week.status === 'inprogress' ? (
                          <Clock size={18} className="text-amber-600" />
                        ) : (
                          <Circle size={18} className="text-slate-300" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{week.label}</p>
                        <p className="text-xs text-slate-400">{weekDone} of {week.tasks.length} tasks complete</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colour}`}>{label}</span>
                      {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-6 py-4 space-y-2.5">
                      {week.tasks.map((task, j) => (
                        <div key={j} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
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
                              className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Start
                            </a>
                          )}
                          {!task.done && task.type === 'read' && (
                            <Link
                              href="/policies"
                              className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              View
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
        </div>

        {/* Safety note */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={16} className="text-teal-700" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm mb-1">Safe support reminder</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              This onboarding pathway is for staff support during the pilot demo. Sensitive concerns such as safeguarding, medication, HR, wellbeing, legal or immediate-risk issues should still be escalated to the right human lead.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Prototype note: this pathway is for demonstration only. Private notes and Ask questions are not shown to managers in this prototype.
        </p>

      </div>
    </AppLayout>
  )
}
