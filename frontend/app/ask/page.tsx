'use client'
import { useState, useRef, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  Send, BookOpen, PlayCircle, List, Zap,
  AlertTriangle, CheckSquare, ChevronDown, Shield, Loader2,
  MessageSquare, ArrowLeft,
  UserCheck, ClipboardList, Building2, Briefcase, BadgeCheck, Heart, Pill,
} from 'lucide-react'
import Link from 'next/link'
import { askWorktwin, AskTimeoutError, checkHealth } from '@/lib/api'
import type { AskResponse } from '@/lib/types'

const MEDICATION_Q = 'Example medication concern: who should I escalate to?'
const SAFEGUARDING_Q = 'Example safeguarding concern: who should I contact?'

const suggestedPrompts = [
  'What should I do when a visitor arrives?',
  'What details should be recorded in the visitor log?',
  'Can a visitor go beyond reception without speaking to staff?',
  SAFEGUARDING_Q,
  MEDICATION_Q,
]

// ---------------------------------------------------------------------------
// Display types - internal to this page, used by both live API and demo fallback
// ---------------------------------------------------------------------------

interface DisplaySource {
  source_label: string
  title: string
  section?: string
  page?: number
}

interface DisplayAnswer {
  question: string
  answer: string
  disclaimer: string | null
  nextSteps: string[]
  sources: DisplaySource[]
  escalateIf: string[]
  learningOption: string
  requiresEscalation: boolean
  allowedToAnswer: boolean
  riskCategory: string
  isDemo: boolean
  contactRoutes: string[]
}

// Demo fallback answers - shown when the backend is unreachable.

const medicationAnswer: DisplayAnswer = {
  question: MEDICATION_Q,
  answer:
    'This is a medication-related concern. WorkTwin cannot provide medication advice or decide the action for staff. Escalate to the medication lead, registered manager or senior person on duty, and follow the approved local medication route.',
  disclaimer: null,
  nextSteps: [],
  sources: [],
  escalateIf: [
    'Call 999 immediately if the service user is showing signs of a serious adverse reaction or is in immediate danger',
  ],
  learningOption: '',
  requiresEscalation: true,
  allowedToAnswer: false,
  riskCategory: 'medication',
  isDemo: true,
  contactRoutes: [
    'Medication Lead',
    'Registered Manager',
    'Senior person on duty',
    'NHS 111 - for urgent non-emergency medical guidance',
    '999 - if the service user is in immediate danger',
  ],
}

const safeguardingAnswer: DisplayAnswer = {
  question: SAFEGUARDING_Q,
  answer:
    'This is a safeguarding-related concern. WorkTwin cannot investigate, decide risk or replace safeguarding judgement. Contact the Designated Safeguarding Lead or your line manager immediately. Do not investigate yourself.',
  disclaimer: null,
  nextSteps: [],
  sources: [],
  escalateIf: [
    'Call 999 immediately if there is immediate risk to life or physical safety',
  ],
  learningOption: '',
  requiresEscalation: true,
  allowedToAnswer: false,
  riskCategory: 'safeguarding',
  isDemo: true,
  contactRoutes: [
    'Designated Safeguarding Lead',
    'Line Manager or Registered Manager',
    'Senior person on duty if the Designated Lead is unavailable',
    '999 - if there is immediate risk to life or physical safety',
  ],
}

const checklistItems = [
  'Use the approved local medication route',
  'Record concerns through the approved system only if your role/training allows',
  'Escalate to the medication lead, registered manager or senior person on duty',
  'Seek urgent clinical or emergency help if there is immediate risk',
  'Do not change, administer or withhold medication based on WorkTwin',
  'Do not enter real MAR details or service-user information into this pilot',
]

const quizQuestion = {
  question: 'In this example medication concern, what is the safest WorkTwin-supported response?',
  options: [
    'Use WorkTwin to decide whether to give the medication',
    'Escalate through the approved medication route and speak to the right trained lead',
    'Change the medication timing yourself',
  ],
  correct: 1,
}

