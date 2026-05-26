'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchPolicies } from '@/lib/api'
import type { StaffPolicyRecord } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  BookOpen, Search, CheckCircle, Globe, MessageCircle,
  X, Calendar, AlertTriangle, FileText, ChevronRight,
  Archive, ShieldCheck, Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample fallback data - approved policies only (shown when backend unavailable)
// ---------------------------------------------------------------------------
const SAMPLE_DOCS: StaffPolicyRecord[] = [
  {
    id: 'doc-vis-001', title: 'Visitor Sign-In and Identification Procedure',
    description: 'Step-by-step procedure for receiving visitors: signing in at reception, issuing visitor identification, escorting beyond reception, recording in the visitor log, and escalating access refusals or welfare concerns to the person in charge.',
    file_type: 'pdf', file_size_bytes: 192512,
    category: 'Health and Safety', tags: ['visitors', 'sign-in', 'reception', 'identification', 'access'],
    status: 'approved', primary_language: 'en',
    available_languages: ['en'], translation_status: 'not_required',
    version: '1.0', review_due_date: '2027-01-01',
  },
]

const HIGH_RISK_CATEGORIES = new Set([
  'Safeguarding', 'Medication', 'HR', 'Legal', 'Compliance', 'Wellbeing', 'Complaints',
])

const CATEGORY_COLOURS: Record<string, string> = {
  HR: 'bg-violet-50 text-violet-700',
  Medication: 'bg-orange-50 text-orange-700',
  Safeguarding: 'bg-red-50 text-red-700',
  Complaints: 'bg-blue-50 text-blue-700',
  'Health and Safety': 'bg-teal-50 text-teal-700',
  Training: 'bg-indigo-50 text-indigo-700',
  Onboarding: 'bg-emerald-50 text-emerald-700',
}

const CONTEXT_CHIPS = ['Approved documents', 'Staff-visible guidance', 'Source-grounded answers', 'Care provider pilot']

