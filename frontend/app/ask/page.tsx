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

const MEDICATION_Q = 'A service user missed medication. What should I do?'
const SAFEGUARDING_Q = 'I have a safeguarding concern. What should I do?'

const suggestedPrompts = [
  'What should I do when a visitor arrives?',
  'What details should be recorded in the visitor log?',
  'Can a visitor go beyond reception without speaking to staff?',
  SAFEGUARDING_Q,
  MEDICATION_Q,
]

// ---------------------------------------------------------------------------
// Display types — internal to this page, used by both live API and demo fallback
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

// Demo fallback answers — shown when the backend is unreachable.

const medicationAnswer: DisplayAnswer = {
  question: MEDICATION_Q,
  answer:
    'This is a medication incident. WorkTwin cannot advise on this directly. Please speak to the medication lead, registered manager or senior person on duty immediately.',
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
    'NHS 111 — for urgent non-emergency medical guidance',
    '999 — if the service user is in immediate danger',
  ],
}

const safeguardingAnswer: DisplayAnswer = {
  question: SAFEGUARDING_Q,
  answer:
    'This is a safeguarding concern. WorkTwin cannot advise on this directly. Please report immediately to the Designated Safeguarding Lead or your line manager. Do not investigate yourself.',
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
    '999 — if there is immediate risk to life or physical safety',
  ],
}

const checklistItems = [
  'Record missed dose on the MAR chart immediately',
  'Notify your line manager or senior carer on duty',
  'Contact the GP or pharmacist if there is clinical risk',
  'Complete a medication incident form',
  'Do not administer a double dose without clinical direction',
  'Keep all medication secured',
]