function mapApiResponse(question: string, res: AskResponse): DisplayAnswer {
  return {
    question,
    answer: res.answer,
    disclaimer: null,
    nextSteps: res.next_steps,
    sources: res.sources.map((s, i) => ({
      source_label: s.source_label ?? `[Source ${i + 1}]`,
      title: s.document_name,
      section: s.section,
      page: s.page,
    })),
    escalateIf: res.escalate_if,
    learningOption: res.learning_option ?? '',
    requiresEscalation: res.requires_escalation,
    allowedToAnswer: res.allowed_to_answer,
    riskCategory: res.risk_category,
    isDemo: false,
    contactRoutes: res.contact_routes ?? [],
  }
}

function getDemoFallback(question: string): DisplayAnswer | null {
  if (question === MEDICATION_Q) return medicationAnswer
  if (question === SAFEGUARDING_Q) return safeguardingAnswer
  return null
}

const HIGH_RISK_CATEGORIES = new Set([
  'safeguarding', 'medication', 'hr', 'legal', 'wellbeing', 'compliance', 'vertical_sensitive',
])

function isHighRisk(a: DisplayAnswer): boolean {
  return HIGH_RISK_CATEGORIES.has(a.riskCategory) || a.contactRoutes.length > 0
}

function isFallbackGuidance(a: DisplayAnswer): boolean {
  return !a.allowedToAnswer && !(a.requiresEscalation && isHighRisk(a))
}

const EMERGENCY_ESCALATION_TERMS = ['999', 'immediate danger', 'immediate risk', 'serious injury', 'emergency', 'life risk']

function isEmergencyEscalation(a: DisplayAnswer): boolean {
  const combined = [a.answer, ...a.escalateIf, ...a.contactRoutes].join(' ').toLowerCase()
  return EMERGENCY_ESCALATION_TERMS.some(term => combined.includes(term))
}

const EMERGENCY_ITEM_TERMS = ['999', 'immediate danger', 'immediate risk', 'emergency', 'life', 'serious injury', 'collapse', 'breathing difficulty', 'severe pain', 'urgent concern']

function isEmergencyItem(item: string): boolean {
  const lower = item.toLowerCase()
  return EMERGENCY_ITEM_TERMS.some(term => lower.includes(term))
}

