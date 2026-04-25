'use client'
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchDocuments, approveDocument, archiveDocument } from '@/lib/api'
import type { DocumentRecord, DocumentStatus, EmbeddingStatus } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  FileText, Upload, CheckCircle, Clock, AlertCircle, Users,
  AlertTriangle, Shield, Globe, Brain, Archive, RefreshCw,
  ShieldAlert, XCircle, Filter,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample fallback data (all statuses for admin view)
// ---------------------------------------------------------------------------
const SAMPLE_DOCS: DocumentRecord[] = [
  {
    id: 'doc-001', organisation_id: 'demo-org', title: 'Staff Handbook',
    description: 'Comprehensive guide for all staff.', file_name: 'staff_handbook_v3.pdf',
    file_type: 'pdf', file_size_bytes: 1468006, storage_key: 'placeholder/demo-org/staff_handbook_v3.pdf',
    vertical: 'care', category: 'HR', tags: ['onboarding', 'conduct'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en', 'ur', 'pa'], translation_status: 'complete',
    human_review_required: false, version: '3.0', review_due_date: '2026-01-12',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-002', organisation_id: 'demo-org', title: 'Medication Administration Policy',
    description: 'Safe medication administration procedure.', file_name: 'medication_admin_policy_v2.pdf',
    file_type: 'pdf', file_size_bytes: 911360, storage_key: 'placeholder/demo-org/medication_admin_policy_v2.pdf',
    vertical: 'care', category: 'Medication', tags: ['medication', 'MAR'], status: 'approved',
    access_roles: ['Care Worker', 'Senior Carer', 'Nurse'], is_sensitive: true, escalation_required: true,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '2.1', review_due_date: '2026-01-20',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-003', organisation_id: 'demo-org', title: 'Safeguarding Policy and Procedure',
    description: 'Adults and children safeguarding policy.', file_name: 'safeguarding_policy_v4.pdf',
    file_type: 'pdf', file_size_bytes: 1153433, storage_key: 'placeholder/demo-org/safeguarding_policy_v4.pdf',
    vertical: 'care', category: 'Safeguarding', tags: ['safeguarding', 'CQC'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: true, escalation_required: true,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en', 'ur'], translation_status: 'in_progress',
    human_review_required: true, version: '4.0', review_due_date: '2026-02-05',
    embedding_status: 'not_started', created_by: 'admin', created_at: '2025-02-05T00:00:00Z', updated_at: '2025-02-05T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-004', organisation_id: 'demo-org', title: 'Health and Safety Policy',
    description: 'Workplace health and safety policy.', file_name: 'health_safety_policy_v2.pdf',
    file_type: 'pdf', file_size_bytes: 778240, storage_key: 'placeholder/demo-org/health_safety_policy_v2.pdf',
    vertical: 'care', category: 'Health and Safety', tags: ['H&S', 'risk assessment'], status: 'under_review',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '2.0', review_due_date: '2026-03-08',
    embedding_status: 'not_started', created_by: 'admin', created_at: '2025-03-08T00:00:00Z', updated_at: '2025-03-08T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-005', organisation_id: 'demo-org', title: 'Complaints Procedure',
    description: 'Handling service user and family complaints.', file_name: 'complaints_procedure_v1.pdf',
    file_type: 'pdf', file_size_bytes: 440320, storage_key: 'placeholder/demo-org/complaints_procedure_v1.pdf',
    vertical: 'care', category: 'Complaints', tags: ['complaints'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en', 'ur', 'pa', 'ar'], translation_status: 'complete',
    human_review_required: false, version: '1.2', review_due_date: '2026-02-14',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-02-14T00:00:00Z', updated_at: '2025-02-14T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-006', organisation_id: 'demo-org', title: 'Infection Control Procedure',
    description: 'Infection prevention and control standards.', file_name: 'infection_control_v3.pdf',
    file_type: 'pdf', file_size_bytes: 696320, storage_key: 'placeholder/demo-org/infection_control_v3.pdf',
    vertical: 'care', category: 'Health and Safety', tags: ['infection control', 'PPE'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '3.1', review_due_date: '2026-03-01',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-007', organisation_id: 'demo-org', title: 'Mental Capacity Act Guidance',
    description: 'Applying the Mental Capacity Act 2005 in care settings.', file_name: 'mental_capacity_act_guidance_v2.pdf',
    file_type: 'pdf', file_size_bytes: 532480, storage_key: 'placeholder/demo-org/mental_capacity_act_guidance_v2.pdf',
    vertical: 'care', category: 'Training', tags: ['MCA', 'mental capacity'], status: 'approved',
    access_roles: ['Care Worker', 'Senior Carer', 'Nurse'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'pending',
    human_review_required: false, version: '2.0', review_due_date: '2025-11-22',
    embedding_status: 'pending', created_by: 'admin', created_at: '2024-11-22T00:00:00Z', updated_at: '2024-11-22T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-008', organisation_id: 'demo-org', title: 'Incident Reporting Procedure',
    description: 'Reporting accidents, near misses and incidents.', file_name: 'incident_reporting_v2.pdf',
    file_type: 'pdf', file_size_bytes: 348160, storage_key: 'placeholder/demo-org/incident_reporting_v2.pdf',
    vertical: 'care', category: 'Health and Safety', tags: ['incident', 'RIDDOR'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: false, version: '2.0', review_due_date: '2026-04-03',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-04-03T00:00:00Z', updated_at: '2025-04-03T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-009', organisation_id: 'demo-org', title: 'Disciplinary and Grievance Policy',
    description: 'Handling disciplinary matters and employee grievances.', file_name: 'disciplinary_grievance_v2.pdf',
    file_type: 'pdf', file_size_bytes: 624640, storage_key: 'placeholder/demo-org/disciplinary_grievance_v2.pdf',
    vertical: 'care', category: 'HR', tags: ['disciplinary', 'grievance', 'ACAS'], status: 'approved',
    access_roles: ['Manager', 'HR Coordinator'], is_sensitive: true, escalation_required: true,
    approved_for_ai_answers: false, contains_personal_data_warning: true,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '2.0', review_due_date: '2026-01-10',
    embedding_status: 'not_started', created_by: 'admin', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-010', organisation_id: 'demo-org', title: 'End of Life Care Policy',
    description: 'Compassionate end of life care guidance.', file_name: 'end_of_life_care_v1.pdf',
    file_type: 'pdf', file_size_bytes: 491520, storage_key: 'placeholder/demo-org/end_of_life_care_v1.pdf',
    vertical: 'care', category: 'Training', tags: ['end of life', 'DNACPR', 'palliative'], status: 'under_review',
    access_roles: ['Senior Carer', 'Nurse', 'Manager'], is_sensitive: true, escalation_required: false,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '1.0', review_due_date: '2026-03-15',
    embedding_status: 'not_started', created_by: 'admin', created_at: '2025-03-15T00:00:00Z', updated_at: '2025-03-15T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-011', organisation_id: 'demo-org', title: 'Rota and Leave Management SOP',
    description: 'Rota planning, annual leave requests and absence recording.', file_name: 'rota_leave_sop_draft.docx',
    file_type: 'docx', file_size_bytes: 215040, storage_key: 'placeholder/demo-org/rota_leave_sop_draft.docx',
    vertical: 'care', category: 'HR', tags: ['rota', 'leave', 'absence'], status: 'draft',
    access_roles: ['Manager', 'HR Coordinator'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '0.1', review_due_date: '2026-04-22',
    embedding_status: 'not_started', created_by: 'admin', created_at: '2025-04-22T00:00:00Z', updated_at: '2025-04-22T00:00:00Z', metadata: {},
  },
  {
    id: 'doc-012', organisation_id: 'demo-org', title: 'New Staff Induction Checklist',
    description: 'Onboarding checklist for new starters.', file_name: 'induction_checklist_v2.pdf',
    file_type: 'pdf', file_size_bytes: 184320, storage_key: 'placeholder/demo-org/induction_checklist_v2.pdf',
    vertical: 'care', category: 'Onboarding', tags: ['induction', 'DBS'], status: 'approved',
    access_roles: ['All Staff', 'Manager'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: true, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en', 'ur', 'pa', 'bn'], translation_status: 'in_progress',
    human_review_required: false, version: '2.0', review_due_date: '2026-06-01',
    embedding_status: 'indexed', created_by: 'admin', created_at: '2025-03-20T00:00:00Z', updated_at: '2025-03-20T00:00:00Z', metadata: {},
  },
]

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: React.ReactNode; colour: string }> = {
  approved:     { label: 'Approved',     icon: <CheckCircle size={12} />, colour: 'bg-teal-50 text-teal-700 border-teal-100' },
  under_review: { label: 'Under Review', icon: <Clock size={12} />,       colour: 'bg-amber-50 text-amber-700 border-amber-100' },
  draft:        { label: 'Draft',        icon: <AlertCircle size={12} />, colour: 'bg-slate-100 text-slate-500 border-slate-200' },
  archived:     { label: 'Archived',     icon: <Archive size={12} />,     colour: 'bg-slate-100 text-slate-400 border-slate-200' },
}

const EMBED_CONFIG: Record<EmbeddingStatus, { label: string; colour: string }> = {
  not_started: { label: 'Not indexed', colour: 'bg-slate-100 text-slate-400' },
  pending:     { label: 'Pending',     colour: 'bg-amber-50 text-amber-600' },
  processing:  { label: 'Processing',  colour: 'bg-blue-50 text-blue-600' },
  indexed:     { label: 'Indexed ✓',   colour: 'bg-teal-50 text-teal-700' },
  failed:      { label: 'Failed',      colour: 'bg-red-50 text-red-600' },
}

const VERTICAL_LABELS: Record<string, string> = {
  care: 'Care', finance: 'Finance', property: 'Property',
  recruitment: 'Recruitment', healthcare_admin: 'Healthcare Admin',
  training_provider: 'Training', general: 'General', custom: 'Custom',
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function Flag({ active, title, icon }: { active: boolean; title: string; icon: React.ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center justify-center w-5 h-5 rounded ${active ? 'text-amber-600' : 'text-slate-200'}`}>
      {icon}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Admin Document Registry page
// ---------------------------------------------------------------------------

export default function DocumentRegistryPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [actioning, setActioning] = useState<string | null>(null)

  const loadDocs = useCallback(() => {
    setLoading(true)
    fetchDocuments()
      .then(data => { setDocs(data); setUsingFallback(false) })
      .catch(() => { setDocs(SAMPLE_DOCS); setUsingFallback(true) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  const categories = ['All', ...Array.from(new Set(docs.map(d => d.category))).sort()]

  const filtered = docs.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    const matchCat = categoryFilter === 'All' || d.category === categoryFilter
    return matchStatus && matchCat
  })

  async function handleApprove(id: string) {
    setActioning(id)
    try {
      const updated = usingFallback
        ? { ...docs.find(d => d.id === id)!, status: 'approved' as DocumentStatus }
        : await approveDocument(id)
      setDocs(prev => prev.map(d => d.id === id ? updated : d))
    } finally {
      setActioning(null)
    }
  }

  async function handleArchive(id: string) {
    setActioning(id)
    try {
      const updated = usingFallback
        ? { ...docs.find(d => d.id === id)!, status: 'archived' as DocumentStatus }
        : await archiveDocument(id)
      setDocs(prev => prev.map(d => d.id === id ? updated : d))
    } finally {
      setActioning(null)
    }
  }

  const counts = {
    all: docs.length,
    approved: docs.filter(d => d.status === 'approved').length,
    under_review: docs.filter(d => d.status === 'under_review').length,
    draft: docs.filter(d => d.status === 'draft').length,
    archived: docs.filter(d => d.status === 'archived').length,
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Document Registry</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              All approved policies, SOPs and training materials. Only documents marked &ldquo;Approved for AI&rdquo; are used to answer staff questions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDocs} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
              <RefreshCw size={12} />
              Refresh
            </button>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1.5 font-medium whitespace-nowrap">
              {counts.approved} approved · {counts.all} total
            </span>
          </div>
        </div>

        {/* Upload safety notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Upload safety notice</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Only upload <strong>approved policies, SOPs, onboarding documents and training materials</strong>.
                Do <strong>not</strong> upload: service-user records, care plans, MAR charts with names, staff HR files, payroll records,
                safeguarding case notes, complaints involving named people, or any other private personal data.
              </p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false) }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
          }`}
        >
          <Upload size={22} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Drop approved documents here to upload</p>
          <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT · Max 25 MB · Milestone 4B will enable real upload and indexing</p>
          <button className="mt-3 text-sm bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg transition-colors opacity-60 cursor-not-allowed" disabled>
            Browse files (coming in 4B)
          </button>
        </div>

        {usingFallback && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            Demo mode — showing sample data. Start the backend (<code className="font-mono">uvicorn app.main:app --reload</code>) to load the live registry.
          </div>
        )}

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={13} className="text-slate-400" />
          {(['all', 'approved', 'under_review', 'draft', 'archived'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
              }`}
            >
              {s === 'all' ? 'All' : s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)}
              {' '}
              <span className="opacity-70">({counts[s]})</span>
            </button>
          ))}
          <span className="text-slate-200">|</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                categoryFilter === cat
                  ? 'bg-slate-700 border-slate-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Language support note */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Globe size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">
            <strong>Multilingual readiness:</strong> Documents can be made available in English, Urdu, Punjabi, Arabic, Bengali, Gujarati and other languages.
            Approved English policies are the source of truth unless an approved translation exists.
            Use the <em>Available Languages</em> column to track translation status.
          </p>
        </div>

        {/* Registry table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Document</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Vertical</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Access</th>
                  <th className="px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center" title="Sensitive">
                    <ShieldAlert size={13} className="mx-auto" />
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center" title="Escalation required">
                    <AlertTriangle size={13} className="mx-auto" />
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center" title="Approved for AI answers">
                    <Brain size={13} className="mx-auto" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Language</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Review due</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Embedding</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-400">Loading registry…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-400">No documents match the current filter</td>
                  </tr>
                ) : filtered.map((doc, i) => {
                  const sc = STATUS_CONFIG[doc.status]
                  const ec = EMBED_CONFIG[doc.embedding_status]
                  const isLast = i === filtered.length - 1
                  const busy = actioning === doc.id
                  return (
                    <tr key={doc.id} className={`${isLast ? '' : 'border-b border-slate-50'} hover:bg-slate-50/40 transition-colors ${doc.status === 'archived' ? 'opacity-60' : ''}`}>
                      {/* Document */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800 whitespace-nowrap max-w-[220px] truncate" title={doc.title}>{doc.title}</p>
                            <p className="text-slate-400 text-[11px]">v{doc.version}</p>
                          </div>
                        </div>
                      </td>

                      {/* Vertical */}
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap">
                          {VERTICAL_LABELS[doc.vertical] ?? doc.vertical}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap">{doc.category}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${sc.colour}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      </td>

                      {/* Access */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-slate-500 whitespace-nowrap">
                          <Users size={11} className="text-slate-400" />
                          <span className="max-w-[130px] truncate" title={doc.access_roles.join(', ')}>
                            {doc.access_roles[0]}{doc.access_roles.length > 1 ? ` +${doc.access_roles.length - 1}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Sensitive */}
                      <td className="px-3 py-3.5 text-center">
                        <Flag active={doc.is_sensitive} title="Sensitive document" icon={<Shield size={13} />} />
                      </td>

                      {/* Escalation */}
                      <td className="px-3 py-3.5 text-center">
                        <Flag active={doc.escalation_required} title="Escalation required" icon={<AlertTriangle size={13} />} />
                      </td>

                      {/* AI approved */}
                      <td className="px-3 py-3.5 text-center">
                        <Flag active={doc.approved_for_ai_answers} title="Approved for AI answers" icon={<Brain size={13} />} />
                      </td>

                      {/* Language */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Globe size={11} className="text-slate-400" />
                          <span className="text-slate-600 font-medium">{LANGUAGE_NAMES[doc.primary_language] ?? doc.primary_language}</span>
                          {doc.available_languages.length > 1 && (
                            <span className="text-slate-400" title={doc.available_languages.map(l => LANGUAGE_NAMES[l] ?? l).join(', ')}>
                              +{doc.available_languages.length - 1}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Review due */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(doc.review_due_date)}</td>

                      {/* Embedding */}
                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ec.colour}`}>
                          {ec.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {(doc.status === 'draft' || doc.status === 'under_review') && (
                            <button
                              onClick={() => handleApprove(doc.id)}
                              disabled={busy}
                              className="flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 border border-teal-200 hover:border-teal-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <CheckCircle size={11} />
                              Approve
                            </button>
                          )}
                          {doc.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(doc.id)}
                              disabled={busy}
                              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <Archive size={11} />
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Shield size={12} className="text-amber-500" /> Sensitive document</span>
          <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500" /> Escalation required for topic</span>
          <span className="flex items-center gap-1"><Brain size={12} className="text-amber-500" /> Approved for AI answers</span>
          <span className="text-slate-300">·</span>
          <span>Icons are grey when flag is off, amber when on.</span>
        </div>

        {/* Platform note */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">
            <strong>Platform flexibility:</strong> The <em>Vertical</em> field means this registry is not limited to care.
            It can hold policies for finance, property management, recruitment, healthcare admin, training providers
            and other regulated SMEs — all managed in one place.
            Document indexing (RAG) is coming in <strong>Milestone 4B</strong>.
          </p>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Only documents listed here are used to answer staff questions. WorkTwin does not use the internet or external sources.
        </p>
      </div>
    </AppLayout>
  )
}
