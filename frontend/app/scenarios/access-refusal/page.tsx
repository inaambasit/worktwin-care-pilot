'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import {
  ArrowLeft, CheckCircle, Check, Phone, AlertTriangle, ChevronRight,
  Shield, User, ClipboardList, Clock, FileText,
} from 'lucide-react'

const SESSION_KEY = 'wt:scenario:doorstep-refusal'

type Step1Choice = 'A' | 'B' | 'C' | null
type Step2Choice = 'A' | 'B' | 'C' | null
type RefusedOption = 'refused' | 'refused-then-entered' | 'entered-normal' | ''
type FamilyOption = 'spoke' | 'voicemail' | 'no-reach' | ''
type ShaguftaOption = 'spoke' | 'will-call' | 'not-needed' | ''
type Concern =
  | 'welfare' | 'safety' | 'capacity' | 'distress'
  | 'neglect' | 'missed-medication' | 'immediate-risk' | 'none'

interface Step3State {
  arrivalTime: string
  saidOrDid: string
  refused: RefusedOption
  familyContacted: FamilyOption
  familySaid: string
  shaguftaContacted: ShaguftaOption
  concerns: Concern[]
}

const initialStep3: Step3State = {
  arrivalTime: '',
  saidOrDid: '',
  refused: '',
  familyContacted: '',
  familySaid: '',
  shaguftaContacted: '',
  concerns: [],
}

const STEP1_OPTIONS = [
  {
    key: 'A' as const,
    label: 'Keep knocking until they agree to open the door',
    sub: 'Stay at the door and try to persuade them firmly.',
    feedback:
      "Don't keep pressing. The service user has the right to refuse, and persistent knocking raises distress and safeguarding risk. Step back and make a calm phone call instead.",
    recommended: false,
  },
  {
    key: 'B' as const,
    label: "Step back and call the service user's son",
    sub: 'Named family contact for door-refusal.',
    feedback:
      'Right call. Speak calmly from the doorstep, then phone the named contact to reassure the service user before trying again.',
    recommended: true,
  },
  {
    key: 'C' as const,
    label: 'Mark the visit as refused and leave',
    sub: 'Update the log and continue to the next visit.',
    feedback:
      'Do not leave if you cannot confirm the service user is safe. A refusal at the door can hide a welfare or capacity concern - make a calm contact attempt first, and escalate to Shagufta if you are unsure.',
    recommended: false,
  },
]

const STEP2_OPTIONS = [
  {
    key: 'A' as const,
    label: 'Yes - contact answered and is helping',
    sub: 'They will phone the service user now and call you back.',
    escalate: false,
    badge: null as string | null,
  },
  {
    key: 'B' as const,
    label: 'No - the family contact did not answer',
    sub: "Voicemail, no reply, or the call wouldn't connect.",
    escalate: true,
    badge: 'Escalate next' as string | null,
  },
  {
    key: 'C' as const,
    label: 'The family contact raised a concern',
    sub: "They told you something that doesn't feel right.",
    escalate: true,
    badge: 'Escalate now' as string | null,
  },
]

const CONCERNS: { val: Concern; label: string }[] = [
  { val: 'welfare', label: 'Welfare' },
  { val: 'safety', label: 'Safety' },
  { val: 'capacity', label: 'Capacity' },
  { val: 'distress', label: 'Distress' },
  { val: 'neglect', label: 'Neglect' },
  { val: 'missed-medication', label: 'Missed medication' },
  { val: 'immediate-risk', label: 'Immediate risk' },
  { val: 'none', label: 'No concerns today' },
]

const STEP_LABELS = ['First response', 'Make contact', 'Record the visit']

const CHECKLIST_ITEMS = [
  "Explain you're outside for the scheduled visit",
  'Explain that the service user has declined entry',
  'Ask if they can speak to or reassure the service user',
  'Ask whether there are any known concerns today',
  'Record the outcome of the call',
]

