'use client'
import { useState, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  Send, BookOpen, PlayCircle, Lock, List, Zap,
  AlertTriangle, CheckSquare, ChevronDown, Shield, Loader2,
  MessageSquare, ArrowLeft,
  UserCheck, ClipboardList, Building2, Briefcase, BadgeCheck, Heart, Pill,
} from 'lucide-react'
import Link from 'next/link'
import { askWorktwin } from '@/lib/api'
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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AskPage() {
  const [input, setInput] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState<DisplayAnswer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isDemoFallback, setIsDemoFallback] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showAnswer = currentAnswer !== null && !isLoading

  async function handlePrompt(prompt: string) {
    setInput(prompt)
    setShowChecklist(false)
    setShowQuiz(false)
    setNoteSaved(false)
    setSelectedOption(null)
    setApiError(null)
    setCurrentAnswer(null)
    setIsDemoFallback(false)
    setIsLoading(true)

    try {
      const response = await askWorktwin(prompt)
      setCurrentAnswer(mapApiResponse(prompt, response))
    } catch {
      // Backend unreachable — use demo answers for known questions, error otherwise
      const demo = getDemoFallback(prompt)
      if (demo) {
        setCurrentAnswer(demo)
        setIsDemoFallback(true)
      } else {
        setApiError(
          'WorkTwin could not connect to the knowledge base. Please try again or speak to your manager.',
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
    setIsDemoFallback(false)
    setShowChecklist(false)
    setShowQuiz(false)
    setNoteSaved(false)
    setSelectedOption(null)
  }

  function handleSaveNote() {
    setNoteSaved(true)
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Idle state — friendly assistant hero + cards */}
        {!showAnswer && !isLoading && (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-teal-700 px-5 py-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-tight">Hi, I'm WorkTwin</p>
                  <p className="text-sm text-teal-100 mt-0.5">Your Thumhara Centre policy assistant</p>
                </div>
              </div>
              <p className="text-sm text-teal-100 mb-1">I can help you understand approved Thumhara Centre policies.</p>
              <p className="text-sm font-semibold text-white">What do you need help with today?</p>
            </div>

            {/* Quick action cards */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Quick actions</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handlePrompt('What should I do when a visitor arrives?')}
                  className="flex flex-col items-start gap-2.5 bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <UserCheck size={18} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Visitor arrived</p>
                    <p className="text-xs text-slate-500 mt-0.5">What do I do?</p>
                  </div>
                </button>
                <button
                  onClick={() => handlePrompt('What details should be recorded in the visitor log?')}
                  className="flex flex-col items-start gap-2.5 bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <ClipboardList size={18} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Visitor log</p>
                    <p className="text-xs text-slate-500 mt-0.5">What to record?</p>
                  </div>
                </button>
                <button
                  onClick={() => handlePrompt('Can a visitor go beyond reception without speaking to staff?')}
                  className="flex flex-col items-start gap-2.5 bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <Building2 size={18} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Reception access</p>
                    <p className="text-xs text-slate-500 mt-0.5">Visitor beyond reception?</p>
                  </div>
                </button>
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="flex flex-col items-start gap-2.5 bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <MessageSquare size={18} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Ask a question</p>
                    <p className="text-xs text-slate-500 mt-0.5">Type below</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Need to speak to someone? */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Need to speak to someone?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handlePrompt(SAFEGUARDING_Q)}
                  className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-left hover:bg-amber-100 hover:border-amber-300 transition-colors"
                >
                  <Shield size={15} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900">Safeguarding</p>
                </button>
                <button
                  onClick={() => handlePrompt(MEDICATION_Q)}
                  className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-left hover:bg-amber-100 hover:border-amber-300 transition-colors"
                >
                  <Pill size={15} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900">Medication</p>
                </button>
                <Link
                  href="/escalation"
                  className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 hover:bg-red-100 hover:border-red-300 transition-colors"
                >
                  <Briefcase size={15} className="text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-900">HR / grievance</p>
                </Link>
                <Link
                  href="/escalation"
                  className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 hover:bg-red-100 hover:border-red-300 transition-colors"
                >
                  <BadgeCheck size={15} className="text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-900">CQC / compliance</p>
                </Link>
                <Link
                  href="/escalation"
                  className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 hover:bg-red-100 hover:border-red-300 transition-colors"
                >
                  <Heart size={15} className="text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-900">Wellbeing</p>
                </Link>
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-xs text-slate-400 text-center px-4">
              WorkTwin only answers from approved staff-visible documents. Sensitive concerns are sent to the right human lead.
            </p>
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-teal-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm">
                {input}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-3">
              <Loader2 size={18} className="text-teal-600 animate-spin shrink-0" />
              <span className="text-sm text-slate-600">WorkTwin is checking the knowledge base…</span>
            </div>
          </div>
        )}

        {/* Error state — backend unreachable and no demo fallback available */}
        {apiError && !isLoading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-teal-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm">
                {input}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <p className="text-sm font-semibold text-red-700">Could not reach WorkTwin</p>
              </div>
              <p className="text-sm text-red-600">{apiError}</p>
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
              <div className="bg-teal-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm">
                {currentAnswer.question}
              </div>
            </div>

            {/* Demo fallback notice — backend was unreachable */}
            {isDemoFallback && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                Backend unavailable — showing demo answer. WorkTwin will serve live answers once connected.
              </div>
            )}

            {/* Live answer notice */}
            {!currentAnswer.isDemo && !isDemoFallback && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-xs text-teal-800">
                <Zap size={13} className="shrink-0 text-teal-600" />
                WorkTwin answers from documents your organisation has approved for staff use, and shows the source.
              </div>
            )}

            {/* Not allowed to answer — only shown when no escalation card is also displayed */}
            {!currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-amber-600" />
                  <p className="text-sm font-semibold text-slate-800">WorkTwin cannot answer this directly</p>
                </div>
                <p className="text-sm text-slate-600">
                  {currentAnswer.answer ||
                    'This question falls outside WorkTwin’s permitted answer scope, or no approved document covers this topic. Please speak to your manager or refer to the relevant policy.'}
                </p>
                <Link href="/escalation" className="mt-3 inline-block text-sm text-teal-700 underline font-medium">
                  View escalation contacts →
                </Link>
              </div>
            )}

            {/* Escalation required — use backend answer for category-specific wording */}
            {currentAnswer.requiresEscalation && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <p className="text-sm font-semibold text-amber-800">This topic requires human escalation</p>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {currentAnswer.answer ||
                    'WorkTwin does not provide a direct answer on this topic. Please escalate to the appropriate person immediately.'}
                </p>
                <ul className="space-y-1.5 mb-3">
                  {currentAnswer.escalateIf.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-500 shrink-0 mt-0.5">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {currentAnswer.contactRoutes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Who to contact</p>
                    <ul className="space-y-1">
                      {currentAnswer.contactRoutes.map((route, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                          <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                          {route}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link href="/escalation" className="inline-block text-sm text-amber-700 underline font-medium">
                  View escalation contacts →
                </Link>
              </div>
            )}

            {/* Main answer card — only shown when permitted and no escalation required */}
            {currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Answer */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">W</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">WorkTwin</p>
                    <span className="text-xs text-slate-400">· Answer from approved documents</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{currentAnswer.answer}</p>
                  {currentAnswer.disclaimer && (
                    <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="font-semibold">Note: </span>{currentAnswer.disclaimer}
                    </p>
                  )}
                </div>

                {/* What to do next */}
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
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

                {/* Sources */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-teal-600 shrink-0" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {currentAnswer.sources.length === 1 ? 'Source' : 'Sources'}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {currentAnswer.sources.map((src, i) => (
                      <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold text-teal-700 mb-0.5">{src.source_label}</p>
                        <p className="text-sm font-semibold text-slate-800">{src.title}</p>
                        {src.section && <p className="text-xs text-slate-500">{src.section}</p>}
                        {src.page != null && <p className="text-xs text-slate-400">Page {src.page}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalate if */}
                <div className="px-5 py-4 border-b border-slate-100 bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Escalate if</p>
                  </div>
                  <ul className="space-y-1.5">
                    {currentAnswer.escalateIf.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                        <span className="text-amber-500 shrink-0 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/escalation"
                    className="mt-2 inline-block text-xs text-amber-700 underline font-medium"
                  >
                    View escalation contacts →
                  </Link>
                </div>

                {/* Learning option */}
                {currentAnswer.learningOption && (
                  <div className="px-5 py-4 border-b border-slate-100 bg-teal-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={15} className="text-teal-600" />
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Learning option</p>
                    </div>
                    <p className="text-sm text-teal-800">{currentAnswer.learningOption}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  <Link
                    href="/scenarios"
                    className="flex items-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <PlayCircle size={15} />
                    Practise this scenario
                  </Link>
                  <button
                    onClick={handleSaveNote}
                    className={`flex items-center gap-1.5 text-sm border font-medium px-4 py-2 rounded-lg transition-colors ${
                      noteSaved
                        ? 'border-teal-200 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Lock size={15} />
                    {noteSaved ? 'Saved to private notes ✓' : 'Save to private notes'}
                  </button>
                  {currentAnswer.riskCategory === 'medication' && (
                    <>
                      <button
                        onClick={() => { setShowChecklist(!showChecklist); setShowQuiz(false) }}
                        className="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        <List size={15} />
                        Turn into checklist
                      </button>
                      <button
                        onClick={() => { setShowQuiz(!showQuiz); setShowChecklist(false) }}
                        className="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors"
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
              <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <List size={16} className="text-teal-600" />
                  Medication refusal checklist
                </h3>
                <div className="space-y-2">
                  {checklistItems.map((item, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-600 cursor-pointer" />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">{item}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setShowChecklist(false)}
                  className="mt-4 text-xs text-slate-400 hover:text-slate-600"
                >
                  <ChevronDown size={12} className="inline" /> Hide checklist
                </button>
              </div>
            )}

            {/* Quiz panel — medication only */}
            {showQuiz && currentAnswer.riskCategory === 'medication' && currentAnswer.allowedToAnswer && !currentAnswer.requiresEscalation && (
              <div className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  <CheckSquare size={16} className="text-violet-600" />
                  Quick quiz
                </h3>
                <p className="text-sm text-slate-600 mb-4">{quizQuestion.question}</p>
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
                        className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                          !revealed
                            ? 'border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-700'
                            : isCorrect
                            ? 'border-teal-300 bg-teal-50 text-teal-800 font-medium'
                            : isSelected
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-slate-100 text-slate-400'
                        }`}
                      >
                        <span className="font-semibold mr-2 text-slate-400">
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
                  <p className={`mt-3 text-sm font-medium ${selectedOption === quizQuestion.correct ? 'text-teal-700' : 'text-red-600'}`}>
                    {selectedOption === quizQuestion.correct
                      ? 'Correct — well done! The MAR chart must be completed immediately.'
                      : 'Not quite. The correct answer is B — record on the MAR chart and notify your manager first.'}
                  </p>
                )}
                <button
                  onClick={() => setShowQuiz(false)}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  <ChevronDown size={12} className="inline" /> Hide quiz
                </button>
              </div>
            )}
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
              placeholder="Ask a question about your policies or procedures…"
              className="flex-1 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
            <button
              onClick={() => { if (input.trim().length >= 3) handlePrompt(input.trim()) }}
              disabled={isLoading}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white rounded-xl transition-colors"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {input.trim().length > 0 && input.trim().length < 3 && (
            <p className="text-xs text-amber-600 text-center mt-1">
              Please enter at least 3 characters.
            </p>
          )}
          {input.length >= 500 && (
            <p className="text-xs text-amber-600 text-center mt-1">
              Questions must be 500 characters or fewer.
            </p>
          )}
          {!(input.trim().length > 0 && input.trim().length < 3) && input.length < 500 && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Your questions are private. WorkTwin answers from approved documents only.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
