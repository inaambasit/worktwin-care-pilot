'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { PlayCircle, CheckCircle, Clock, BookOpen } from 'lucide-react'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
type Status = 'Not started' | 'In progress' | 'Practised'

interface Scenario {
  id: number
  title: string
  category: string
  description: string
  difficulty: Difficulty
  duration: string
  status: Status
}

const scenarios: Scenario[] = [
  {
    id: 1,
    title: 'Medication-related concern: knowing when to escalate',
    category: 'Medication awareness',
    description: 'Practise recognising when a medication-related concern needs recording and escalation to the appropriate trained lead.',
    difficulty: 'Intermediate',
    duration: '8 min',
    status: 'Not started',
  },
  {
    id: 2,
    title: 'Safeguarding concern: knowing who to contact',
    category: 'Safeguarding',
    description: 'Work through an example safeguarding concern and practise when to contact the safeguarding lead rather than trying to investigate alone.',
    difficulty: 'Advanced',
    duration: '12 min',
    status: 'Not started',
  },
  {
    id: 3,
    title: 'Managing an aggressive or distressed service user',
    category: 'Communication',
    description: 'Practise calm communication and learn when to call for help when a service user becomes distressed or difficult to support.',
    difficulty: 'Intermediate',
    duration: '10 min',
    status: 'Practised',
  },
  {
    id: 4,
    title: 'Supporting a service user at end of life',
    category: 'End of Life',
    description: 'Practise recognising when to follow local guidance and involve the right senior lead when supporting a service user approaching end of life.',
    difficulty: 'Advanced',
    duration: '15 min',
    status: 'Not started',
  },
  {
    id: 5,
    title: 'Food and nutrition - spotting when to escalate',
    category: 'Health & Nutrition',
    description: 'Practise spotting when food or nutrition concerns should be recorded and escalated to the right human lead.',
    difficulty: 'Beginner',
    duration: '6 min',
    status: 'In progress',
  },
  {
    id: 6,
    title: 'Incident reporting awareness',
    category: 'Incident Reporting',
    description: 'Practise what information may need to be captured and escalated after an incident, using local reporting procedures.',
    difficulty: 'Beginner',
    duration: '5 min',
    status: 'Practised',
  },
  {
    id: 7,
    title: 'Responding to a fire alarm',
    category: 'Health & Safety',
    description: 'Practise following the local fire evacuation route, understanding your responsibilities for service users with limited mobility, and knowing how to report.',
    difficulty: 'Beginner',
    duration: '5 min',
    status: 'Not started',
  },
  {
    id: 8,
    title: 'Handling a complaint from a service user or family member',
    category: 'Complaints',
    description: 'Practise responding to a formal or informal complaint, recording it correctly and following the complaints procedure.',
    difficulty: 'Intermediate',
    duration: '10 min',
    status: 'Not started',
  },
  {
    id: 9,
    title: 'Service user refuses entry at the door',
    category: 'Access / Welfare',
    description: "A staff member arrives for a visit, but the service user does not want to let them inside. The service user is older and may be vulnerable, and the staff member is unsure what to do. Practise calm communication, contacting the designated family contact where appropriate, and escalating to the registered manager / safeguarding lead if there are any welfare, safety, capacity, distress, neglect, missed medication or immediate-risk concerns.",
    difficulty: 'Intermediate',
    duration: '7 min',
    status: 'Not started',
  },
]

const difficultyColour: Record<Difficulty, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
}

const statusColour: Record<Status, string> = {
  'Not started': 'text-slate-400',
  'In progress': 'text-amber-600',
  'Practised': 'text-teal-600',
}

const statusIconBg: Record<Status, string> = {
  'Not started': 'bg-slate-100',
  'In progress': 'bg-amber-50',
  'Practised': 'bg-teal-100',
}

const CONTEXT_CHIPS = ['Safe practice mode', 'Care-sector scenarios', 'Private learning', 'Pilot pathway']

const categories = ['All', ...Array.from(new Set(scenarios.map(s => s.category)))]