const HERO_STEPS = [
  {
    icon: <User size={22} className="text-white" />,
    title: 'Service user refuses entry at the door',
    body: 'You arrive for a scheduled visit. The service user, who is around 100 years old, comes to the door but does not want to let you in. He seems unsettled and is asking you to come back another day. You are unsure what to do.',
    chips: ['Access / Welfare', 'Service user age ~100', 'Doorstep visit', 'Scheduled visit'],
  },
  {
    icon: <Phone size={22} className="text-white" />,
    title: "Make contact with the service user's son",
    body: 'Step back from the door, find a quiet spot on the path, and phone the named first contact. Use the checklist below so the call is calm and clear.',
    chips: ['Step 2 of 3', 'Named family contact', 'Calm call', 'Escalate if unsure'],
  },
  {
    icon: <FileText size={22} className="text-white" />,
    title: 'Record and escalate if needed',
    body: 'Write what happened in plain words while it is fresh. If anything in your notes is a welfare or safety concern, phone Shagufta before you leave the visit.',
    chips: ['Final step', 'Record the visit', 'Escalate if needed', 'Safe route'],
  },
]

function PillGroup({
  label,
  required,
  error,
  options,
  value,
  onChange,
}: {
  label: string
  required?: boolean
  error?: boolean
  options: { val: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.val}
            type="button"
            onClick={() => onChange(opt.val)}
            className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
              value === opt.val
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:text-teal-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">Please select an option.</p>}
    </div>
  )
}

