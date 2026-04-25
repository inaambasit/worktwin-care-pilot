'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchDocuments, approveDocument, archiveDocument, uploadDocumentPdf } from '@/lib/api'
import type { DocumentRecord, DocumentStatus, EmbeddingStatus, UploadDocumentResult } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  FileText, Upload, CheckCircle, Clock, AlertCircle, Users,
  AlertTriangle, Shield, Globe, Brain, Archive, RefreshCw,
  ShieldAlert, XCircle, Filter, ChevronDown, ChevronUp,
  Loader2, X, Info, CheckCircle2,
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

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
// Upload form state
// ---------------------------------------------------------------------------

interface UploadFormState {
  organisation_id: string
  title: string
  description: string
  vertical: string
  category: string
  access_roles: string
  status: string
  is_sensitive: boolean
  escalation_required: boolean
  approved_for_ai_answers: boolean
  primary_language: string
  available_languages: string
  review_due_date: string
  version: string
}

const EMPTY_FORM: UploadFormState = {
  organisation_id: 'demo-org',
  title: '',
  description: '',
  vertical: 'care',
  category: '',
  access_roles: 'All Staff',
  status: 'draft',
  is_sensitive: false,
  escalation_required: false,
  approved_for_ai_answers: false,
  primary_language: 'en',
  available_languages: 'en',
  review_due_date: '',
  version: '1.0',
}

// ---------------------------------------------------------------------------
// Admin Document Registry page
// ---------------------------------------------------------------------------