const quizQuestion = {
  question: 'What is the FIRST thing you must do when a service user misses their medication?',
  options: [
    'Administer the missed dose as soon as you notice',
    'Record the missed dose on the MAR chart and notify your manager',
    'Contact the GP immediately before doing anything else',
    'Leave it and continue with the next scheduled dose',
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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const CONTEXT_CHIPS = ['Policy-grounded answers', 'Private in this demo', 'Human escalation', 'Care staff support']

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
    checkHealth()
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
                  Ask approved staff guidance questions in plain English. WorkTwin will answer from approved documents where it can, and route sensitive concerns to the right human lead.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CONTEXT_CHIPS.map(chip => (
                    <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="text-teal-200 text-xs">
                  Private Ask questions are not shown to managers in this demo.
                </p>
              </div>
            </div>

            {/* Demo safety mode panel */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={16} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-amber-900 mb-1">Demo safety mode</h2>
                  <p className="text-sm text-amber-800 leading-relaxed mb-4">
                    Ask WorkTwin can use approved, governed documents only when the backend, database and document gates are ready. If no safe source is available, it gives fallback guidance. Safeguarding, medication, HR, legal and wellbeing topics must be escalated to a human lead.
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
                      High-risk topics are not answered by AI and should be escalated.
                    </li>
                  </ul>
                  {backendWarmupStatus !== 'idle' && (
                    <p className="mt-3 text-xs text-amber-700">
                      {backendWarmupStatus === 'warming' && 'Knowledge service warming up'}
                      {backendWarmupStatus === 'ready' && 'Knowledge service ready'}
                      {backendWarmupStatus === 'unavailable' && 'Knowledge service may wake on first question'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Worked example card */}
            <div className="bg-white border border-teal-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-teal-50 border-b border-teal-100 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-teal-600" />
                  <h2 className="font-semibold text-teal-900 text-sm">Example of a good source-grounded answer</h2>
                </div>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">Example only - not a live retrieved answer</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Question</p>
                <p className="text-sm text-slate-700 italic mb-4">&ldquo;What should I do if a visitor arrives without signing in?&rdquo;</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">Ask the visitor to follow the sign-in process and wear the required identification, then speak to the person in charge if you are unsure.</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-4">
                  <BookOpen size={12} className="text-teal-600 shrink-0" />
                  <span className="text-xs text-slate-600"><span className="font-semibold">Example source:</span> Visitor Sign-In and Identification Procedure</span>
                </div>
                <p className="text-xs text-slate-400">This is an example of the expected answer format. It is not proof that this answer was retrieved during your session.</p>
              </div>
            </div>

            {/* Common questions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">Common questions</h2>
              <p className="text-sm text-slate-500 mb-4">Start with a safe example or type your own question below.</p>
              <div className="space-y-2">
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
                <button
                  onClick={() => handlePrompt(SAFEGUARDING_Q)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Shield size={15} className="text-amber-700" />
                  </div>
                  <span className="text-sm font-medium text-amber-900">I have a safeguarding concern. What should I do?</span>
                </button>
                <button
                  onClick={() => handlePrompt(MEDICATION_Q)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Pill size={15} className="text-amber-700" />
                  </div>
                  <span className="text-sm font-medium text-amber-900">A service user missed medication. What should I do?</span>
                </button>
              </div>
            </div>

            {/* Ask your own question */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">Ask your own question</h2>
              <p className="text-sm text-slate-500 mb-4">Type a policy or procedure question. Sensitive concerns will be routed to human support.</p>
              <button
                onClick={() => inputRef.current?.focus()}
                className="w-full flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-4 py-3.5 text-left hover:border-teal-400 hover:bg-teal-50 transition-all group"
              >
                <MessageSquare size={16} className="text-slate-400 group-hover:text-teal-600 shrink-0" />
                <span className="text-sm text-slate-400 group-hover:text-teal-700">Type in the box below to ask your own question...</span>
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
                  Private from managers in this demo. WorkTwin does not show raw questions on admin pages.
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
                  <p className="text-sm font-semibold text-slate-700">WorkTwin is checking approved policies</p>
                  <p className="text-xs text-slate-400 mt-0.5">Searching approved documents and procedures...</p>
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

        {/* Error state — backend unreachable and no demo fallback available */}
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
          <div className="space-y-4 pb-40">
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

            {/* Demo fallback notice — backend was unreachable */}
            {isDemoFallback && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                Backend unavailable - showing demo answer. WorkTwin will serve live answers once connected.
              </div>
            )}

            {/* Live answer notice */}
            {!currentAnswer.isDemo && !isDemoFallback && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-xs text-teal-800">
                <Zap size={13} className="shrink-0 text-teal-600" />
                WorkTwin answers from documents your organisation has approved for staff use, and shows the source.
              </div>
            )}

            {/* Fallback guidance — no approved source, but not a high-risk escalation */}
            {isFallbackGuidance(currentAnswer) && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Shield size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">WorkTwin fallback guidance</p>
                      <p className="text-xs text-slate-500 mt-0.5">No approved source available</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">You asked</p>
                  <p className="text-sm text-slate-600 italic mb-4">&ldquo;{currentAnswer.question}&rdquo;</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentAnswer.answer ||
                      'WorkTwin has no approved source for this topic. Please speak to your manager or refer to the relevant policy.'}
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

            {/* Escalation required — high-risk topics only */}
            {currentAnswer.requiresEscalation && isHighRisk(currentAnswer) && (
              <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-amber-50 px-5 py-4 border-b border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">WorkTwin response</p>
                      <p className="text-xs text-amber-700 mt-0.5">Escalation required</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 border-b border-amber-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">You asked</p>
                  <p className="text-sm text-slate-700 italic mb-4">&ldquo;{currentAnswer.question}&rdquo;</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentAnswer.answer ||
                      'WorkTwin does not provide a direct answer on this topic. Please escalate to the appropriate person immediately.'}
                  </p>
                </div>
                {currentAnswer.escalateIf.length > 0 && (
                  <div className="px-5 py-4 bg-red-50 border-b border-red-100">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertTriangle size={14} className="text-red-600" />
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Escalate immediately if</p>
                    </div>
                    <ul className="space-y-1.5">
                      {currentAnswer.escalateIf.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-[6px]" />
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
                      {currentAnswer.contactRoutes.map((route, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[6px]" />
                          {route}
                        </li>
                      ))}
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

            {/* Main answer card — only shown when permitted and no escalation required */}
            {currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Answer header */}
                <div className="bg-teal-50 border-b border-teal-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">W</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-teal-900">WorkTwin response</p>
                      <p className="text-xs text-teal-700 mt-0.5">Source-grounded answer</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1 bg-teal-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <BadgeCheck size={11} />
                      Policy-grounded
                    </span>
                  </div>
                </div>

                {/* Answer body */}
                <div className="p-5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">You asked</p>
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
                      What you should do next
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
                      <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Learning option</p>
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

            {/* Checklist panel — medication only */}
            {showChecklist && currentAnswer.riskCategory === 'medication' && currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-teal-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-teal-50 border-b border-teal-100 px-5 py-4">
                  <h3 className="font-semibold text-teal-900 flex items-center gap-2 text-sm">
                    <List size={16} className="text-teal-600" />
                    Medication incident checklist
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

            {/* Quiz panel — medication only */}
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
                        ? 'Correct - well done! The MAR chart must be completed immediately.'
                        : 'Not quite. The correct answer is B - record on the MAR chart and notify your manager first.'}
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

            {/* Privacy reminder */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={15} className="text-teal-600 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Private from managers in this demo. WorkTwin does not show raw questions on admin pages.
              </p>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="sticky bottom-0 bg-slate-50 pt-2">
          {showAnswer && (
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestedPrompts.slice(0, 4).map((p) => (
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
              <p className="text-xs text-slate-400">Private from managers in this demo. WorkTwin does not show raw questions on admin pages.</p>
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