export default function AccessRefusalPage() {
  const [step, setStep] = useState(1)
  const [step1Choice, setStep1Choice] = useState<Step1Choice>(null)
  const [step2Choice, setStep2Choice] = useState<Step2Choice>(null)
  const [checklistDone, setChecklistDone] = useState<Set<number>>(new Set())
  const [step3, setStep3] = useState<Step3State>(initialStep3)
  const [step3Errors, setStep3Errors] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.step) setStep(s.step)
      if (s.step1Choice !== undefined) setStep1Choice(s.step1Choice)
      if (s.step2Choice !== undefined) setStep2Choice(s.step2Choice)
      if (s.step3) setStep3(s.step3)
      if (s.completed) setCompleted(s.completed)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ step, step1Choice, step2Choice, step3, completed }),
      )
    } catch {}
  }, [step, step1Choice, step2Choice, step3, completed])

  function handleStep3Change<K extends keyof Step3State>(field: K, value: Step3State[K]) {
    setStep3(prev => ({ ...prev, [field]: value }))
    setStep3Errors(prev => {
      const n = new Set(prev)
      n.delete(field as string)
      return n
    })
  }

  function toggleConcern(c: Concern) {
    setStep3(prev => {
      if (c === 'none') return { ...prev, concerns: ['none'] }
      const without = prev.concerns.filter(x => x !== 'none' && x !== c)
      const next = prev.concerns.includes(c) ? without : [...without, c]
      return { ...prev, concerns: next }
    })
    setStep3Errors(prev => {
      const n = new Set(prev)
      n.delete('concerns')
      return n
    })
  }

  function handleSave() {
    const errs = new Set<string>()
    if (!step3.arrivalTime.trim()) errs.add('arrivalTime')
    if (step3.saidOrDid.trim().length < 10) errs.add('saidOrDid')
    if (!step3.refused) errs.add('refused')
    if (!step3.familyContacted) errs.add('familyContacted')
    if (!step3.shaguftaContacted) errs.add('shaguftaContacted')
    if (step3.concerns.length === 0) errs.add('concerns')
    setStep3Errors(errs)
    if (errs.size === 0) setCompleted(true)
  }

  function handleRestart() {
    setStep(1)
    setStep1Choice(null)
    setStep2Choice(null)
    setChecklistDone(new Set())
    setStep3(initialStep3)
    setStep3Errors(new Set())
    setCompleted(false)
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {}
  }

  const immediateRisk = step3.concerns.includes('immediate-risk')
  const hasConcerns = step3.concerns.length > 0 && !step3.concerns.includes('none')
  const hero = HERO_STEPS[step - 1]

  /* ── Reusable safety panel cards ── */

  const card999 = (
    <div className="bg-red-700 rounded-2xl p-5 text-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Phone size={15} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest">Immediate danger</p>
      </div>
      <p className="text-sm font-semibold leading-snug mb-1.5">
        If anyone is in immediate danger, call 999 first.
      </p>
      <p className="text-xs text-red-200 leading-relaxed mb-4">
        Don&apos;t wait on hold for the family contact or for Shagufta. Call 999, then phone Shagufta
        as soon as you safely can.
      </p>
      <a
        href="tel:999"
        className="flex items-center justify-center gap-2 bg-white text-red-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full"
      >
        <Phone size={15} />
        Call 999
      </a>
    </div>
  )

  const cardShagufta = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
          <Shield size={18} className="text-teal-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Shagufta</p>
          <p className="text-xs text-slate-500 leading-tight">
            Safeguarding Lead / Registered Manager
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-600 mb-3">07700 900 412 (demo)</p>
      <a
        href="tel:07700900412"
        className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors w-full"
      >
        <Phone size={14} />
        Call Shagufta
      </a>
    </div>
  )

  const cardFamily = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          <User size={18} className="text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Service user&apos;s son</p>
          <p className="text-xs text-slate-500 leading-tight">Named first contact</p>
        </div>
      </div>
      <p className="text-xs text-slate-600 mb-3">07700 900 188 (demo)</p>
      <a
        href="tel:07700900188"
        className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors w-full"
      >
        <Phone size={14} />
        Call family contact
      </a>
    </div>
  )

  const cardPrivacy = (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        Practice mode. Your private notes and personal Ask WorkTwin questions stay private in this
        demo. Structured visit records may be shared with authorised leads where required.
      </p>
    </div>
  )

  const escalateUrgent = immediateRisk
  const escalateWarning = hasConcerns && !immediateRisk
  const cardEscalate = (
    <div
      className={`rounded-2xl p-5 border-2 transition-all ${
        escalateUrgent
          ? 'bg-red-600 border-red-500 text-white shadow-lg'
          : escalateWarning
          ? 'bg-amber-500 border-amber-400 text-white shadow-md'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle
          size={16}
          className={escalateUrgent || escalateWarning ? 'text-white' : 'text-amber-600'}
        />
        <p
          className={`text-xs font-bold uppercase tracking-widest ${
            escalateUrgent || escalateWarning ? 'text-white/90' : 'text-amber-700'
          }`}
        >
          Escalate now if&hellip;
        </p>
      </div>
      <ul
        className={`space-y-1.5 text-xs leading-relaxed ${
          escalateUrgent || escalateWarning ? 'text-white/90' : 'text-amber-800'
        }`}
      >
        {[
          "You're worried about welfare, safety or capacity",
          'The service user is distressed or confused',
          'There may be neglect or unsafe living conditions',
          'Medication has been missed today',
          'Anything the family contact said worried you',
          'You cannot confirm the service user is safe',
        ].map(item => (
          <li key={item} className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 ${
                escalateUrgent || escalateWarning ? 'text-white' : 'text-amber-500'
              }`}
            >
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )

  const safetyPanel = (
    <div className="space-y-4">
      {step === 3 ? (
        <>
          {cardEscalate}
          {cardShagufta}
          {card999}
        </>
      ) : (
        <>
          {card999}
          {cardShagufta}
          {step === 1 && cardFamily}
        </>
      )}
      {cardPrivacy}
    </div>
  )

  /* ── Hero card ── */
  const heroCard = (
    <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
      <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
          <Shield size={11} />
          Practice scenario
        </span>
        <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
          {hero.icon}
        </div>
        <h1 className="text-2xl font-bold mb-2.5 leading-snug">{hero.title}</h1>
        <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">{hero.body}</p>
        <div className="flex flex-wrap gap-2">
          {hero.chips.map(chip => (
            <span
              key={chip}
              className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  )

  /* ── Stepper ── */
  const stepper = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
        STEP {step} OF 3
      </p>
      <div className="flex items-start">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? 'bg-teal-600 border-teal-600'
                      : active
                      ? 'bg-teal-700 border-teal-700 ring-4 ring-teal-100'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {done ? (
                    <Check size={16} className="text-white" strokeWidth={2.5} />
                  ) : (
                    <span
                      className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-400'}`}
                    >
                      {n}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs font-medium mt-2 text-center px-1 leading-tight max-w-[70px] ${
                    active ? 'text-teal-700' : done ? 'text-teal-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </p>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-[18px] mx-2 rounded-full ${
                    done ? 'bg-teal-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  /* ── Completion screen ── */
  if (completed) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-6">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all mb-6"
          >
            <ArrowLeft size={13} />
            Back to Practice Scenarios
          </Link>
          <div className="max-w-xl mx-auto space-y-5">
            <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 rounded-3xl p-8 text-white text-center relative overflow-hidden shadow-lg">
              <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -left-6 -bottom-10 w-36 h-36 rounded-full bg-teal-500/20 pointer-events-none" />
              <div className="relative">
                <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Scenario complete</h2>
                <p className="text-teal-200 text-sm font-semibold mb-3">
                  You followed the safe route.
                </p>
                <p className="text-teal-100 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                  You stayed calm at the door, contacted the family contact first, and recorded what
                  happened in plain words.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'Stayed calm',
                    'Contacted family contact',
                    'Recorded visit',
                    'Escalated if needed',
                  ].map(chip => (
                    <span
                      key={chip}
                      className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCompleted(false)
                  setStep(3)
                }}
                className="flex-1 text-sm border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                Review my record
              </button>
              <Link
                href="/scenarios"
                className="flex-1 text-center text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                Back to Practice Scenarios
              </Link>
            </div>
            {card999}
            {cardPrivacy}
          </div>
        </div>
      </AppLayout>
    )
  }

  /* ── Main render ── */
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-6">
        {/* Breadcrumb */}
        <div className="space-y-1 mb-3">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all"
          >
            <ArrowLeft size={13} />
            Back to Practice Scenarios
          </Link>
          <p className="text-xs text-slate-400">
            Practice Scenarios&nbsp;/&nbsp;Doorstep refusal&nbsp;/&nbsp;
            <span className="text-teal-700 font-medium">{STEP_LABELS[step - 1]}</span>
          </p>
        </div>

        {/* Mode chips */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Shield size={11} />
            Safe practice mode
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Clock size={11} />
            7 min walk-through
          </span>
        </div>

        {/* Two-column grid */}
        <div className="lg:grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* ── Left: main scenario content ── */}
          <div className="space-y-5">
            {heroCard}
            {stepper}

            {/* ===== STEP 1 ===== */}
            {step === 1 && (
              <div className="space-y-3">
                {/* Calm reminder */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <ClipboardList size={18} className="text-teal-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-teal-900 mb-1.5">
                        Take a breath — there is a clear order to follow
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed mb-2">
                        Stay calm and speak respectfully through the door. You don&apos;t need to
                        solve this on your own.
                      </p>
                      <p className="text-sm font-semibold text-teal-800 leading-relaxed">
                        Do not leave if you cannot confirm the service user is safe. Escalate to
                        Shagufta if you are unsure.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decision card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">What should you do first?</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Pick the option that feels right — WorkTwin will show the recommended response.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {STEP1_OPTIONS.map(opt => {
                      const sel = step1Choice === opt.key
                      return (
                        <div key={opt.key}>
                          <button
                            onClick={() => setStep1Choice(opt.key)}
                            className={`w-full text-left border-2 rounded-2xl p-4 transition-all flex items-center gap-4 group ${
                              sel
                                ? opt.recommended
                                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                                  : 'border-amber-400 bg-amber-50'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-all ${
                                sel
                                  ? opt.recommended
                                    ? 'bg-teal-600 border-teal-600 text-white'
                                    : 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-300'
                              }`}
                            >
                              {opt.key}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold ${
                                  sel
                                    ? opt.recommended
                                      ? 'text-teal-900'
                                      : 'text-amber-900'
                                    : 'text-slate-800'
                                }`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                            </div>
                            {sel && opt.recommended && (
                              <span className="bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
                                Recommended
                              </span>
                            )}
                            <ChevronRight
                              size={16}
                              className={`shrink-0 transition-colors ${
                                sel
                                  ? opt.recommended
                                    ? 'text-teal-500'
                                    : 'text-amber-400'
                                  : 'text-slate-300 group-hover:text-slate-400'
                              }`}
                            />
                          </button>
                          {sel && (
                            <div
                              className={`mt-2.5 rounded-xl px-4 py-3.5 text-sm leading-relaxed border-l-4 ${
                                opt.recommended
                                  ? 'bg-teal-50 border-l-teal-500 text-teal-800'
                                  : 'bg-amber-50 border-l-amber-400 text-amber-900'
                              }`}
                            >
                              <p className="font-semibold mb-0.5">
                                {opt.recommended
                                  ? 'Recommended first action'
                                  : 'Not the recommended route'}
                              </p>
                              {opt.feedback}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button
                  disabled={step1Choice !== 'B'}
                  onClick={() => setStep(2)}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl transition-all ${
                    step1Choice === 'B'
                      ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Continue to Step 2
                  <ChevronRight size={16} />
                </button>
                {step1Choice && step1Choice !== 'B' && (
                  <p className="text-xs text-center text-slate-500 -mt-1">
                    Select the recommended safe route to continue.
                  </p>
                )}
              </div>
            )}

            {/* ===== STEP 2 ===== */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Confirmation banner */}
                <div className="flex items-start gap-3 bg-teal-700 text-white rounded-2xl px-5 py-4 shadow-sm">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-0.5">Correct first response.</p>
                    <p className="text-sm text-teal-100 leading-relaxed">
                      You stepped back and chose to contact the named family contact before leaving
                      or pressing at the door.
                    </p>
                  </div>
                </div>

                {/* Family contact card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    Call the named family contact
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                      <User size={20} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Service user&apos;s son</p>
                      <p className="text-xs text-slate-500">Named first contact</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        07700 900 188 (demo)
                      </p>
                    </div>
                  </div>
                  <a
                    href="tel:07700900188"
                    className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors w-full mb-3"
                  >
                    <Phone size={14} />
                    Call family contact
                  </a>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Step back from the doorstep first. Speak calmly and keep the call factual.
                  </p>
                </div>

                {/* Checklist card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Call checklist</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      {checklistDone.size} of {CHECKLIST_ITEMS.length} complete
                    </span>
                  </div>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item, i) => {
                      const done = checklistDone.has(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setChecklistDone(prev => {
                              const n = new Set(prev)
                              if (n.has(i)) n.delete(i)
                              else n.add(i)
                              return n
                            })
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            done
                              ? 'bg-teal-50 border-teal-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              done ? 'bg-teal-600 border-teal-600' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {done && <Check size={13} className="text-white" strokeWidth={2.5} />}
                          </div>
                          <span
                            className={`text-sm ${
                              done ? 'text-teal-800 font-medium' : 'text-slate-700'
                            }`}
                          >
                            {item}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Outcome card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Did the son answer?</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select what happened on the call.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {STEP2_OPTIONS.map(opt => {
                      const sel = step2Choice === opt.key
                      const isRed = opt.key === 'C'
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setStep2Choice(opt.key)}
                          className={`w-full text-left border-2 rounded-2xl p-4 transition-all flex items-center gap-4 group ${
                            sel
                              ? isRed
                                ? 'border-red-400 bg-red-50'
                                : opt.escalate
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-teal-500 bg-teal-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-all ${
                              sel
                                ? isRed
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : opt.escalate
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-300'
                            }`}
                          >
                            {opt.key}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold ${
                                sel
                                  ? isRed
                                    ? 'text-red-900'
                                    : opt.escalate
                                    ? 'text-amber-900'
                                    : 'text-teal-900'
                                  : 'text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                          </div>
                          {sel && opt.badge && (
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                                isRed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                          <ChevronRight
                            size={16}
                            className={`shrink-0 ${
                              sel
                                ? isRed
                                  ? 'text-red-400'
                                  : opt.escalate
                                  ? 'text-amber-400'
                                  : 'text-teal-500'
                                : 'text-slate-300 group-hover:text-slate-400'
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Escalation callouts */}
                {step2Choice === 'B' && (
                  <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">
                        You could not reach the family contact.
                      </p>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Call Shagufta before leaving if you cannot confirm the service user is safe.
                      </p>
                      <a
                        href="tel:07700900412"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:text-amber-900 mt-2"
                      >
                        <Phone size={14} />
                        07700 900 412 (demo) — Shagufta
                      </a>
                    </div>
                  </div>
                )}
                {step2Choice === 'C' && (
                  <div className="flex items-start gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-5 py-4">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-900 mb-1">A concern was raised.</p>
                      <p className="text-sm text-red-800 leading-relaxed">
                        Phone Shagufta now and record what was said.
                      </p>
                      <a
                        href="tel:07700900412"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800 hover:text-red-900 mt-2"
                      >
                        <Phone size={14} />
                        07700 900 412 (demo) — Shagufta
                      </a>
                    </div>
                  </div>
                )}

                <button
                  disabled={step2Choice === null}
                  onClick={() => setStep(3)}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl transition-all ${
                    step2Choice !== null
                      ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Continue to Step 3
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={15} />
                  Back to Step 1
                </button>
              </div>
            )}

            {/* ===== STEP 3 ===== */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Record the visit</h2>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Stick to what you saw and heard. Use the service user&apos;s words where you
                      can. You don&apos;t need to write a long story.
                    </p>
                  </div>

                  {/* Arrival time */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Time of arrival <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="time"
                        value={step3.arrivalTime}
                        onChange={e => handleStep3Change('arrivalTime', e.target.value)}
                        className={`w-full border-2 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors ${
                          step3Errors.has('arrivalTime')
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                    </div>
                    {step3Errors.has('arrivalTime') && (
                      <p className="text-xs text-red-500 mt-1.5">Required.</p>
                    )}
                  </div>

                  {/* What did they say/do */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      What did the service user say or do?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={step3.saidOrDid}
                      onChange={e => handleStep3Change('saidOrDid', e.target.value)}
                      placeholder={`e.g. "He came to the door and said 'not today, love, come back tomorrow'."`}
                      className={`w-full border-2 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors resize-none ${
                        step3Errors.has('saidOrDid')
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    />
                    {step3Errors.has('saidOrDid') && (
                      <p className="text-xs text-red-500 mt-1.5">
                        Please write at least 10 characters.
                      </p>
                    )}
                  </div>

                  <PillGroup
                    label="Was entry refused?"
                    required
                    error={step3Errors.has('refused')}
                    options={[
                      { val: 'refused', label: 'Yes, refused' },
                      { val: 'refused-then-entered', label: 'Refused, then let me in' },
                      { val: 'entered-normal', label: 'No, entered as normal' },
                    ]}
                    value={step3.refused}
                    onChange={v => handleStep3Change('refused', v as RefusedOption)}
                  />

                  <PillGroup
                    label="Did you contact the family contact?"
                    required
                    error={step3Errors.has('familyContacted')}
                    options={[
                      { val: 'spoke', label: 'Yes, spoke to them' },
                      { val: 'voicemail', label: 'Left voicemail' },
                      { val: 'no-reach', label: "No, couldn't reach" },
                    ]}
                    value={step3.familyContacted}
                    onChange={v => handleStep3Change('familyContacted', v as FamilyOption)}
                  />

                  {/* What did they say */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      What did they say?
                    </label>
                    <textarea
                      rows={2}
                      value={step3.familySaid}
                      onChange={e => handleStep3Change('familySaid', e.target.value)}
                      placeholder="Write the outcome of the call in plain words."
                      className="w-full border-2 border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors resize-none"
                    />
                  </div>

                  <PillGroup
                    label="Did you contact Shagufta?"
                    required
                    error={step3Errors.has('shaguftaContacted')}
                    options={[
                      { val: 'spoke', label: 'Yes, spoke to Shagufta' },
                      { val: 'will-call', label: 'No - will call now' },
                      { val: 'not-needed', label: 'Not needed this visit' },
                    ]}
                    value={step3.shaguftaContacted}
                    onChange={v => handleStep3Change('shaguftaContacted', v as ShaguftaOption)}
                  />

                  {/* Concerns */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                      Any concerns? (tick all that apply){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CONCERNS.map(c => {
                        const sel = step3.concerns.includes(c.val)
                        return (
                          <button
                            key={c.val}
                            type="button"
                            onClick={() => toggleConcern(c.val)}
                            className={`text-sm font-medium px-3.5 py-2 rounded-full border-2 transition-all ${
                              sel
                                ? c.val === 'immediate-risk'
                                  ? 'bg-red-600 border-red-600 text-white shadow-sm'
                                  : c.val === 'none'
                                  ? 'bg-teal-700 border-teal-700 text-white'
                                  : 'bg-amber-500 border-amber-500 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
                            }`}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                    {step3Errors.has('concerns') && (
                      <p className="text-xs text-red-500 mt-1.5">
                        Please select at least one option.
                      </p>
                    )}
                  </div>

                  {immediateRisk && (
                    <div className="flex items-start gap-3 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3.5">
                      <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">
                        <span className="font-semibold">Immediate risk flagged</span> — call{' '}
                        <a href="tel:999" className="font-bold underline">
                          999
                        </a>{' '}
                        first if anyone is in danger, then phone Shagufta.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-sm"
                >
                  <CheckCircle size={16} />
                  Save record &amp; finish
                </button>
                {step3Errors.size > 0 && (
                  <p className="text-xs text-center text-red-500">
                    Please complete all required fields before saving.
                  </p>
                )}
                <button
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={15} />
                  Back to Step 2
                </button>
              </div>
            )}
          </div>

          {/* ── Right: safety panel ── */}
          <div className="space-y-4 mt-5 lg:mt-0 lg:sticky lg:top-6">
            {safetyPanel}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