export default function DocumentRegistryPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [registrySource, setRegistrySource] = useState<'database' | 'demo_fallback' | null>(null)
  const [registryWarning, setRegistryWarning] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [actioning, setActioning] = useState<string | null>(null)

  // Upload form
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [form, setForm] = useState<UploadFormState>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadDocumentResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(() => {
    setLoading(true)
    fetchDocuments()
      .then(data => {
        setDocs(data.documents)
        setRegistrySource(data.registry_source)
        setRegistryWarning(data.registry_warning)
        setUsingFallback(false)
      })
      .catch(() => {
        setDocs(SAMPLE_DOCS)
        setUsingFallback(true)
        setRegistrySource(null)
        setRegistryWarning(null)
      })
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

  async function handleUpload() {
    if (!uploadFile) { setUploadError('Please select a PDF file.'); return }
    if (!form.title.trim()) { setUploadError('Title is required.'); return }
    if (!form.category.trim()) { setUploadError('Category is required.'); return }

    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    try {
      const result = await uploadDocumentPdf({
        file: uploadFile,
        organisation_id: form.organisation_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        vertical: form.vertical,
        category: form.category.trim(),
        access_roles: form.access_roles.split(',').map(r => r.trim()).filter(Boolean),
        status: form.status,
        is_sensitive: form.is_sensitive,
        escalation_required: form.escalation_required,
        approved_for_ai_answers: form.approved_for_ai_answers,
        primary_language: form.primary_language,
        available_languages: form.available_languages.split(',').map(l => l.trim()).filter(Boolean),
        review_due_date: form.review_due_date || undefined,
        version: form.version,
      })
      setUploadResult(result)
      // If upload was fully successful, reload the doc list
      if (result.storage_status === 'uploaded' && result.registry_status === 'saved') {
        loadDocs()
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function resetUploadForm() {
    setUploadFile(null)
    setForm(EMPTY_FORM)
    setUploadResult(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={loadDocs} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
              <RefreshCw size={12} />
              Refresh
            </button>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1.5 font-medium whitespace-nowrap">
              {counts.approved} approved · {counts.all} total
            </span>
            {!usingFallback && registrySource && (
              <span className={`text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap border ${
                registrySource === 'database'
                  ? 'bg-teal-50 text-teal-700 border-teal-100'
                  : registryWarning
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {registrySource === 'database'
                  ? 'Live registry'
                  : registryWarning
                    ? 'Database unavailable — demo fallback'
                    : 'Demo sample registry'}
              </span>
            )}
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
              <p className="text-xs text-amber-700 mt-1">
                <strong>PDF only in Milestone 4B.</strong> DOCX and TXT will be added later after tracked-changes and metadata safety checks.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => { setShowUpload(s => !s); setUploadResult(null); setUploadError(null) }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Upload size={15} className="text-teal-600" />
              Upload PDF Document
            </span>
            {showUpload ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {showUpload && (
            <div className="border-t border-slate-100 p-5 space-y-5">

              {/* File picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PDF file <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setUploadFile(f)
                    setUploadResult(null)
                    setUploadError(null)
                  }}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 file:cursor-pointer cursor-pointer"
                />
                {uploadFile && (
                  <p className="mt-1 text-[11px] text-slate-400">{uploadFile.name} · {formatBytes(uploadFile.size)}</p>
                )}
              </div>

              {/* Core fields — 2-column on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Medication Administration Policy"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief summary of document contents"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                {/* Vertical */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vertical</label>
                  <select
                    value={form.vertical}
                    onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    {Object.entries(VERTICAL_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Medication, Safeguarding, HR"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                {/* Access roles */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Access roles</label>
                  <input
                    type="text"
                    value={form.access_roles}
                    onChange={e => setForm(f => ({ ...f, access_roles: e.target.value }))}
                    placeholder="All Staff, Care Worker, Manager"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Comma-separated roles</p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>

                {/* Primary language */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary language</label>
                  <select
                    value={form.primary_language}
                    onChange={e => setForm(f => ({ ...f, primary_language: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Available languages */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available languages</label>
                  <input
                    type="text"
                    value={form.available_languages}
                    onChange={e => setForm(f => ({ ...f, available_languages: e.target.value }))}
                    placeholder="en, ur, pa"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Comma-separated language codes</p>
                </div>

                {/* Review due date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review due date</label>
                  <input
                    type="date"
                    value={form.review_due_date}
                    onChange={e => setForm(f => ({ ...f, review_due_date: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                {/* Version */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="1.0"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Boolean flags */}
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'is_sensitive' as const, label: 'Sensitive document', icon: <Shield size={13} /> },
                  { key: 'escalation_required' as const, label: 'Escalation required', icon: <AlertTriangle size={13} /> },
                  { key: 'approved_for_ai_answers' as const, label: 'Approved for AI answers', icon: <Brain size={13} /> },
                ].map(({ key, label, icon }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                    />
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      {icon}
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Submit / reset */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="flex items-center gap-2 text-sm font-semibold bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload size={14} /> Upload PDF</>
                  )}
                </button>
                <button
                  onClick={resetUploadForm}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <X size={12} /> Reset
                </button>
              </div>

              {/* Upload error */}
              {uploadError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload result */}
              {uploadResult && (
                <div className={`rounded-2xl border p-4 space-y-3 ${uploadResult.storage_status === 'uploaded' ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'}`}>
                  {/* Status header */}
                  <div className="flex items-center gap-2">
                    {uploadResult.storage_status === 'uploaded' ? (
                      <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                    ) : (
                      <Info size={16} className="text-amber-600 shrink-0" />
                    )}
                    <p className={`text-sm font-semibold ${uploadResult.storage_status === 'uploaded' ? 'text-teal-900' : 'text-amber-900'}`}>
                      {uploadResult.storage_status === 'uploaded' ? 'Upload successful' : 'Storage not configured'}
                    </p>
                  </div>

                  {uploadResult.message && (
                    <p className="text-xs text-amber-800">{uploadResult.message}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {uploadResult.file_name && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-slate-400 font-medium">File</p>
                        <p className="text-slate-700 font-mono truncate">{uploadResult.file_name}</p>
                      </div>
                    )}
                    {uploadResult.file_size_bytes !== undefined && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-slate-400 font-medium">Size</p>
                        <p className="text-slate-700">{formatBytes(uploadResult.file_size_bytes)}</p>
                      </div>
                    )}
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-slate-400 font-medium">Storage</p>
                      <p className={`font-medium ${uploadResult.storage_status === 'uploaded' ? 'text-teal-700' : 'text-amber-700'}`}>
                        {uploadResult.storage_status === 'uploaded' ? 'Uploaded ✓' : 'Not configured'}
                      </p>
                    </div>
                    {uploadResult.extraction_status && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-slate-400 font-medium">Extraction</p>
                        <p className="text-slate-700 capitalize">{uploadResult.extraction_status}</p>
                      </div>
                    )}
                    {uploadResult.extracted_character_count !== undefined && uploadResult.extracted_character_count !== null && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-slate-400 font-medium">Characters</p>
                        <p className="text-slate-700">{uploadResult.extracted_character_count.toLocaleString()}</p>
                      </div>
                    )}
                    {uploadResult.extracted_page_count !== undefined && uploadResult.extracted_page_count !== null && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-slate-400 font-medium">Pages</p>
                        <p className="text-slate-700">{uploadResult.extracted_page_count}</p>
                      </div>
                    )}
                    {uploadResult.personal_data_risk && (
                      <div className={`bg-white/60 rounded-lg p-2 ${uploadResult.personal_data_risk === 'possible' ? 'ring-1 ring-amber-300' : ''}`}>
                        <p className="text-slate-400 font-medium">Personal data risk</p>
                        <p className={`font-medium ${uploadResult.personal_data_risk === 'possible' ? 'text-amber-700' : 'text-teal-700'}`}>
                          {uploadResult.personal_data_risk === 'possible' ? 'Possible — review required' : 'Low'}
                        </p>
                      </div>
                    )}
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-slate-400 font-medium">Embedding</p>
                      <p className="text-amber-700 font-medium">{uploadResult.embedding_status ?? 'pending'}</p>
                    </div>
                    {uploadResult.registry_status && (
                      <div className={`bg-white/60 rounded-lg p-2 ${uploadResult.registry_status === 'failed' ? 'ring-1 ring-red-300' : ''}`}>
                        <p className="text-slate-400 font-medium">Registry</p>
                        <p className={`font-medium ${
                          uploadResult.registry_status === 'saved' ? 'text-teal-700' :
                          uploadResult.registry_status === 'failed' ? 'text-red-600' :
                          'text-amber-700'
                        }`}>
                          {uploadResult.registry_status === 'saved' ? 'Saved ✓' :
                           uploadResult.registry_status === 'failed' ? 'Failed' :
                           'Not configured'}
                        </p>
                      </div>
                    )}
                    {uploadResult.extraction_storage_status && (
                      <div className={`bg-white/60 rounded-lg p-2 ${uploadResult.extraction_storage_status === 'failed' ? 'ring-1 ring-red-300' : ''}`}>
                        <p className="text-slate-400 font-medium">Extraction stored</p>
                        <p className={`font-medium ${
                          uploadResult.extraction_storage_status === 'saved' ? 'text-teal-700' :
                          uploadResult.extraction_storage_status === 'failed' ? 'text-red-600' :
                          'text-amber-700'
                        }`}>
                          {uploadResult.extraction_storage_status === 'saved' ? 'Saved ✓' :
                           uploadResult.extraction_storage_status === 'failed' ? 'Failed' :
                           uploadResult.extraction_storage_status === 'skipped' ? 'Skipped' :
                           'Not configured'}
                        </p>
                      </div>
                    )}
                    {uploadResult.chunking_status && (
                      <div className={`bg-white/60 rounded-lg p-2 ${uploadResult.chunking_status === 'failed' ? 'ring-1 ring-red-300' : ''}`}>
                        <p className="text-slate-400 font-medium">Chunks</p>
                        <p className={`font-medium ${
                          uploadResult.chunking_status === 'prepared' ? 'text-teal-700' :
                          uploadResult.chunking_status === 'failed' ? 'text-red-600' :
                          uploadResult.chunking_status === 'no_text' ? 'text-amber-700' :
                          'text-amber-700'
                        }`}>
                          {uploadResult.chunking_status === 'prepared'
                            ? `${uploadResult.chunk_count ?? 0} prepared ✓`
                            : uploadResult.chunking_status === 'failed' ? 'Failed'
                            : uploadResult.chunking_status === 'no_text' ? 'No text'
                            : uploadResult.chunking_status === 'skipped' ? 'Skipped'
                            : 'Not configured'}
                        </p>
                      </div>
                    )}
                    {uploadResult.embedding_preparation_status && (
                      <div className={`bg-white/60 rounded-lg p-2 ${uploadResult.embedding_preparation_status === 'failed' ? 'ring-1 ring-red-300' : ''}`}>
                        <p className="text-slate-400 font-medium">Embedding records</p>
                        <p className={`font-medium ${
                          uploadResult.embedding_preparation_status === 'prepared' ? 'text-teal-700' :
                          uploadResult.embedding_preparation_status === 'already_prepared' ? 'text-teal-700' :
                          uploadResult.embedding_preparation_status === 'failed' ? 'text-red-600' :
                          'text-amber-700'
                        }`}>
                          {uploadResult.embedding_preparation_status === 'prepared'
                            ? `${uploadResult.embedding_record_count ?? 0} prepared ✓`
                            : uploadResult.embedding_preparation_status === 'already_prepared'
                            ? `${uploadResult.embedding_record_count ?? 0} already prepared`
                            : uploadResult.embedding_preparation_status === 'failed' ? 'Failed'
                            : uploadResult.embedding_preparation_status === 'skipped' ? 'Skipped'
                            : 'Not configured'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Registry error */}
                  {uploadResult.registry_status === 'not_configured' && (
                    <div className="bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-900">Document registry table is not configured</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Run <code className="font-mono">backend/sql/001_document_registry.sql</code> in Supabase SQL Editor, then re-upload.
                      </p>
                    </div>
                  )}
                  {uploadResult.registry_status === 'failed' && uploadResult.registry_error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-800 flex items-center gap-1">
                        <XCircle size={12} /> Registry save failed
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">{uploadResult.registry_error}</p>
                      {uploadResult.registry_error?.includes('001_document_registry.sql') && (
                        <p className="text-xs text-red-600 mt-1">
                          Run <code className="font-mono">backend/sql/001_document_registry.sql</code> in Supabase SQL Editor to create the table.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Personal data warnings */}
                  {uploadResult.personal_data_warnings && uploadResult.personal_data_warnings.length > 0 && (
                    <div className="bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                      <p className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                        <AlertTriangle size={12} /> Personal data warnings
                      </p>
                      {uploadResult.personal_data_warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-800">{w}</p>
                      ))}
                      <p className="text-[11px] text-amber-600 mt-1">
                        These are early warnings only and do not replace human review.
                      </p>
                    </div>
                  )}

                  {/* Extraction warnings */}
                  {uploadResult.extraction_warnings && uploadResult.extraction_warnings.length > 0 && (
                    <div className="space-y-1">
                      {uploadResult.extraction_warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Info size={10} className="shrink-0" />{w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Chunking note */}
                  {uploadResult.chunking_note && (
                    <div className="flex items-start gap-2 bg-teal-100/60 border border-teal-200 rounded-lg px-3 py-2">
                      <CheckCircle2 size={12} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-teal-800">{uploadResult.chunking_note}</p>
                    </div>
                  )}

                  {/* Embedding note */}
                  {uploadResult.embedding_note && (
                    <div className="flex items-start gap-2 bg-teal-100/60 border border-teal-200 rounded-lg px-3 py-2">
                      <CheckCircle2 size={12} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-teal-800">{uploadResult.embedding_note}</p>
                    </div>
                  )}

                  {/* Embedding table missing warning */}
                  {uploadResult.embedding_preparation_status === 'failed' && (
                    <div className="bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-900">Embedding records table not configured</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Run <code className="font-mono">backend/sql/005_document_embeddings.sql</code> in Supabase SQL Editor to enable embedding preparation.
                        AI answers remain disabled.
                      </p>
                    </div>
                  )}

                  {/* AI answers note */}
                  {uploadResult.ai_answers_note && (
                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <Info size={10} className="shrink-0 mt-0.5" />
                      {uploadResult.ai_answers_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {usingFallback && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Demo mode — showing sample data. Start the backend (<code className="font-mono">uvicorn app.main:app --reload</code>) to load the live registry.
              If the backend is running, ensure <code className="font-mono">backend/sql/001_document_registry.sql</code> has been run in Supabase SQL Editor.
            </span>
          </div>
        )}

        {/* DB configured but unavailable — backend up, table missing or DB error */}
        {!usingFallback && registrySource === 'demo_fallback' && registryWarning && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Database unavailable — showing demo sample data.{' '}
              {registryWarning.includes('001_document_registry.sql')
                ? <>Run <code className="font-mono">backend/sql/001_document_registry.sql</code> in Supabase SQL Editor to create the registry table, then refresh.</>
                : registryWarning}
            </span>
          </div>
        )}

        {/* Live registry — DB active and responding */}
        {!usingFallback && registrySource === 'database' && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-xs text-teal-700">
            <CheckCircle2 size={12} className="shrink-0" />
            <span>Live registry mode — showing documents saved in Supabase. Chunks prepared for future embedding. Embeddings and AI answers not enabled yet.</span>
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

        {/* Document safety semantics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Document safety flags explained</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <Users size={13} className="text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">Visible to staff</p>
                <p className="text-slate-400 mt-0.5">Status is Approved and the user&apos;s role matches access_roles (or &ldquo;All Staff&rdquo;). Visible in the Policy Library.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <Brain size={13} className="text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">Approved for AI answers</p>
                <p className="text-slate-400 mt-0.5">WorkTwin may use this document in RAG to answer staff questions. Only documents with this flag enabled feed the AI.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <Shield size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">Sensitive</p>
                <p className="text-slate-400 mt-0.5">Document covers sensitive topics. Staff can read it, but extra care is required when discussing or sharing its content.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">Escalation required</p>
                <p className="text-slate-400 mt-0.5">Any question touching this topic must be escalated to a human lead. The &ldquo;Ask WorkTwin&rdquo; CTA is blocked in the Policy Library.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 sm:col-span-2">
              <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">Human-only (AI answer disabled)</p>
                <p className="text-slate-400 mt-0.5">approved_for_ai_answers is false. This document will never be used to generate AI answers and will not be embedded. Applies to safeguarding, disciplinary, HR and other sensitive policy types.</p>
              </div>
            </div>
          </div>
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
                    <td colSpan={12} className="px-4 py-10 text-center">
                      {!usingFallback && registrySource === 'database' && docs.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">No persistent documents yet.</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Upload a dummy or sample PDF first. Sample demo records are no longer shown once the database registry is active.
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">No documents match the current filter.</span>
                      )}
                    </td>
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

                      {/* Embedding / Chunks */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ec.colour}`}>
                            {ec.label}
                          </span>
                          {typeof doc.metadata?.chunk_count === 'number' && (
                            <p className="text-[11px] text-slate-400 pl-1">{doc.metadata.chunk_count} chunks</p>
                          )}
                        </div>
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
            Embedding records are prepared per chunk (Milestone 4E). Embedding generation and the RAG pipeline are coming in <strong>Milestone 4F</strong>.
          </p>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Only documents listed here are used to answer staff questions. WorkTwin does not use the internet or external sources.
        </p>
      </div>
    </AppLayout>
  )
}