export default function ScenariosPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeScenario, setActiveScenario] = useState<number | null>(null)

  const filtered = activeCategory === 'All' ? scenarios : scenarios.filter(s => s.category === activeCategory)
  const practisedCount = scenarios.filter(s => s.status === 'Practised').length
  const inProgressCount = scenarios.filter(s => s.status === 'In progress').length

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                <BookOpen size={11} />
                Practice hub
              </span>
              <h1 className="text-3xl font-bold mb-2.5 leading-snug">Practice Scenarios</h1>
              <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
                Build confidence with example care situations while keeping real decisions with the right human lead.
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_CHIPS.map(chip => (
                  <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 bg-white/10 rounded-2xl px-6 py-4 text-center min-w-[110px]">
              <p className="text-4xl font-bold leading-none">{practisedCount}</p>
              <p className="text-teal-200 text-xs font-semibold mt-1.5">of {scenarios.length} practised</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">{practisedCount}</p>
              <p className="text-xs text-slate-500">Practised</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>
              <p className="text-xs text-slate-500">In progress</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <PlayCircle size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{scenarios.length}</p>
              <p className="text-xs text-slate-500">Available scenarios</p>
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Filter by topic</p>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all ${
                  activeCategory === cat
                    ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario cards */}
        <div className="space-y-4">
          {filtered.map(scenario => (
            <div
              key={scenario.id}
              className={`bg-white border rounded-3xl overflow-hidden transition-all hover:shadow-md ${
                scenario.id === 9
                  ? 'border-teal-200 shadow-sm ring-2 ring-teal-100'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon tile */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${statusIconBg[scenario.status]}`}>
                    {scenario.status === 'Practised' ? (
                      <CheckCircle size={22} className="text-teal-600" />
                    ) : scenario.status === 'In progress' ? (
                      <Clock size={22} className="text-amber-600" />
                    ) : (
                      <PlayCircle size={22} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{scenario.title}</h3>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {scenario.id === 9 && (
                          <span className="text-xs font-bold bg-teal-700 text-white px-2.5 py-1 rounded-full">
                            New guided flow
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${difficultyColour[scenario.difficulty]}`}>
                          {scenario.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Chips row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        {scenario.category}
                      </span>
                      <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                        {scenario.duration}
                      </span>
                      <span className={`text-xs font-semibold ${statusColour[scenario.status]}`}>
                        {scenario.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{scenario.description}</p>

                    {/* CTA buttons */}
                    <div className="flex gap-2.5 flex-wrap">
                      {scenario.id === 9 ? (
                        <Link
                          href="/scenarios/access-refusal"
                          className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <PlayCircle size={15} />
                          Open guided practice
                        </Link>
                      ) : (
                        <button
                          onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
                          className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <PlayCircle size={15} />
                          {scenario.status === 'Practised' ? 'Review practice' : scenario.status === 'In progress' ? 'Continue practice' : 'Open practice'}
                        </button>
                      )}
                      <Link
                        href="/policies"
                        className="text-sm border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium px-4 py-2.5 rounded-xl transition-colors"
                      >
                        View related policies
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline preview panel */}
              {activeScenario === scenario.id && (
                scenario.id === 1 ? (
                  <div className="border-t border-teal-100 bg-gradient-to-br from-teal-50 to-slate-50 px-6 py-5">
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3">Pilot preview</p>
                    <div className="bg-white border border-teal-200 rounded-2xl p-5 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800 mb-2">Example scene:</p>
                      <p className="leading-relaxed text-slate-600">
                        This is an example practice situation. A person being supported says they do not want to take a prescribed medicine and also says they do not feel well. In real work, staff should follow local medication policy, record concerns through the approved route and escalate to the appropriate trained lead.
                      </p>
                      <p className="font-semibold text-slate-800 mt-4 mb-2">What do you do first?</p>
                      <div className="space-y-2 mt-1">
                        {[
                          'Stay calm, do not pressure the person, and escalate through the approved medication route',
                          'Ignore the concern because this is only one missed medicine',
                          'Change the dose yourself to make the person more comfortable',
                          'Leave without recording or telling anyone',
                        ].map((opt, i) => (
                          <button key={i} className="w-full text-left text-sm border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl px-4 py-3 transition-all">
                            <span className="font-bold text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      This is a controlled pilot preview. Future practice flows may guide staff through example steps, but real medication, safeguarding, wellbeing or immediate-risk concerns must still be escalated to the right human lead.
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pilot preview</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      The full interactive scenario for{' '}
                      <span className="font-semibold text-slate-700">{scenario.title}</span> is being
                      prepared and will guide you through example practice steps with safer escalation reminders.
                    </p>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      Pilot preview only. Scenario content for this topic must be reviewed before wider controlled use.
                    </p>
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* Footer safety note */}
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 leading-relaxed text-center">
            Example practice mode only. These scenarios are not competency assessments, training sign-offs or operational advice. They do not replace speaking to a manager, safeguarding lead, trained clinician or emergency services where required.
          </p>
        </div>

      </div>
    </AppLayout>
  )
}
