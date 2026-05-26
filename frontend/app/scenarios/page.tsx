'use client'
import { useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { PlayCircle, CheckCircle, Clock, BookOpen, AlertCircle } from 'lucide-react'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
type Status = 'Not started' | 'In progress' | 'Reviewed'

interface Scenario {
  id: number
  title: string
  category: string
  situation: string
  worries: string
  helps: string
  escalate: string
  difficulty: Difficulty
  duration: string
  status: Status
}

const scenarios: Scenario[] = [
  {
    id: 1,
    title: 'Medication-related concern: knowing when to escalate',
    category: 'Medication awareness',
    situation: 'A service user declines their prescribed medication, or you notice a possible medication concern during a visit.',
    worries: 'Whether to act immediately, whether the concern is serious, and who to contact first.',
    helps: 'Identifying the correct escalation route and understanding when a medication concern needs immediate action from the trained lead.',
    escalate: 'Contact the medication lead or senior on duty immediately if medication has been refused, missed or may have been given incorrectly.',
    difficulty: 'Intermediate',
    duration: '8 min',
    status: 'Not started',
  },
  {
    id: 2,
    title: 'Safeguarding concern: knowing who to contact',
    category: 'Safeguarding',
    situation: 'Something during a visit does not feel right — signs of possible harm, neglect or a situation that concerns you about the safety of a service user.',
    worries: 'Whether to investigate yourself, who to tell and how to raise it.',
    helps: 'Understanding the safeguarding escalation route and why staff should not investigate alone.',
    escalate: 'Contact the safeguarding lead or registered manager immediately. Do not investigate independently.',
    difficulty: 'Advanced',
    duration: '12 min',
    status: 'Not started',
  },
  {
    id: 3,
    title: 'Managing an aggressive or distressed service user',
    category: 'Communication',
    situation: 'A service user becomes distressed or verbally aggressive during a call. You are unsure how to respond safely.',
    worries: 'How to stay calm, whether to continue the visit, and when to step back and call for help.',
    helps: 'Calm communication approaches and a clear guide on when to remove yourself and escalate to the senior on duty.',
    escalate: 'If the situation is unsafe or not resolving, contact the senior on duty. Leave if you are in danger and call 999 if needed.',
    difficulty: 'Intermediate',
    duration: '10 min',
    status: 'Reviewed',
  },
  {
    id: 4,
    title: 'Supporting a service user at end of life',
    category: 'End of Life',
    situation: 'A service user you support is approaching end of life. The situation feels different from usual and you are unsure of your role.',
    worries: 'What to do, what not to do, and whether to involve family or the care team.',
    helps: 'Understanding your role, knowing who to involve, and following the local end-of-life guidance correctly.',
    escalate: 'Contact the registered manager or senior if there is a change in condition, a family concern or any uncertainty about the care plan.',
    difficulty: 'Advanced',
    duration: '15 min',
    status: 'Not started',
  },
  {
    id: 5,
    title: 'Food and nutrition — spotting when to escalate',
    category: 'Health & Nutrition',
    situation: 'A service user refuses food, is eating very little, or you notice a change in appetite during a visit.',
    worries: 'Whether the situation is serious, whether to mention it to the care team, and who to tell.',
    helps: 'Recognising when a food or nutrition concern needs to be escalated and to whom, following provider procedure.',
    escalate: 'Contact the senior or registered manager if refusal is repeated, the person appears to be losing weight, or there are signs of dehydration.',
    difficulty: 'Beginner',
    duration: '6 min',
    status: 'In progress',
  },
  {
    id: 6,
    title: 'Incident reporting awareness',
    category: 'Incident Reporting',
    situation: 'Something unexpected happens during a visit — a fall, a near miss, or an incident you are unsure how to handle.',
    worries: 'What counts as a reportable incident, what information to capture, and who needs to know.',
    helps: 'Understanding what to note and who to involve. Record the incident in your existing care system using your normal provider procedure.',
    escalate: 'Contact the registered manager if anyone is hurt, at risk, or if the incident involves a possible safeguarding concern.',
    difficulty: 'Beginner',
    duration: '5 min',
    status: 'Reviewed',
  },
  {
    id: 7,
    title: 'Responding to a fire alarm',
    category: 'Health & Safety',
    situation: 'A fire alarm sounds at the home or care setting where you are working. You need to act quickly and safely.',
    worries: 'Your responsibilities for service users with limited mobility and what to do if they cannot move quickly.',
    helps: 'Following the local fire evacuation procedure and understanding your role in keeping service users safe during an alarm.',
    escalate: 'Call 999 immediately if there is a real fire. Contact the registered manager once the evacuation is complete.',
    difficulty: 'Beginner',
    duration: '5 min',
    status: 'Not started',
  },
  {
    id: 8,
    title: 'Handling a complaint from a service user or family member',
    category: 'Complaints',
    situation: 'A service user or family member raises a complaint — formally or informally — during or after a visit.',
    worries: 'Whether to respond immediately, what to say, and how to avoid making the situation worse.',
    helps: 'Understanding the provider\'s complaints procedure and the correct first steps to take.',
    escalate: 'Contact the registered manager as soon as possible. Do not make promises or admissions of fault.',
    difficulty: 'Intermediate',
    duration: '10 min',
    status: 'Not started',
  },
  {
    id: 9,
    title: 'Service user refuses entry at the door',
    category: 'Access / Welfare',
    situation: 'You arrive for a scheduled visit but the service user does not want to let you in. They appear unsettled, distressed or are asking you to leave.',
    worries: 'Whether to leave, whether the person is safe inside, and what to do when you cannot confirm their welfare.',
    helps: 'A clear order of actions — calm communication, contacting the named family contact, and escalating to the registered manager if you cannot confirm safety.',
    escalate: 'Contact the registered manager before leaving if you cannot confirm the service user is safe, or if there are welfare, capacity or safeguarding concerns.',
    difficulty: 'Intermediate',
    duration: '7 min',
    status: 'Not started',
  },
  {
    id: 10,
    title: 'Morning call: refusing food, personal care and medication routine',
    category: 'Morning Support',
    situation: 'A fictional service user is in bed during the morning call and is refusing to get up, refusing food and not wanting personal care. Staff are also concerned because food may be needed before the person\'s medication routine.',
    worries: 'Whether to keep encouraging, whether the person is unwell or distressed, whether the medication routine is affected, and who to contact when family support may take time to arrive.',
    helps: 'Thinking through calm reassurance, checking for immediate concerns, allowing time where safe, contacting the senior, registered manager or medication lead when medication or nutrition is involved, and avoiding pressure or force.',
    escalate: 'Escalate to the senior, registered manager or medication lead if the person continues refusing food, fluids, personal care, toilet support or anything connected to medication. Call 999 if there is immediate danger or serious deterioration.',
    difficulty: 'Intermediate',
    duration: '8 min',
    status: 'Not started',
  },
  {
    id: 11,
    title: 'Service user refuses to come inside from the garden',
    category: 'Outdoor Safety',
    situation: 'A fictional older service user is sitting outside in the garden and does not want to come back inside.',
    worries: 'Whether the person is safe outside, whether the weather, temperature, mobility, falls risk or confusion creates a concern, and how to respect choice without ignoring risk.',
    helps: 'Using calm communication, checking whether the person is comfortable and safe, offering reassurance, giving time where safe, contacting the senior or registered manager if risk increases, and involving the approved family or contact route only where the provider process allows.',
    escalate: 'Escalate if the person appears cold, confused, unwell, at risk of falling, distressed, unsafe, or refuses to come inside despite clear welfare concerns. Call 999 if there is immediate risk.',
    difficulty: 'Beginner',
    duration: '6 min',
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
  'Reviewed': 'text-teal-600',
}

const statusIconBg: Record<Status, string> = {
  'Not started': 'bg-slate-100',
  'In progress': 'bg-amber-50',
  'Reviewed': 'bg-teal-100',
}

const CONTEXT_CHIPS = ['Fictional demo scenarios', 'Shift-time guidance', 'No real service-user data', 'Controlled pilot']

const categories = ['All', ...Array.from(new Set(scenarios.map(s => s.category)))]

export default function ScenariosPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeScenario, setActiveScenario] = useState<number | null>(null)

  const filtered = activeCategory === 'All' ? scenarios : scenarios.filter(s => s.category === activeCategory)
  const reviewedCount = scenarios.filter(s => s.status === 'Reviewed').length
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
                Guidance hub
              </span>
              <h1 className="text-3xl font-bold mb-2.5 leading-snug">Scenario Guidance</h1>
              <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
                Get safe shift-time guidance for real care situations. These are fictional demo examples to help you think through what to do next — not training assessments or official records.
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
              <p className="text-4xl font-bold leading-none">{reviewedCount}</p>
              <p className="text-teal-200 text-xs font-semibold mt-1.5">of {scenarios.length} reviewed</p>
            </div>
          </div>
        </div>

        {/* Guidance notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-4">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-amber-900">About these scenarios — controlled pilot</p>
            <ul className="space-y-1 text-xs text-amber-800 leading-relaxed">
              <li>• These are fictional examples. Do not enter real service-user names, care plans, medication details or any confidential information.</li>
              <li>• Continue recording visits in your existing care system as normal — WorkTwin does not replace it.</li>
              <li>• These scenarios do not replace your registered manager, senior carer, medication lead, safeguarding lead or emergency services.</li>
              <li>• Guidance here reflects common provider approaches. Always follow your own organisation&apos;s policies and procedures.</li>
            </ul>
          </div>
        </div>

        {/* Fictional service-user guidance cards */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Fictional service-user guidance cards</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              These demo cards show how future versions could organise person-specific guidance safely. Real service-user details, family contacts, medication details and care-plan information must not be entered in this controlled preview.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card: Ada Rahman */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-teal-700 px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm leading-snug">Ada Rahman</p>
                  <p className="text-teal-200 text-xs mt-0.5">Situation focus: Morning routine and reassurance</p>
                </div>
                <span className="shrink-0 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full whitespace-nowrap">
                  Fictional demo profile
                </span>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <p className="text-xs text-slate-400 italic leading-relaxed">This is a fictional example, not a real service-user record.</p>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Known routine</p>
                  <p className="text-slate-700 leading-relaxed">Takes time to settle during morning calls and may refuse food or personal care if rushed.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-0.5">What may help</p>
                  <p className="text-slate-700 leading-relaxed">Use calm reassurance, give time where safe, offer simple choices and involve the approved senior/manager route if concerns continue.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Demo contact route</p>
                  <p className="text-slate-600 leading-relaxed">Daughter / family contact route would only be shown in a real secure pilot after approval. In this demo, contact the senior or registered manager.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Escalate if</p>
                  <p className="text-amber-900 leading-relaxed">Food, fluids, toilet support, personal care or medication-related routine remains affected, or there are signs of deterioration, distress or immediate risk.</p>
                </div>
              </div>
            </div>

            {/* Card: George Miller */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-teal-700 px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm leading-snug">George Miller</p>
                  <p className="text-teal-200 text-xs mt-0.5">Situation focus: Garden refusal and outdoor safety</p>
                </div>
                <span className="shrink-0 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full whitespace-nowrap">
                  Fictional demo profile
                </span>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <p className="text-xs text-slate-400 italic leading-relaxed">This is a fictional example, not a real service-user record.</p>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Known routine</p>
                  <p className="text-slate-700 leading-relaxed">Enjoys sitting outside and may resist coming inside when he wants more time in the garden.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-0.5">What may help</p>
                  <p className="text-slate-700 leading-relaxed">Check comfort, weather, warmth, mobility and falls risk. Use calm conversation and offer a gentle choice where safe.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Demo contact route</p>
                  <p className="text-slate-600 leading-relaxed">Family/contact guidance would only be available in a real secure pilot after approval. In this demo, contact the senior or registered manager if risk increases.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Escalate if</p>
                  <p className="text-amber-900 leading-relaxed">The person appears cold, confused, unwell, distressed, unsafe, at risk of falling or refuses to come inside despite welfare concerns.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Safety boundary text */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-600">Safety boundaries: </span>
              Fictional demo profiles only. Not live service-user records. No real names, contacts, care plans or medication details. Staff must continue using existing care-recording systems. WorkTwin does not replace the senior, registered manager, medication lead, safeguarding lead or emergency services.
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
              <p className="text-2xl font-bold text-teal-700">{reviewedCount}</p>
              <p className="text-xs text-slate-500">Reviewed</p>
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
              <p className="text-xs text-slate-500">Guidance scenarios</p>
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
                    {scenario.status === 'Reviewed' ? (
                      <CheckCircle size={22} className="text-teal-600" />
                    ) : scenario.status === 'In progress' ? (
                      <Clock size={22} className="text-amber-600" />
                    ) : (
                      <PlayCircle size={22} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{scenario.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
                        {scenario.id === 9 && (
                          <span className="text-xs font-bold bg-teal-700 text-white px-2.5 py-1 rounded-full">
                            Guided scenario
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${difficultyColour[scenario.difficulty]}`}>
                          {scenario.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Chips row */}
                    <div className="flex items-center gap-2 flex-wrap mb-4">
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

                    {/* Guidance fields */}
                    <div className="space-y-2.5 mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Situation</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{scenario.situation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">What staff may be worried about</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{scenario.worries}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-0.5">What WorkTwin helps with</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{scenario.helps}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">When to escalate</p>
                        <p className="text-sm text-amber-900 leading-relaxed">{scenario.escalate}</p>
                      </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="flex gap-2.5 flex-wrap">
                      {scenario.id === 9 ? (
                        <Link
                          href="/scenarios/access-refusal"
                          className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <PlayCircle size={15} />
                          Open scenario
                        </Link>
                      ) : (
                        <button
                          onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
                          className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <PlayCircle size={15} />
                          {scenario.status === 'Reviewed' ? 'Review guidance' : scenario.status === 'In progress' ? 'Continue' : 'Open guidance'}
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
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3">Controlled pilot preview</p>
                    <div className="bg-white border border-teal-200 rounded-2xl p-5 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800 mb-2">Example situation:</p>
                      <p className="leading-relaxed text-slate-600">
                        This is a fictional example. A person being supported says they do not want to take a prescribed medicine and also says they do not feel well. In real work, staff should follow local medication policy, record concerns through the approved route and escalate to the appropriate trained lead.
                      </p>
                      <p className="font-semibold text-slate-800 mt-4 mb-2">What would you do first?</p>
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
                      Controlled pilot preview — fictional scenario only. Real medication, safeguarding, wellbeing or immediate-risk concerns must be escalated to the right human lead and recorded in your existing care system.
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Controlled pilot preview</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      The full guidance scenario for{' '}
                      <span className="font-semibold text-slate-700">{scenario.title}</span> is being
                      prepared and will walk you through example steps with escalation reminders.
                    </p>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      Controlled pilot only. Scenario content for this topic must be reviewed before wider use.
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
            Fictional demo scenarios — controlled pilot only. These scenarios are not competency assessments, training sign-offs or operational advice. They do not replace speaking to your registered manager, safeguarding lead, trained clinician or emergency services. Continue recording visits in your existing care system as normal.
          </p>
        </div>

      </div>
    </AppLayout>
  )
}