function getFollowUpPrompts(answer: DisplayAnswer): string[] {
  const q = answer.question.toLowerCase()
  if (
    q.includes('hygien') || q.includes('handwash') || q.includes('wash') ||
    q.includes('infect') || q.includes('cough') || q.includes('sneez') ||
    q.includes('tissue') || q.includes('vomit') || q.includes('diarrhoea') ||
    q.includes('fever') || q.includes('sympt') || q.includes('ppe') || q.includes('glove')
  ) {
    return [
      'What are the steps for correct handwashing?',
      'When should I wear gloves or PPE?',
      'What should I do if a service user has symptoms of infection?',
    ]
  }
  if (
    q.includes('confidential') || q.includes('record') || q.includes('data') ||
    q.includes('information') || q.includes('share') || q.includes('store') ||
    q.includes('access') || q.includes('gdpr')
  ) {
    return [
      'Who can access service-user records?',
      'What should I do if I accidentally share information?',
      'What details should be recorded in the visitor log?',
    ]
  }
  if (q.includes('mobile') || q.includes('phone') || q.includes('device') || q.includes('personal')) {
    return [
      'What should I do when a visitor arrives?',
      'What details should be recorded in the visitor log?',
      'Can a visitor go beyond reception without speaking to staff?',
    ]
  }
  return suggestedPrompts.slice(0, 3)
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const CONTEXT_CHIPS = ['Approved-source answers', 'No real confidential data', 'Human escalation', 'Controlled pilot support']

export default function AskPage() {
  const [input, setInput] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState<DisplayAnswer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiErrorKind, setApiErrorKind] = useState<'timeout' | 'service' | null>(null)
  const [isDemoFallback, setIsDemoFallback] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [backendWarmupStatus, setBackendWarmupStatus] = useState<'idle' | 'warming' | 'ready' | 'unavailable'>('idle')

  useEffect(() => {
    let cancelled = false
    setBackendWarmupStatus('warming')
    checkHealth(30_000)
      .then((ok) => { if (!cancelled) setBackendWarmupStatus(ok ? 'ready' : 'unavailable') })
      .catch(() => { if (!cancelled) setBackendWarmupStatus('unavailable') })
    return () => { cancelled = true }
  }, [])

  const showAnswer = currentAnswer !== null && !isLoading

  async function handlePrompt(prompt: string) {
    setInput(prompt)
    setShowChecklist(false)
    setShowQuiz(false)
    setSelectedOption(null)
    setApiError(null)
    setApiErrorKind(null)
    setCurrentAnswer(null)
    setIsDemoFallback(false)
    setIsLoading(true)

    try {
      const response = await askWorktwin(prompt)
      setCurrentAnswer(mapApiResponse(prompt, response))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      // On error: use demo fallback for known safe questions; show timeout or service wording otherwise
      const demo = getDemoFallback(prompt)
      if (demo) {
        setCurrentAnswer(demo)
        setIsDemoFallback(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (err instanceof AskTimeoutError) {
        setApiErrorKind('timeout')
        setApiError(
          'The WorkTwin knowledge service may be starting up. Please try again in a few seconds, or speak to your manager if the question is urgent.',
        )
      } else {
        setApiErrorKind('service')
        setApiError(
          'WorkTwin could not complete this request. Please try again, or speak to your manager if the question is urgent.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleBackToQuickActions() {
    setCurrentAnswer(null)
    setInput('')
    setApiError(null)
    setApiErrorKind(null)
    setIsDemoFallback(false)
    setShowChecklist(false)
    setShowQuiz(false)
    setSelectedOption(null)
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Always-visible demo-mode honesty status line */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Controlled pilot mode</span>{' '}
            - answers use approved pilot documents only. Do not enter real staff, service-user, medication, safeguarding, HR, complaint, care-plan or confidential data.
          </p>
        </div>

        {/* Idle state */}
        {!showAnswer && !isLoading && (
          <>
            {/* Hero card */}
            <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
              <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
              <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
                  <MessageSquare size={11} />
                  Policy assistant
                </span>
                <h1 className="text-3xl font-bold mb-2.5 leading-snug">Ask WorkTwin</h1>
                <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
                  Ask example policy and procedure questions in plain English. WorkTwin can only answer from approved documents where allowed, and sensitive or real-world concerns must go to the right human lead.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CONTEXT_CHIPS.map(chip => (
                    <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="text-teal-200 text-xs">
                  Questions are not shown to managers in this controlled pilot, but do not enter real confidential or personal data.
                </p>
              </div>
            </div>

            {/* Controlled pilot safety mode panel — collapsed by default */}
            <details className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm group">
              <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Shield size={16} className="text-amber-600" />
                </div>
                <span className="flex-1 font-semibold text-amber-900 text-sm">About this pilot — tap to read</span>
                <ChevronDown size={15} className="text-amber-600 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <div className="px-5 pb-5 pt-1">
                <p className="text-sm text-amber-800 leading-relaxed mb-4">
                  Ask WorkTwin can use approved, governed documents only when the right source and governance checks are in place. If no safe source is available, it should say so and point staff to a human lead. Safeguarding, medication, HR, legal, wellbeing and immediate-risk topics must be escalated to a human lead.
                </p>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">What this means</h3>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[6px]" />
                    Source-grounded answers should come from approved policy documents.
                  </li>
                  <li className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[6px]" />
                    If no approved source is available, WorkTwin should say so and guide staff to a human lead.
                  </li>
                  <li className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[6px]" />
                    High-risk or real-world concerns are not for AI decision-making and should be escalated.
                  </li>
                </ul>
                {(backendWarmupStatus === 'warming' || backendWarmupStatus === 'unavailable') && (
                  <p className="mt-3 text-xs text-amber-700">
                    {backendWarmupStatus === 'warming' && 'Getting ready…'}
                    {backendWarmupStatus === 'unavailable' && 'First answer may take a moment — if it fails, please try again'}
                  </p>
                )}
              </div>
            </details>

            {/* Worked example card */}
            <div className="bg-white border border-teal-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-teal-50 border-b border-teal-100 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-teal-600" />
                  <h2 className="font-semibold text-teal-900 text-sm">Example of an approved-source answer</h2>
                </div>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">Pilot example only - not a live retrieved answer</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Question</p>
                <p className="text-sm text-slate-700 italic mb-4">&ldquo;What should I do when a visitor arrives at reception?&rdquo;</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">For a visitor arriving at reception, staff should follow the visitor sign-in process, confirm the visitor&apos;s identity, record the visit, and escalate if anything feels unsafe or unclear.</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-4">
                  <BookOpen size={12} className="text-teal-600 shrink-0" />
                  <span className="text-xs text-slate-600"><span className="font-semibold">Source:</span> Visitor Sign-In and Identification Procedure - approved pilot document</span>
                </div>
                <p className="text-xs text-slate-400">This is a pilot example only. It does not imply that this answer was retrieved live during your session.</p>
              </div>
            </div>

            {/* Common questions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">Pilot questions</h2>
              <p className="text-sm text-slate-500 mb-4">Use the Visitor SOP questions for the main pilot walkthrough. Escalation examples are for safe routing only, not real case advice.</p>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider pb-0.5">Visitor SOP - start here</p>
                <button
                  onClick={() => handlePrompt('What should I do when a visitor arrives?')}
                  className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-left hover:bg-teal-50 hover:border-teal-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                    <UserCheck size={15} className="text-teal-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 group-hover:text-teal-900">What should I do when a visitor arrives?</span>
                </button>
                <button
                  onClick={() => handlePrompt('What details should be recorded in the visitor log?')}
                  className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-left hover:bg-teal-50 hover:border-teal-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                    <ClipboardList size={15} className="text-teal-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 group-hover:text-teal-900">What details should be recorded in the visitor log?</span>
                </button>
                <button
                  onClick={() => handlePrompt('Can a visitor go beyond reception without speaking to staff?')}
                  className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-left hover:bg-teal-50 hover:border-teal-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                    <Building2 size={15} className="text-teal-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 group-hover:text-teal-900">Can a visitor go beyond reception without speaking to staff?</span>
                </button>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider pt-2 pb-0.5">Escalation examples</p>
                <button
                  onClick={() => handlePrompt(SAFEGUARDING_Q)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Shield size={15} className="text-amber-700" />
                  </div>
                  <span className="text-sm font-medium text-amber-900">Example safeguarding concern: who should I contact?</span>
                </button>
                <button
                  onClick={() => handlePrompt(MEDICATION_Q)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Pill size={15} className="text-amber-700" />
                  </div>
                  <span className="text-sm font-medium text-amber-900">Example medication concern: who should I escalate to?</span>
                </button>
              </div>
            </div>

            {/* Ask your own question */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">Ask an example policy question</h2>
              <p className="text-sm text-slate-500 mb-4">Type an example policy or procedure question. Do not enter real names, incidents, service-user details, medication details, safeguarding disclosures, HR issues, complaints or confidential data.</p>
              <button
                onClick={() => inputRef.current?.focus()}
                className="w-full flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-4 py-3.5 text-left hover:border-teal-400 hover:bg-teal-50 transition-all group"
              >
                <MessageSquare size={16} className="text-slate-400 group-hover:text-teal-600 shrink-0" />
                <span className="text-sm text-slate-400 group-hover:text-teal-700">Type an example policy question below...</span>
              </button>
            </div>

            {/* Escalation contacts */}
            <div>
              <h2 className="font-semibold text-slate-900 mb-3">Escalation contacts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/escalation"
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                    <Briefcase size={16} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">HR / grievance</p>
                    <p className="text-xs text-slate-400 mt-0.5">People concerns</p>
                  </div>
                </Link>
                <Link
                  href="/escalation"
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
                    <BadgeCheck size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">CQC / compliance</p>
                    <p className="text-xs text-slate-400 mt-0.5">Regulatory concerns</p>
                  </div>
                </Link>
                <Link
                  href="/escalation"
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                    <Heart size={16} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Wellbeing</p>
                    <p className="text-xs text-slate-400 mt-0.5">Staff support</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Privacy card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} className="text-teal-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-sm mb-1">Privacy-first design</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Questions are not shown to managers in this controlled pilot, but this is not a care record, HR record, safeguarding record, medication record or confidential reporting route.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-gradient-to-br from-teal-700 to-teal-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm shadow-sm">
                {input}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                  <Loader2 size={18} className="text-teal-600 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Looking that up for you…</p>
                  <p className="text-xs text-slate-400 mt-0.5">Checking approved policy documents…</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded-full animate-pulse w-1/2" />
                <div className="h-3 bg-slate-100 rounded-full animate-pulse w-5/6" />
              </div>
            </div>
          </div>
        )}

        {/* Error state - backend unreachable and no demo fallback available */}
        {apiError && !isLoading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-gradient-to-br from-teal-700 to-teal-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm shadow-sm">
                {input}
              </div>
            </div>
            <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {apiErrorKind === 'timeout' ? 'WorkTwin is waking up' : 'WorkTwin is temporarily unavailable'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {apiErrorKind === 'timeout' ? 'This can happen on the public demo' : 'Knowledge service issue'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {apiError}
              </p>
            </div>
          </div>
        )}

        {/* Answer area */}
        {showAnswer && currentAnswer && (
          <div className="space-y-4 pb-28">
            {/* Back to quick actions */}
            <button
              onClick={handleBackToQuickActions}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft size={15} />
              Back to quick actions
            </button>

            {/* Question bubble */}
            <div className="flex justify-end">
              <div className="bg-gradient-to-br from-teal-700 to-teal-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm shadow-sm">
                {currentAnswer.question}
              </div>
            </div>

            {/* Demo fallback notice - backend was unreachable */}
            {isDemoFallback && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                Backend unavailable - showing a controlled pilot example response. Live answers require approved documents and active safety gates.
              </div>
            )}

            {/* Live answer notice — only for source-grounded answers, not escalation or fallback */}
            {!currentAnswer.isDemo && !isDemoFallback && currentAnswer.allowedToAnswer && currentAnswer.sources.length > 0 && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-xs text-teal-800">
                <Zap size={13} className="shrink-0 text-teal-600" />
                Answered from your approved policy documents — sources shown below.
              </div>
            )}

            {/* Fallback guidance - no approved source, but not a high-risk escalation */}
            {isFallbackGuidance(currentAnswer) && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Shield size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">No approved source for this question</p>
                      <p className="text-xs text-slate-500 mt-0.5">WorkTwin cannot answer this from approved policy documents</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your question</p>
                  <p className="text-sm text-slate-600 italic mb-4">&ldquo;{currentAnswer.question}&rdquo;</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentAnswer.answer ||
                      'WorkTwin has no approved source for an answer on this topic. Please speak to your manager or follow the approved local route.'}
                  </p>
                </div>
                {currentAnswer.escalateIf.length > 0 && (
                  <div className="px-5 py-4 bg-amber-50 border-t border-amber-100">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Escalate if</p>
                    </div>
                    <ul className="space-y-1.5">
                      {currentAnswer.escalateIf.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[6px]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="px-5 py-4 border-t border-slate-100">
                  <Link href="/escalation" className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-semibold hover:text-teal-800 underline">
                    View escalation contacts
                  </Link>
                </div>
              </div>
            )}

            {/* Escalation required - high-risk topics only */}
            {currentAnswer.requiresEscalation && isHighRisk(currentAnswer) && (
              <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-amber-50 px-5 py-4 border-b border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">WorkTwin response</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {isEmergencyEscalation(currentAnswer) ? 'Escalation required' : 'Speak to the right human lead'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 border-b border-amber-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your question</p>
                  <p className="text-sm text-slate-700 italic mb-4">&ldquo;{currentAnswer.question}&rdquo;</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentAnswer.answer ||
                      'WorkTwin does not provide a direct answer on this topic. Please escalate to the appropriate person immediately.'}
                  </p>
                </div>
                {currentAnswer.escalateIf.length > 0 && (
                  <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Escalate immediately if</p>
                    </div>
                    <ul className="space-y-1.5">
                      {currentAnswer.escalateIf.map((item, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm ${isEmergencyItem(item) ? 'text-red-800 font-semibold' : 'text-amber-800'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[6px] ${isEmergencyItem(item) ? 'bg-red-500' : 'bg-amber-500'}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentAnswer.contactRoutes.length > 0 && (
                  <div className="px-5 py-4 border-b border-amber-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Who to contact</p>
                    <ul className="space-y-1.5">
                      {currentAnswer.contactRoutes.map((route, i) => {
                        const isEmergency = route.includes('999')
                        return isEmergency ? (
                          <li key={i} className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                            <span className="text-rose-600 shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 21 15.5l.92 1.42z"/></svg>
                            </span>
                            <span className="text-sm font-semibold text-rose-800">{route}</span>
                          </li>
                        ) : (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[6px]" />
                            {route}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                <div className="px-5 py-4">
                  <Link href="/escalation" className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-semibold hover:text-teal-800 underline">
                    View escalation contacts
                  </Link>
                </div>
              </div>
            )}

            {/* Main answer card - only shown when permitted and no escalation required */}
            {currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Answer header */}
                <div className="bg-teal-50 border-b border-teal-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">W</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-teal-900">Here&apos;s what the approved policy says</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1 bg-teal-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <BadgeCheck size={11} />
                      Approved-source
                    </span>
                  </div>
                </div>

                {/* Answer body */}
                <div className="p-5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your question</p>
                  <p className="text-sm text-slate-600 italic mb-4">&ldquo;{currentAnswer.question}&rdquo;</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{currentAnswer.answer}</p>
                  {currentAnswer.disclaimer && (
                    <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <span className="font-semibold">Note: </span>{currentAnswer.disclaimer}
                    </p>
                  )}
                </div>

                {/* Next steps */}
                {currentAnswer.nextSteps.length > 0 && (
                  <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Steps to take
                    </h3>
                    <ol className="space-y-2">
                      {currentAnswer.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Sources used */}
                {currentAnswer.sources.length > 0 && (
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen size={15} className="text-teal-600 shrink-0" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Sources used
                      </p>
                    </div>
                    <div className="space-y-2">
                      {currentAnswer.sources.map((src, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpen size={13} className="text-teal-700" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-teal-700 mb-0.5">{src.source_label}</p>
                            <p className="text-sm font-semibold text-slate-800">{src.title}</p>
                            {src.section && <p className="text-xs text-slate-500 mt-0.5">{src.section}</p>}
                            {src.page != null && <p className="text-xs text-slate-400 mt-0.5">Page {src.page}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalate if */}
                {currentAnswer.escalateIf.length > 0 && (
                  <div className="px-5 py-4 border-b border-slate-100 bg-amber-50">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Speak to a manager if…</p>
                    </div>
                    <ul className="space-y-1.5">
                      {currentAnswer.escalateIf.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[6px]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/escalation"
                      className="mt-3 inline-block text-xs text-amber-700 font-semibold underline"
                    >
                      View escalation contacts
                    </Link>
                  </div>
                )}

                {/* Learning option */}
                {currentAnswer.learningOption && (
                  <div className="px-5 py-4 border-b border-slate-100 bg-teal-50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap size={14} className="text-teal-600" />
                      <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Want to learn more?</p>
                    </div>
                    <p className="text-sm text-teal-800">{currentAnswer.learningOption}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  <Link
                    href="/scenarios"
                    className="flex items-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <PlayCircle size={15} />
                    Practise this scenario
                  </Link>
                  {currentAnswer.riskCategory === 'medication' && (
                    <>
                      <button
                        onClick={() => { setShowChecklist(!showChecklist); setShowQuiz(false) }}
                        className="flex items-center gap-1.5 text-sm border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <List size={15} />
                        Turn into checklist
                      </button>
                      <button
                        onClick={() => { setShowQuiz(!showQuiz); setShowChecklist(false) }}
                        className="flex items-center gap-1.5 text-sm border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <CheckSquare size={15} />
                        Quiz me
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Checklist panel - medication only */}
            {showChecklist && currentAnswer.riskCategory === 'medication' && currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-teal-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-teal-50 border-b border-teal-100 px-5 py-4">
                  <h3 className="font-semibold text-teal-900 flex items-center gap-2 text-sm">
                    <List size={16} className="text-teal-600" />
                    Medication escalation awareness checklist
                  </h3>
                </div>
                <div className="p-5 space-y-2.5">
                  {checklistItems.map((item, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-600 cursor-pointer shrink-0" />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">{item}</span>
                    </label>
                  ))}
                </div>
                <div className="px-5 pb-4">
                  <button
                    onClick={() => setShowChecklist(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <ChevronDown size={12} /> Hide checklist
                  </button>
                </div>
              </div>
            )}

            {/* Quiz panel - medication only */}
            {showQuiz && currentAnswer.riskCategory === 'medication' && currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-violet-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-violet-50 border-b border-violet-100 px-5 py-4">
                  <h3 className="font-semibold text-violet-900 flex items-center gap-2 text-sm">
                    <CheckSquare size={16} className="text-violet-600" />
                    Quick quiz
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-700 font-medium mb-4">{quizQuestion.question}</p>
                  <div className="space-y-2">
                    {quizQuestion.options.map((opt, i) => {
                      const isSelected = selectedOption === i
                      const isCorrect = i === quizQuestion.correct
                      const revealed = selectedOption !== null
                      return (
                        <button
                          key={i}
                          onClick={() => !revealed && setSelectedOption(i)}
                          disabled={revealed}
                          className={`w-full text-left text-sm px-4 py-3 rounded-xl border-2 transition-all ${
                            !revealed
                              ? 'border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-700'
                              : isCorrect
                              ? 'border-teal-300 bg-teal-50 text-teal-800 font-semibold'
                              : isSelected
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-slate-100 text-slate-400'
                          }`}
                        >
                          <span className="font-bold mr-2 text-slate-400">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {opt}
                          {revealed && isCorrect && ' ✓'}
                          {revealed && isSelected && !isCorrect && ' ✗'}
                        </button>
                      )
                    })}
                  </div>
                  {selectedOption !== null && (
                    <p className={`mt-4 text-sm font-semibold px-4 py-3 rounded-xl ${
                      selectedOption === quizQuestion.correct
                        ? 'text-teal-700 bg-teal-50 border border-teal-200'
                        : 'text-red-600 bg-red-50 border border-red-200'
                    }`}>
                      {selectedOption === quizQuestion.correct
                        ? 'Correct - this pilot should support escalation awareness only. Real medication decisions must follow approved local policy and trained human lead guidance.'
                        : 'Not quite. The safest answer is B - escalate through the approved medication route and speak to the right trained lead.'}
                    </p>
                  )}
                  <button
                    onClick={() => setShowQuiz(false)}
                    className="mt-4 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <ChevronDown size={12} /> Hide quiz
                  </button>
                </div>
              </div>
            )}

            {/* Privacy reminder - hidden for high-risk escalation (which already carries strong messaging) */}
            {!(currentAnswer.requiresEscalation && isHighRisk(currentAnswer)) && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <Shield size={15} className="text-teal-600 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Answers come from approved policy documents only. For real concerns, speak to the right human lead.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="sticky bottom-0 bg-slate-50 pt-2">
          {showAnswer && currentAnswer && !(currentAnswer.requiresEscalation && isHighRisk(currentAnswer)) && (
            <div className="mb-2 flex flex-wrap gap-2">
              {getFollowUpPrompts(currentAnswer).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePrompt(p)}
                  className="text-xs border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-600 rounded-full px-3 py-1.5 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 transition-shadow">
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim().length >= 3) handlePrompt(input.trim())
              }}
              placeholder="Ask a question about your policies or procedures..."
              className="flex-1 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
            <button
              onClick={() => { if (input.trim().length >= 3) handlePrompt(input.trim()) }}
              disabled={isLoading || input.trim().length < 3}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            {input.trim().length > 0 && input.trim().length < 3 ? (
              <p className="text-xs text-amber-600">Please enter at least 3 characters.</p>
            ) : (
              <p className="text-xs text-slate-400">Answers come from approved policy documents only.</p>
            )}
            <p className={`text-xs tabular-nums shrink-0 ml-3 ${
              input.length >= 500 ? 'text-red-500' :
              input.length >= 450 ? 'text-amber-500' :
              'text-slate-400'
            }`}>{input.length} / 500</p>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
