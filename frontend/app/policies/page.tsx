'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchDocuments } from '@/lib/api'
import type { DocumentRecord } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  BookOpen, Search, CheckCircle, Globe, Users, MessageCircle,
  X, Calendar, Tag, AlertTriangle, Shield, FileText, ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample fallback data (shown when backend is not running)
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
// Detail modal
// ---------------------------------------------------------------------------

function PolicyModal({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
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
              This is an approved Thumhara Centre policy. All staff should follow it.
            </p>
          </div>

          {/* Escalation notice */}
          {doc.escalation_required && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Topics covered by this policy may require human escalation. Always speak to your manager or designated lead when in doubt.
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
              <p className="text-slate-400 font-medium mb-0.5">File</p>
              <p className="text-slate-800 font-semibold">{formatBytes(doc.file_size_bytes)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 font-medium mb-0.5">Accessible to</p>
              <p className="text-slate-800 font-semibold">{doc.access_roles.join(', ')}</p>
            </div>
          </div>

          {/* Languages */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe size={13} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available languages</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {doc.available_languages.map(lang => (
                <span key={lang} className={`text-xs px-2 py-0.5 rounded-full font-medium ${lang === doc.primary_language ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                  {LANGUAGE_NAMES[lang] ?? lang}
                  {lang === doc.primary_language && ' ✓'}
                </span>
              ))}
            </div>
            {doc.translation_status === 'in_progress' && (
              <p className="text-xs text-slate-400 mt-1.5 italic">
                Additional translations are being prepared. The approved English version is the current source of truth.
              </p>
            )}
            {doc.translation_status === 'pending' && (
              <p className="text-xs text-slate-400 mt-1.5 italic">
                Translation has been requested. The approved English version is the current source of truth.
              </p>
            )}
          </div>

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

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-2">
          <a
            href={`/ask?policy=${encodeURIComponent(doc.title)}`}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle size={15} />
            Ask WorkTwin about this policy
          </a>
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
    fetchDocuments({ status: 'approved' })
      .then(setDocs)
      .catch(() => {
        setDocs(SAMPLE_DOCS.filter(d => d.status === 'approved'))
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
              Approved English-language policies are the source of truth. Translations are provided where available.
            </p>
          </div>
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
                {/* Category + flags */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLOURS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {doc.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {doc.escalation_required && (
                      <span title="May require human escalation">
                        <AlertTriangle size={13} className="text-amber-500" />
                      </span>
                    )}
                    {doc.available_languages.length > 1 && (
                      <span title={`Available in ${doc.available_languages.map(l => LANGUAGE_NAMES[l] ?? l).join(', ')}`}>
                        <Globe size={13} className="text-slate-400" />
                      </span>
                    )}
                  </div>
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

        {/* Bilingual notice */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
          <Globe size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-600">Multilingual support in progress</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Policies are being prepared in Urdu, Punjabi, Arabic, Bengali, Gujarati and other languages.
              Approved English policies remain the source of truth until a translation is formally approved.
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
