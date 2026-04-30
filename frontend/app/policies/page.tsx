'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchPolicies } from '@/lib/api'
import type { DocumentRecord } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  BookOpen, Search, CheckCircle, Globe, Users, MessageCircle,
  X, Calendar, AlertTriangle, Shield, FileText, ChevronRight,
  Lock, Archive,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample fallback data — approved policies only (shown when backend unavailable)
// ---------------------------------------------------------------------------
const SAMPLE_DOCS: DocumentRecord[] = [
  {
    id: 'doc-001', organisation_id: 'demo-org', title: 'Staff Handbook',
    description: 'Comprehensive guide for all Thumhara Centre staff covering employment terms, conduct standards, key procedures and benefits.',
    file_name: 'staff_handbook_v3.pdf', file_type: 'pdf', file_size_bytes: 1468006,
    storage_key: 'placeholder/demo-org/staff_handbook_v3.pdf', vertical: 'care',
    category: 'HR', tags: ['onboarding', 'conduct', 'employment'],
    status: 'approved', access_roles: ['All Staff'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: true,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en', 'ur', 'pa'], translation_status: 'complete',
    human_review_required: false, version: '3.0', review_due_date: '2026-01-12',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-002', organisation_id: 'demo-org', title: 'Medication Administration Policy',
    description: 'Procedure for safe medication administration including MAR chart guidance, controlled drugs handling and error reporting.',
    file_name: 'medication_admin_policy_v2.pdf', file_type: 'pdf', file_size_bytes: 911360,
    storage_key: 'placeholder/demo-org/medication_admin_policy_v2.pdf', vertical: 'care',
    category: 'Medication', tags: ['medication', 'MAR', 'controlled drugs', 'safety'],
    status: 'approved', access_roles: ['Care Worker', 'Senior Carer', 'Nurse'],
    is_sensitive: true, escalation_required: true, approved_for_ai_answers: true,
    approved_for_staff_visibility: false,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '2.1', review_due_date: '2026-01-20',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-003', organisation_id: 'demo-org', title: 'Safeguarding Policy and Procedure',
    description: 'Adults and children safeguarding policy including reporting routes, designated lead contacts and CQC compliance requirements.',
    file_name: 'safeguarding_policy_v4.pdf', file_type: 'pdf', file_size_bytes: 1153433,
    storage_key: 'placeholder/demo-org/safeguarding_policy_v4.pdf', vertical: 'care',
    category: 'Safeguarding', tags: ['safeguarding', 'CQC', 'reporting'],
    status: 'approved', access_roles: ['All Staff'],
    is_sensitive: true, escalation_required: true, approved_for_ai_answers: false,
    approved_for_staff_visibility: false,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en', 'ur'], translation_status: 'in_progress',
    human_review_required: true, version: '4.0', review_due_date: '2026-02-05',
    embedding_status: 'not_started', created_by: 'admin',
    created_at: '2025-02-05T00:00:00Z', updated_at: '2025-02-05T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-005', organisation_id: 'demo-org', title: 'Complaints Procedure',
    description: 'Step-by-step procedure for handling service user and family complaints, including timelines, recording requirements and escalation routes.',
    file_name: 'complaints_procedure_v1.pdf', file_type: 'pdf', file_size_bytes: 440320,
    storage_key: 'placeholder/demo-org/complaints_procedure_v1.pdf', vertical: 'care',
    category: 'Complaints', tags: ['complaints', 'feedback', 'service users'],
    status: 'approved', access_roles: ['All Staff'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: true,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en', 'ur', 'pa', 'ar'], translation_status: 'complete',
    human_review_required: false, version: '1.2', review_due_date: '2026-02-14',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-02-14T00:00:00Z', updated_at: '2025-02-14T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-006', organisation_id: 'demo-org', title: 'Infection Control Procedure',
    description: 'Standard precautions for infection prevention and control, PPE guidance, hand hygiene, and outbreak management protocols.',
    file_name: 'infection_control_v3.pdf', file_type: 'pdf', file_size_bytes: 696320,
    storage_key: 'placeholder/demo-org/infection_control_v3.pdf', vertical: 'care',
    category: 'Health and Safety', tags: ['infection control', 'PPE', 'hygiene'],
    status: 'approved', access_roles: ['All Staff'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: true,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '3.1', review_due_date: '2026-03-01',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-007', organisation_id: 'demo-org', title: 'Mental Capacity Act Guidance',
    description: 'Practical guidance on applying the Mental Capacity Act 2005 in care settings, including best interests decisions and advocacy.',
    file_name: 'mental_capacity_act_guidance_v2.pdf', file_type: 'pdf', file_size_bytes: 532480,
    storage_key: 'placeholder/demo-org/mental_capacity_act_guidance_v2.pdf', vertical: 'care',
    category: 'Training', tags: ['MCA', 'mental capacity', 'best interests'],
    status: 'approved', access_roles: ['Care Worker', 'Senior Carer', 'Nurse'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: false,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en'], translation_status: 'pending',
    human_review_required: false, version: '2.0', review_due_date: '2025-11-22',
    embedding_status: 'pending', created_by: 'admin',
    created_at: '2024-11-22T00:00:00Z', updated_at: '2024-11-22T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-008', organisation_id: 'demo-org', title: 'Incident Reporting Procedure',
    description: 'Process for reporting accidents, near misses, and incidents including RIDDOR obligations and duty of candour.',
    file_name: 'incident_reporting_v2.pdf', file_type: 'pdf', file_size_bytes: 348160,
    storage_key: 'placeholder/demo-org/incident_reporting_v2.pdf', vertical: 'care',
    category: 'Health and Safety', tags: ['incident', 'accident', 'RIDDOR'],
    status: 'approved', access_roles: ['All Staff'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: true,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '2.0', review_due_date: '2026-04-03',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-04-03T00:00:00Z', updated_at: '2025-04-03T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-012', organisation_id: 'demo-org', title: 'New Staff Induction Checklist',
    description: 'Structured onboarding checklist for new starters covering mandatory training, policy sign-offs, DBS checks and buddy assignment.',
    file_name: 'induction_checklist_v2.pdf', file_type: 'pdf', file_size_bytes: 184320,
    storage_key: 'placeholder/demo-org/induction_checklist_v2.pdf', vertical: 'care',
    category: 'Onboarding', tags: ['induction', 'onboarding', 'DBS', 'mandatory training'],
    status: 'approved', access_roles: ['All Staff', 'Manager'],
    is_sensitive: false, escalation_required: false, approved_for_ai_answers: true,
    approved_for_staff_visibility: true,
    contains_personal_data_warning: false, primary_language: 'en',
    available_languages: ['en', 'ur', 'pa', 'bn'], translation_status: 'in_progress',
    human_review_required: false, version: '2.0', review_due_date: '2026-06-01',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2025-03-20T00:00:00Z', updated_at: '2025-03-20T00:00:00Z', metadata: {},
  },
]

const CATEGORY_COLOURS: Record<string, string> = {
  HR: 'bg-violet-50 text-violet-700',
  Medication: 'bg-orange-50 text-orange-700',
  Safeguarding: 'bg-red-50 text-red-700',
  Complaints: 'bg-blue-50 text-blue-700',
  'Health and Safety': 'bg-teal-50 text-teal-700',
  Training: 'bg-indigo-50 text-indigo-700',
  Onboarding: 'bg-emerald-50 text-emerald-700',
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Per-language approval status (sample — real per-language approval in 4B+)
// Primary language is always Approved (document is approved).
// Other languages derive status from translation_status and position in list.
// ---------------------------------------------------------------------------
function getLanguageStatus(doc: DocumentRecord, lang: string): { label: string; colour: string } {
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
function isSafeForAiCta(doc: DocumentRecord): boolean {
  return (
    doc.status !== 'archived' &&
    doc.approved_for_ai_answers === true &&
    doc.approved_for_staff_visibility === true &&
    doc.is_sensitive !== true &&
    doc.escalation_required !== true
  )
}

// ---------------------------------------------------------------------------
// Ask status badge — 4-tier label shown on every card and in the modal
// ---------------------------------------------------------------------------

function AskStatusBadge({ doc, small = true }: { doc: DocumentRecord; small?: boolean }) {
  const sz = small ? 10 : 11
  const base = `inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${small ? 'text-[11px]' : 'text-xs'}`
  if (doc.status === 'archived') {
    return (
      <span className={`${base} bg-slate-100 text-slate-500 border-slate-200`}>
        <Archive size={sz} />Archived
      </span>
    )
  }
  if (doc.is_sensitive || doc.escalation_required) {
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-100`}>
        <Lock size={sz} />Human-only — Ask blocked
      </span>
    )
  }
  if (isSafeForAiCta(doc)) {
    return (
      <span className={`${base} bg-teal-50 text-teal-700 border-teal-100`}>
        <MessageCircle size={sz} />Ask enabled
      </span>
    )
  }
  return (
    <span className={`${base} bg-amber-50 text-amber-700 border-amber-100`}>
      <Shield size={sz} />Admin-test only
    </span>
  )
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function PolicyModal({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Approved notice */}
          <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
            <CheckCircle size={15} className="text-teal-600 mt-0.5 shrink-0" />
            <p className="text-xs text-teal-800 font-medium">
              Approved policy — all Thumhara Centre staff should follow it.
            </p>
          </div>

          {/* Ask status badge */}
          <div className="flex flex-wrap gap-2">
            <AskStatusBadge doc={doc} small={false} />
          </div>

          {/* Human-only notice */}
          {(doc.is_sensitive || doc.escalation_required) && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <Lock size={15} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800 font-medium">
                This policy covers sensitive or escalation-required topics. WorkTwin cannot answer questions on this document — always speak to your manager or the correct designated lead.
              </p>
            </div>
          )}

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
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 font-medium mb-0.5">Accessible to</p>
              <p className="text-slate-800 font-semibold">{doc.access_roles.join(', ')}</p>
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

        {/* Footer — CTA is gated by safety flags */}
        <div className="p-5 border-t border-slate-100 flex gap-2">
          {safeForAi ? (
            <a
              href={`/ask?policy=${encodeURIComponent(doc.title)}`}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle size={15} />
              Ask WorkTwin about this policy
            </a>
          ) : (doc.is_sensitive || doc.escalation_required) ? (
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm font-medium px-4 py-2.5 rounded-xl">
                <Lock size={15} />
                Human-only — Ask blocked
              </div>
              <p className="text-center text-xs text-slate-400">Speak to your manager or the correct designated lead.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl">
                <Shield size={15} />
                Admin-test only
              </div>
              <p className="text-center text-xs text-slate-400">Not yet approved for staff answers.</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Policy Library page
// ---------------------------------------------------------------------------

export default function PoliciesPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selected, setSelected] = useState<DocumentRecord | null>(null)

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
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={20} className="text-teal-600" />
              <h1 className="text-xl font-bold text-slate-900">Policy Library</h1>
            </div>
            <p className="text-sm text-slate-500">
              Approved Thumhara Centre policies and procedures. All WorkTwin answers are grounded in these documents.
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1.5 font-medium whitespace-nowrap shrink-0">
            {docs.length} approved {docs.length === 1 ? 'policy' : 'policies'}
          </span>
        </div>

        {/* Approved notice banner */}
        <div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
          <Shield size={18} className="text-teal-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-teal-900">Approved company documents</p>
            <p className="text-xs text-teal-700 mt-0.5">
              All documents in this library have been reviewed and approved by Thumhara Centre management.
              Approved English-language policies are the source of truth. Translations are provided where a human-reviewed version has been approved.
            </p>
          </div>
        </div>

        {/* Ask status explainer */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
          <MessageCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">Demo policy library — Ask safety labels shown for illustration.</span>
            {' '}WorkTwin only answers questions from documents that have been approved for staff visibility. Each policy shows a clear safety label such as: <span className="font-medium text-teal-700">Ask enabled</span> — approved for staff Ask; <span className="font-medium text-red-700">Human-only — Ask blocked</span> — sensitive or escalation-required topic; must be handled by the correct lead or manager; <span className="font-medium text-amber-700">Admin-test only</span> — not approved for staff answers; or <span className="font-medium text-slate-500">Archived</span> — document no longer in active use.
          </p>
        </div>

        {usingFallback && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            Demo mode — showing sample data. Connect the backend to load live documents.
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search policies by name, topic or keyword…"
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
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Policy cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-50 rounded w-full mb-1.5" />
                <div className="h-3 bg-slate-50 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No policies found</p>
            <p className="text-xs mt-1">Try a different search term or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-teal-300 hover:shadow-sm transition-all group"
                >
                  {/* Category + language flag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLOURS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {doc.category}
                    </span>
                    {doc.available_languages.length > 1 && (
                      <span title={`Available in ${doc.available_languages.map(l => LANGUAGE_NAMES[l] ?? l).join(', ')}`}>
                        <Globe size={13} className="text-slate-400" />
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2 group-hover:text-teal-700 transition-colors">
                    {doc.title}
                  </h3>

                  {/* Description */}
                  {doc.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                      {doc.description}
                    </p>
                  )}

                  {/* Ask status + supplementary labels */}
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
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>v{doc.version}</span>
                      {doc.review_due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(doc.review_due_date)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {doc.access_roles[0]}{doc.access_roles.length > 1 ? ` +${doc.access_roles.length - 1}` : ''}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
            ))}
          </div>
        )}

        {/* Multilingual notice */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
          <Globe size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-600">Multilingual support</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Policies are being prepared in Urdu, Punjabi, Arabic, Bengali, Gujarati and other languages.
              Approved English policies remain the source of truth unless a human-reviewed translation has been approved.
              Per-language approval status is shown in each policy detail.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Only documents shown here are used to answer staff questions. WorkTwin does not use the internet or external sources.
        </p>
      </div>

      {selected && <PolicyModal doc={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  )
}
