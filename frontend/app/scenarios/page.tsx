'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { PlayCircle, CheckCircle, Clock, Filter } from 'lucide-react'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
type Status = 'Not started' | 'In progress' | 'Completed'

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
    title: 'Service user refuses medication',
    category: 'Medication',
    description: 'Practise how to respond calmly, document correctly and follow the correct escalation steps when a service user refuses prescribed medication.',
    difficulty: 'Intermediate',
    duration: '8 min',
    status: 'Not started',
  },
  {
    id: 2,
    title: 'Recognising and responding to a safeguarding concern',
    category: 'Safeguarding',
    description: 'Work through a realistic scenario in which a service user discloses something that may indicate abuse or neglect. Practise the correct reporting steps.',
    difficulty: 'Advanced',
    duration: '12 min',
    status: 'Not started',
  },
  {
    id: 3,
    title: 'Managing an aggressive or distressed service user',
    category: 'Communication',
    description: 'Practise de-escalation techniques and learn when to call for help when a service user becomes distressed or difficult to support.',
    difficulty: 'Intermediate',
    duration: '10 min',
    status: 'Completed',
  },
  {
    id: 4,
    title: 'Supporting a service user at end of life',
    category: 'End of Life',
    description: 'Explore the care, communication and documentation responsibilities involved in supporting a service user who is approaching end of life.',
    difficulty: 'Advanced',
    duration: '15 min',
    status: 'Not started',
  },
  {
    id: 5,
    title: 'Food and nutrition — identifying concerns',
    category: 'Health & Nutrition',
    description: 'Practise identifying when a service user may be at nutritional risk, how to record concerns and when to escalate.',
    difficulty: 'Beginner',
    duration: '6 min',
    status: 'In progress',
  },
  {
    id: 6,
    title: 'Completing an incident report correctly',
    category: 'Incident Reporting',
    description: 'Step through the incident reporting procedure with a realistic example, including what to record, who to notify and by when.',
    difficulty: 'Beginner',
    duration: '5 min',
    status: 'Completed',
  },
  {
    id: 7,
    title: 'Responding to a fire alarm',
    category: 'Health & Safety',
    description: 'Practise the correct fire evacuation procedure, your responsibilities for service users with limited mobility, and how to report.',
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
]

const difficultyColour: Record<Difficulty, string> = {
  Beginner: 'bg-green-50 text-green-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-red-50 text-red-700',
}

const statusColour: Record<Status, string> = {
  'Not started': 'text-slate-500',
  'In progress': 'text-amber-600',
  'Completed': 'text-teal-600',
}

const categories = ['All', ...Array.from(new Set(scenarios.map(s => s.category)))]

export default function ScenariosPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeScenario, setActiveScenario] = useState<number | null>(null)

  const filtered = activeCategory === 'All' ? scenarios : scenarios.filter(s => s.category === activeCategory)
  const completedCount = scenarios.filter(s => s.status === 'Completed').length

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Practice Scenarios</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Realistic care scenarios in a safe space. Build your confidence before you face them for real.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-teal-700">{completedCount}/{scenarios.length}</p>
            <p className="text-xs text-slate-500">completed</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scenario cards */}
        <div className="space-y-3">
          {filtered.map(scenario => (
            <div
              key={scenario.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${statusColour[scenario.status]}`}>
                      {scenario.status === 'Completed' ? (
                        <CheckCircle size={18} />
                      ) : scenario.status === 'In progress' ? (
                        <Clock size={18} />
                      ) : (
                        <PlayCircle size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug">{scenario.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{scenario.category}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400">{scenario.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColour[scenario.difficulty]}`}>
                      {scenario.difficulty}
                    </span>
                    <span className={`text-xs font-medium ${statusColour[scenario.status]}`}>
                      {scenario.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pl-7">{scenario.description}</p>
                <div className="flex gap-2 mt-4 pl-7">
                  <button
                    onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
                    className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <PlayCircle size={15} />
                    {scenario.status === 'Completed' ? 'Repeat scenario' : scenario.status === 'In progress' ? 'Continue' : 'Start scenario'}
                  </button>
                  <button className="text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium px-4 py-2 rounded-lg transition-colors">
                    View guidance
                  </button>
                </div>
              </div>

              {activeScenario === scenario.id && (
                <div className="border-t border-teal-100 bg-teal-50 px-5 py-4">
                  <p className="text-sm font-semibold text-teal-800 mb-2">Scenario in progress — Demo preview</p>
                  <div className="bg-white border border-teal-200 rounded-xl p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-800 mb-2">Scene setting:</p>
                    <p className="leading-relaxed text-slate-600">
                      You are on the afternoon shift. Mrs. A (a service user in Room 4) tells you she does not want to
                      take her blood pressure medication today. She says she &quot;doesn&apos;t feel well&quot; and wants to rest.
                      She is calm and appears to understand what you are saying.
                    </p>
                    <p className="font-medium text-slate-800 mt-3 mb-1">What do you do first?</p>
                    <div className="space-y-2 mt-2">
                      {['Try to persuade her by explaining the medication is important', 'Respect her decision, record it on the MAR chart and notify your manager', 'Give her a reduced dose and record that instead', 'Leave the medication and do not record anything yet'].map((opt, i) => (
                        <button key={i} className="w-full text-left text-sm border border-slate-200 hover:border-teal-400 hover:bg-teal-50 rounded-lg px-3 py-2 transition-colors">
                          <span className="font-semibold text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    This is a demo preview. The full scenario system will guide you through multiple steps with feedback.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