function formatDate(iso?: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Per-language approval status (sample - real per-language approval in 4B+)
// Primary language is always Approved (document is approved).
// Other languages derive status from translation_status and position in list.
// ---------------------------------------------------------------------------
function getLanguageStatus(doc: StaffPolicyRecord, lang: string): { label: string; colour: string } {
  if (lang === doc.primary_language) {
    return { label: 'Approved', colour: 'bg-teal-100 text-teal-800' }
  }
  if (doc.translation_status === 'complete') {
    return { label: 'Approved', colour: 'bg-teal-100 text-teal-800' }
  }
  if (doc.translation_status === 'in_progress') {
    const idx = doc.available_languages.indexOf(lang)
    if (idx <= 1) return { label: 'Approved', colour: 'bg-teal-100 text-teal-800' }
    if (idx === 2) return { label: 'Pending review', colour: 'bg-amber-100 text-amber-800' }
    return { label: 'Human review required', colour: 'bg-red-100 text-red-800' }
  }
  return { label: 'Pending review', colour: 'bg-amber-100 text-amber-800' }
}

// ---------------------------------------------------------------------------
// CTA safety gate: must NOT show "Ask WorkTwin" if document is unsafe for AI
// ---------------------------------------------------------------------------
function isSafeForAiCta(doc: StaffPolicyRecord): boolean {
  return doc.status !== 'archived'
}

// ---------------------------------------------------------------------------
// Ask status badge - 4-tier label shown on every card and in the modal
// ---------------------------------------------------------------------------

function AskStatusBadge({ doc, small = true }: { doc: StaffPolicyRecord; small?: boolean }) {
  const sz = small ? 10 : 11
  const base = `inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${small ? 'text-[11px]' : 'text-xs'}`
  if (doc.status === 'archived') {
    return (
      <span className={`${base} bg-slate-100 text-slate-500 border-slate-200`}>
        <Archive size={sz} />Archived
      </span>
    )
  }
  return (
    <span className={`${base} bg-teal-50 text-teal-700 border-teal-100`}>
      <CheckCircle size={sz} />Staff-visible
    </span>
  )
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function PolicyModal({ doc, onClose }: { doc: StaffPolicyRecord; onClose: () => void }) {
  const safeForAi = isSafeForAiCta(doc)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-snug">{doc.title}</h2>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOURS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                {doc.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 -mt-1 p-2 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Approved notice */}
          <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
            <CheckCircle size={15} className="text-teal-600 mt-0.5 shrink-0" />
            <p className="text-xs text-teal-800 font-medium">
              Approved for this controlled pilot preview. In real use, staff should always follow the current approved Thumhara Centre policy and local management guidance.
            </p>
          </div>

          {/* Ask status badge */}
          <div className="flex flex-wrap gap-2">
            <AskStatusBadge doc={doc} small={false} />
          </div>

          {/* Description */}
          {doc.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{doc.description}</p>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 font-medium mb-0.5">Version</p>
              <p className="text-slate-800 font-semibold">{doc.version}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 font-medium mb-0.5">Review due</p>
              <p className="text-slate-800 font-semibold">{formatDate(doc.review_due_date)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 font-medium mb-0.5">File size</p>
              <p className="text-slate-800 font-semibold">{formatBytes(doc.file_size_bytes)}</p>
            </div>
          </div>

          {/* Per-language approval status */}
          {doc.available_languages.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Globe size={13} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Language approval status</p>
              </div>
              <div className="space-y-1.5">
                {doc.available_languages.map(lang => {
                  const ls = getLanguageStatus(doc, lang)
                  return (
                    <div key={lang} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">
                        {LANGUAGE_NAMES[lang] ?? lang}
                        {lang === doc.primary_language && <span className="text-slate-400 font-normal"> (source of truth)</span>}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ls.colour}`}>{ls.label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">
                Approved English policies remain the source of truth unless a human-reviewed translation has been approved.
              </p>
            </div>
          )}

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map(t => (
                <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer - CTA shown for non-archived policies only */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {safeForAi && HIGH_RISK_CATEGORIES.has(doc.category) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">Questions on this topic may be escalated to a human lead.</p>
            </div>
          )}
          <div className="flex gap-2">
            {safeForAi && (
              <a
                href="/ask"
                className="flex-1 flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <MessageCircle size={15} />
                Ask a policy question
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
          {safeForAi && (
            <p className="text-xs text-slate-400 text-center px-2">
              WorkTwin checks whether a question can be answered safely. High-risk topics are escalated to the appropriate human lead.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Policy Library page
// ---------------------------------------------------------------------------

export default function PoliciesPage() {
  const [docs, setDocs] = useState<StaffPolicyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selected, setSelected] = useState<StaffPolicyRecord | null>(null)

  useEffect(() => {
    fetchPolicies()
      .then(setDocs)
      .catch(() => {
        setDocs(SAMPLE_DOCS)
        setUsingFallback(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...Array.from(new Set(docs.map(d => d.category))).sort()]

  const filtered = docs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchCat = activeCategory === 'All' || d.category === activeCategory
    return matchSearch && matchCat
  })

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
              <BookOpen size={11} />
              Policy library
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Policy Library</h1>
            <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
              Policy Library shows approved staff-visible documents for this controlled preview. Ask WorkTwin may use eligible approved documents for answers where governance and safety checks allow.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CONTEXT_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-teal-200 text-xs">
              Ask WorkTwin only answers where approved sources and safety checks allow. If WorkTwin cannot answer safely, speak to a human lead.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">{loading ? '-' : docs.length}</p>
              <p className="text-xs text-slate-500">Staff-visible documents</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Visitor SOP</p>
              <p className="text-xs text-slate-500">Approved for this pilot</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Source-grounded</p>
              <p className="text-xs text-slate-500">Source-grounded support</p>
            </div>
          </div>
        </div>

        {/* Demo / fallback notice */}
        {usingFallback && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Could not load policy library</p>
              <p className="text-xs text-amber-700 mt-0.5">
                WorkTwin could not connect to the policy library. Showing the approved fallback policy information for this controlled pilot. Please try again or speak to your manager.
              </p>
            </div>
          </div>
        )}

        {/* Filter / search card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Browse approved policies</p>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search approved pilot policies by name, topic or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 placeholder-slate-400"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
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

        {/* Policy cards */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
            <div className="text-center space-y-2">
              <Loader2 size={28} className="mx-auto text-teal-400 animate-spin" />
              <p className="font-semibold text-slate-700">Loading approved policies</p>
              <p className="text-xs text-slate-400">Checking staff-visible documents for this controlled pilot.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">
              {search || activeCategory !== 'All'
                ? 'No policies match your filter'
                : 'No staff-visible policies are available yet.'}
            </p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {search || activeCategory !== 'All'
                ? 'Try a different search term or select a different category.'
                : 'Approved documents will appear here once they have been reviewed for staff visibility.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                className="bg-white border border-slate-200 rounded-3xl p-6 text-left hover:border-teal-300 hover:shadow-md transition-all group"
              >
                {/* Icon tile + category */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
                    <FileText size={18} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2 pt-0.5">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLOURS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {doc.category}
                    </span>
                    {doc.available_languages.length > 1 && (
                      <span title={`Available in ${doc.available_languages.map(l => LANGUAGE_NAMES[l] ?? l).join(', ')}`}>
                        <Globe size={13} className="text-slate-400" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-900 text-base leading-snug mb-2 group-hover:text-teal-700 transition-colors">
                  {doc.title}
                </h3>

                {/* Description */}
                {doc.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                    {doc.description}
                  </p>
                )}

                {/* Status chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <AskStatusBadge doc={doc} />
                  {doc.available_languages.length > 1 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                      <Globe size={10} />
                      {doc.translation_status === 'complete' ? 'Translation available' : 'Translation pending'}
                    </span>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>v{doc.version}</span>
                    {doc.review_due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(doc.review_due_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View policy</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Multilingual notice */}
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm flex items-start gap-3">
          <Globe size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-600">Multilingual support</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Future pilot versions can support Urdu, Punjabi, Arabic, Bengali, Gujarati and other languages where human-reviewed translations are approved.
              Approved English policies remain the source of truth unless a human-reviewed translation has been approved.
              Per-language approval status is shown in each policy detail.
            </p>
          </div>
        </div>

        {/* Safe support reminders */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={17} className="text-teal-600" />
            </div>
            <h2 className="font-semibold text-slate-900 text-sm">Safe support reminders</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-slate-600 leading-relaxed">
                Policy library content is for staff guidance during the controlled pilot. Safeguarding, medication, HR, legal, wellbeing or immediate-risk concerns should still be escalated to the right human lead.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-slate-600 leading-relaxed">
                Eligible approved documents may support staff-facing answers where governance checks allow. WorkTwin does not use the internet or external sources.
              </span>
            </li>
            <li className="flex items-start gap-2.5 bg-red-50 rounded-xl px-3 py-2.5 -mx-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-red-700 font-medium leading-relaxed">
                If someone is in immediate danger, call{' '}
                <a href="tel:999" className="font-bold underline">999</a>.
              </span>
            </li>
          </ul>
        </div>

      </div>

      {selected && <PolicyModal doc={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  )
}
