'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { fetchDocuments, approveDocument, archiveDocument, uploadDocumentPdf, generateEmbeddings, vectorSearchDocuments, answerDebug, updateDocumentGovernance } from '@/lib/api'
import type { DocumentRecord, DocumentStatus, EmbeddingStatus, UploadDocumentResult, GenerateEmbeddingsResult, VectorSearchResponse, AnswerDebugResponse, GovernanceUpdateRequest } from '@/lib/types'
import { LANGUAGE_NAMES } from '@/lib/types'
import {
  FileText, Upload, CheckCircle, Clock, AlertCircle, Users,
  AlertTriangle, Shield, Globe, Brain, Archive, RefreshCw,
  ShieldAlert, XCircle, Filter, ChevronDown, ChevronUp,
  Loader2, X, Info, CheckCircle2, Zap, Search, MessageSquare,
  ShieldCheck, ClipboardList, Lock, UserCheck,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample fallback data — mirrors the two sandbox indexed dummy documents only.
// Shown when the backend is unreachable. Does NOT represent the approved pilot
// document set. All entries are dummy/sample and carry no live actions.
// ---------------------------------------------------------------------------
const SAMPLE_DOCS: DocumentRecord[] = [
  {
    id: 'doc-fallback-001', organisation_id: 'demo-org',
    title: 'Escalation & Emergency Contact Pathway AI Extract',
    description: 'Illustrative sample only — not an approved pilot document. Mirrors the sandbox dummy extract used for admin embedding and retrieval testing.',
    file_name: 'thumhara-escalation-pathway-ai-extract-v0.1.pdf',
    file_type: 'pdf', file_size_bytes: 42000, storage_key: 'placeholder/demo-org/escalation-extract-v0.1.pdf',
    vertical: 'care', category: 'Escalation', tags: ['escalation', 'dummy'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '0.1', review_due_date: '2026-12-01',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2026-05-31T00:00:00Z', updated_at: '2026-05-31T00:00:00Z',
    dummy_document: true, real_document: false, metadata: {},
  },
  {
    id: 'doc-fallback-002', organisation_id: 'demo-org',
    title: 'Confidentiality & Information Handling AI Extract',
    description: 'Illustrative sample only — not an approved pilot document. Mirrors the sandbox dummy extract used for admin embedding and retrieval testing.',
    file_name: 'thumhara-confidentiality-ai-extract-v0.2.pdf',
    file_type: 'pdf', file_size_bytes: 38000, storage_key: 'placeholder/demo-org/confidentiality-extract-v0.2.pdf',
    vertical: 'care', category: 'Confidentiality', tags: ['confidentiality', 'dummy'], status: 'approved',
    access_roles: ['All Staff'], is_sensitive: false, escalation_required: false,
    approved_for_ai_answers: false, contains_personal_data_warning: false,
    primary_language: 'en', available_languages: ['en'], translation_status: 'not_required',
    human_review_required: true, version: '0.2', review_due_date: '2026-12-01',
    embedding_status: 'indexed', created_by: 'admin',
    created_at: '2026-05-31T00:00:00Z', updated_at: '2026-05-31T00:00:00Z',
    dummy_document: true, real_document: false, metadata: {},
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
  not_started: { label: 'Not indexed',  colour: 'bg-slate-100 text-slate-400' },
  pending:     { label: 'Pending',      colour: 'bg-amber-50 text-amber-600' },
  processing:  { label: 'Processing',   colour: 'bg-blue-50 text-blue-600' },
  indexed:     { label: 'Indexed ✓',    colour: 'bg-teal-50 text-teal-700' },
  partial:     { label: 'Partial ⚡',   colour: 'bg-blue-50 text-blue-600' },
  embedded:    { label: 'Embedded ✓',   colour: 'bg-teal-50 text-teal-700' },
  failed:      { label: 'Failed',       colour: 'bg-red-50 text-red-600' },
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

function computeGovernanceReadiness(doc: DocumentRecord): {
  canEmbed: boolean
  canAiTest: boolean
  canShowToStaff: boolean
  mainBlockedReason: string | null
} {
  const isReal = doc.real_document === true

  let canEmbed = false
  if (doc.is_sensitive) {
    canEmbed = false
  } else if (doc.escalation_required) {
    canEmbed = false
  } else if (isReal && !doc.approved_for_embedding) {
    canEmbed = false
  } else {
    canEmbed = true
  }

  let canAiTest = false
  if (doc.is_sensitive) {
    canAiTest = false
  } else if (doc.escalation_required) {
    canAiTest = false
  } else if (isReal && !doc.approved_for_source_grounded_answers) {
    canAiTest = false
  } else {
    canAiTest = true
  }

  let canShowToStaff = false
  if (doc.status !== 'approved') {
    canShowToStaff = false
  } else if (!doc.approved_for_staff_visibility) {
    canShowToStaff = false
  } else {
    canShowToStaff = true
  }

  let mainBlockedReason: string | null = null
  if (doc.is_sensitive) {
    mainBlockedReason = 'Document is marked sensitive and cannot be embedded or used for AI answers.'
  } else if (doc.escalation_required) {
    mainBlockedReason = 'Document requires escalation — embedding and AI answer use are permanently blocked.'
  } else if (isReal && !doc.approved_for_embedding && !doc.approved_for_source_grounded_answers) {
    mainBlockedReason = 'Real document requires governance approval before embedding or AI answer testing.'
  } else if (isReal && !doc.approved_for_embedding) {
    mainBlockedReason = 'Real document requires governance approval before embedding.'
  } else if (isReal && !doc.approved_for_source_grounded_answers) {
    mainBlockedReason = 'Real document requires governance approval before AI answer testing.'
  } else if (!canShowToStaff && doc.status !== 'approved') {
    mainBlockedReason = `Document status is '${doc.status}' — must be approved before staff visibility.`
  } else if (!canShowToStaff) {
    mainBlockedReason = 'Approval for staff visibility required.'
  }

  return { canEmbed, canAiTest, canShowToStaff, mainBlockedReason }
}

// ---------------------------------------------------------------------------
// RAG readiness badge — derived from governance + embedding fields
// ---------------------------------------------------------------------------

type RagBadgeResult = { label: string; colour: string; reason: string }

function computeRagBadge(doc: DocumentRecord): RagBadgeResult {
  const isReal = doc.real_document === true
  const isDummy = doc.dummy_document === true
  const isIndexed = doc.embedding_status === 'indexed'

  // Not a real document or explicitly marked dummy
  if (!isReal || isDummy) {
    return {
      label: isDummy ? 'Dummy' : 'Not real',
      colour: 'bg-slate-100 text-slate-500 border-slate-200',
      reason: isDummy
        ? 'Sample/test document — never eligible for staff RAG'
        : 'Not marked as a real document',
    }
  }

  // Sensitive or escalation-required — permanently human-only
  if (doc.is_sensitive || doc.escalation_required) {
    return {
      label: 'Human-only',
      colour: 'bg-orange-50 text-orange-700 border-orange-200',
      reason: doc.escalation_required
        ? 'Escalation required — AI answers permanently blocked'
        : 'Sensitive — human review required for all queries',
    }
  }

  // Staff RAG ready — all conditions must be met
  if (
    doc.status === 'approved' &&
    doc.approved_for_embedding === true &&
    doc.approved_for_source_grounded_answers === true &&
    doc.approved_for_staff_visibility === true &&
    isIndexed &&
    !!doc.governance_reviewed_by &&
    !!doc.governance_reviewed_at
  ) {
    return {
      label: 'Staff RAG ready',
      colour: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: `Reviewed by ${doc.governance_reviewed_by}`,
    }
  }

  // Admin-test only — AI-approved and indexed, but not staff-visible
  if (
    doc.approved_for_embedding === true &&
    doc.approved_for_source_grounded_answers === true &&
    doc.approved_for_staff_visibility !== true &&
    isIndexed
  ) {
    const reason =
      doc.status !== 'approved'
        ? `Status: ${doc.status} — must be approved for staff visibility`
        : !doc.governance_reviewed_by
        ? 'No reviewer recorded — required for staff /ask'
        : 'Staff visibility not yet approved'
    return {
      label: 'Admin-test only',
      colour: 'bg-amber-50 text-amber-700 border-amber-200',
      reason,
    }
  }

  // Embedded only — indexed but AI answer testing not yet approved
  if (doc.approved_for_embedding === true && isIndexed) {
    return {
      label: 'Embedded only',
      colour: 'bg-blue-50 text-blue-700 border-blue-200',
      reason: 'Indexed but not yet approved for AI answer testing',
    }
  }

  // Ready to embed — approved for embedding but not yet indexed
  if (doc.approved_for_embedding === true && !isIndexed) {
    const embState = doc.embedding_status ?? 'not_started'
    return {
      label: 'Ready to embed',
      colour: 'bg-violet-50 text-violet-700 border-violet-200',
      reason: `Approved for embedding · status: ${embState}`,
    }
  }

  // Policy library — staff can read it but AI answers are disabled
  if (doc.approved_for_staff_visibility === true) {
    return {
      label: 'Policy library',
      colour: 'bg-slate-100 text-slate-600 border-slate-300',
      reason: 'Visible to staff — AI answers not enabled',
    }
  }

  // Catch-all — real doc, no governance approvals yet
  return {
    label: 'Needs governance',
    colour: 'bg-slate-100 text-slate-400 border-slate-200',
    reason: 'Awaiting governance review before any RAG use',
  }
}

// ---------------------------------------------------------------------------
// Upload form state
// ---------------------------------------------------------------------------

interface UploadFormState {
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

  // Embedding generation state (keyed by doc id)
  const [embeddingGenState, setEmbeddingGenState] = useState<Record<string, {
    loading: boolean
    result?: GenerateEmbeddingsResult
    error?: string
  }>>({})

  // Upload form
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [form, setForm] = useState<UploadFormState>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadDocumentResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Vector Search Test state (admin/debug — Milestone 4G)
  const [showVectorSearch, setShowVectorSearch] = useState(false)
  const [vsQuery, setVsQuery] = useState('')
  const [vsMatchCount, setVsMatchCount] = useState(5)
  const [vsAllowDummy, setVsAllowDummy] = useState(true)
  const [vsLoading, setVsLoading] = useState(false)
  const [vsResult, setVsResult] = useState<VectorSearchResponse | null>(null)
  const [vsError, setVsError] = useState<string | null>(null)

  // Source-Grounded Answer Test state (admin/debug — Milestone 4H)
  const [showAnswerTest, setShowAnswerTest] = useState(false)
  const [atQuery, setAtQuery] = useState('')
  const [atMatchCount, setAtMatchCount] = useState(5)
  const [atAllowDummy, setAtAllowDummy] = useState(true)
  const [atLoading, setAtLoading] = useState(false)
  const [atResult, setAtResult] = useState<AnswerDebugResponse | null>(null)
  const [atError, setAtError] = useState<string | null>(null)

  // Document Governance state (Milestone 4I)
  const [showGovernance, setShowGovernance] = useState(false)
  const [govLoading, setGovLoading] = useState<string | null>(null)
  const [govError, setGovError] = useState<string | null>(null)
  const [govSuccess, setGovSuccess] = useState<string | null>(null)
  // Reviewer name input — keyed by doc id (Milestone 4S.10)
  const [reviewerInput, setReviewerInput] = useState<Record<string, string>>({})

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

  function canGenerateEmbeddings(doc: DocumentRecord): boolean {
    return !doc.is_sensitive
      && !doc.escalation_required
      && doc.status !== 'archived'
      && doc.real_document === true
      && doc.dummy_document !== true
      && doc.embedding_status !== 'indexed'
      && doc.embedding_status !== 'embedded'
  }

  async function handleGenerateEmbeddings(id: string) {
    setEmbeddingGenState(prev => ({ ...prev, [id]: { loading: true } }))
    try {
      const result = await generateEmbeddings(id, { allow_dummy_override: true, max_chunks: 20 })
      setEmbeddingGenState(prev => ({ ...prev, [id]: { loading: false, result } }))
      if (result.embedding_status) {
        setDocs(prev => prev.map(d =>
          d.id === id ? { ...d, embedding_status: result.embedding_status as EmbeddingStatus } : d
        ))
      }
    } catch (err) {
      setEmbeddingGenState(prev => ({
        ...prev,
        [id]: { loading: false, error: err instanceof Error ? err.message : 'Embedding generation failed.' },
      }))
    }
  }

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

  async function handleVectorSearch() {
    const q = vsQuery.trim()
    if (!q) { setVsError('Enter a query to test.'); return }
    setVsLoading(true)
    setVsResult(null)
    setVsError(null)
    try {
      const result = await vectorSearchDocuments({
        query: q,
        organisation_id: 'demo-org',
        match_count: vsMatchCount,
        allow_dummy_override: vsAllowDummy,
      })
      setVsResult(result)
    } catch (err) {
      setVsError(err instanceof Error ? err.message : 'Vector search failed.')
    } finally {
      setVsLoading(false)
    }
  }

  async function handleAnswerTest() {
    const q = atQuery.trim()
    if (!q) { setAtError('Enter a query to test.'); return }
    setAtLoading(true)
    setAtResult(null)
    setAtError(null)
    try {
      const result = await answerDebug({
        query: q,
        organisation_id: 'demo-org',
        match_count: atMatchCount,
        allow_dummy_override: atAllowDummy,
      })
      setAtResult(result)
    } catch (err) {
      setAtError(err instanceof Error ? err.message : 'Answer generation failed.')
    } finally {
      setAtLoading(false)
    }
  }

  async function handleGovernanceAction(docId: string, updates: GovernanceUpdateRequest) {
    setGovLoading(docId)
    setGovError(null)
    setGovSuccess(null)
    try {
      const updated = await updateDocumentGovernance(docId, updates)
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, ...updated } : d))
      setGovSuccess(`Governance updated for "${updated.title}".`)
    } catch (err) {
      setGovError(err instanceof Error ? err.message : 'Governance update failed.')
    } finally {
      setGovLoading(null)
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
              Controlled internal registry for policy upload, embedding, retrieval and source-grounded answer testing. Documents remain admin and testing only unless all pilot auth, document governance and staff-visibility gates are deliberately enabled.
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

        {/* Admin containment banner */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Admin document tools — controlled internal testing only</p>
            <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
              These tools are for controlled internal testing by product owners and admins only. No real staff are
              using this system yet. Approved policy, SOP and training PDFs may be uploaded for embedding and AI
              answer testing. Do not upload service-user records, care plans, MAR charts with names, staff HR or
              payroll files, safeguarding case notes, named complaints, or confidential third-party content unless
              licence and use is confirmed.
            </p>
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
                Do <strong>not</strong> upload: service-user records, care plans, MAR charts with names, staff HR or payroll files,
                safeguarding case notes, named complaints, or confidential third-party/QCS content unless licence and use is confirmed.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Uploading a document does <strong>not</strong> make it staff-visible or AI-answerable.
                Embedding approval, AI answer approval and staff visibility are separate gates that must be deliberately enabled.
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
              <strong>Illustrative sample data only</strong> — this does not reflect the approved pilot document set.
              In live use the registry shows only the sandbox indexed dummy documents (Escalation + Confidentiality extracts).
              Start the backend (<code className="font-mono">uvicorn app.main:app --reload</code>) to load the live registry.
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
            <span>Live registry mode — showing documents saved in Supabase. Admin-only vector search and source-grounded answer testing available. Staff-facing Ask only uses governed, approved, staff-visible, indexed documents when pilot auth and document gates are deliberately enabled; otherwise documents remain admin and testing only.</span>
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
                <p className="text-slate-400 mt-0.5">Enables this document for admin-only vector search and source-grounded answer testing. Staff-facing Ask only uses documents that also have staff visibility, embedding approval and pilot auth gates enabled.</p>
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
            <table className="w-full text-xs min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Document</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Vertical</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">RAG Status</th>
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
                    <td colSpan={13} className="px-4 py-10 text-center text-slate-400">Loading registry…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center">
                      {!usingFallback && registrySource === 'database' && docs.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">No persistent documents yet.</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Upload a document to get started. Real documents require governance approval before embedding or answer testing.
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
                  const ragBadge = computeRagBadge(doc)
                  const isLast = i === filtered.length - 1
                  const busy = actioning === doc.id
                  const isArchived = doc.status === 'archived'
                  const isDummyOrNotReal = doc.dummy_document === true || doc.real_document !== true
                  return (
                    <tr key={doc.id} className={`${isLast ? '' : 'border-b border-slate-50'} hover:bg-slate-50/40 transition-colors ${doc.status === 'archived' ? 'opacity-60' : ''}`}>
                      {/* Document */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800 whitespace-nowrap max-w-[220px] truncate" title={doc.title}>{doc.title}</p>
                            <p className="text-slate-400 text-[11px]">v{doc.version}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${doc.real_document ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                {doc.real_document ? 'Real' : 'Dummy'}
                              </span>
                              {doc.governance_status && doc.governance_status !== 'not_reviewed' && (
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                                  doc.governance_status === 'approved_for_ai' ? 'bg-teal-50 text-teal-600 border-teal-200' :
                                  doc.governance_status === 'approved_for_staff' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                  doc.governance_status === 'pilot_approved' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  doc.governance_status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200' :
                                  'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                  {doc.governance_status.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
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

                      {/* RAG Status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${ragBadge.colour}`}
                            title={ragBadge.reason}
                          >
                            {ragBadge.label}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-tight max-w-[160px]">{ragBadge.reason}</p>
                        </div>
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
                        <div className="space-y-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ec.colour}`}>
                            {ec.label}
                          </span>
                          {typeof doc.metadata?.chunk_count === 'number' && (
                            <p className="text-[11px] text-slate-400 pl-1">{doc.metadata.chunk_count} chunks</p>
                          )}

                          {/* Generate embeddings — governance-approved documents only */}
                          {canGenerateEmbeddings(doc) && !embeddingGenState[doc.id]?.result && (
                            <button
                              onClick={() => handleGenerateEmbeddings(doc.id)}
                              disabled={embeddingGenState[doc.id]?.loading || busy}
                              title="Generates vector embeddings for admin-only retrieval. Real documents require governance approval. Does not enable staff-facing AI answers."
                              className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-40 whitespace-nowrap"
                            >
                              {embeddingGenState[doc.id]?.loading ? (
                                <><Loader2 size={9} className="animate-spin shrink-0" />Generating…</>
                              ) : (
                                <><Zap size={9} className="shrink-0" />Generate embeddings</>
                              )}
                            </button>
                          )}

                          {/* Embedding generation result */}
                          {embeddingGenState[doc.id]?.result && (() => {
                            const r = embeddingGenState[doc.id]!.result!
                            const isNotConfigured = r.status === 'not_configured'
                            return (
                              <div className="text-[10px] space-y-0.5">
                                {isNotConfigured ? (
                                  <p className="text-amber-600 font-medium">OPENAI_API_KEY not set</p>
                                ) : (
                                  <>
                                    <p className={`font-medium ${(r.embedded_count ?? 0) > 0 ? 'text-teal-700' : 'text-slate-500'}`}>
                                      {(r.embedded_count ?? 0) > 0 ? `✓ ${r.embedded_count} embedded` : '0 embedded'}
                                      {(r.skipped_count ?? 0) > 0 ? `, ${r.skipped_count} skipped` : ''}
                                      {(r.failed_count ?? 0) > 0 ? `, ${r.failed_count} failed` : ''}
                                    </p>
                                    {r.api_error && (
                                      <p className="text-red-600 truncate max-w-[160px]" title={r.api_error}>{r.api_error}</p>
                                    )}
                                  </>
                                )}
                                <p className="text-slate-400 italic">Vector search only. AI answers still off.</p>
                              </div>
                            )
                          })()}

                          {/* Embedding generation error */}
                          {embeddingGenState[doc.id]?.error && (
                            <p className="text-[10px] text-red-600 max-w-[160px]" title={embeddingGenState[doc.id]!.error}>
                              {embeddingGenState[doc.id]!.error!.slice(0, 80)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        {isArchived ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">Archived</span>
                        ) : isDummyOrNotReal ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">Dummy / no live actions</span>
                        ) : (
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
                            <button
                              onClick={() => handleArchive(doc.id)}
                              disabled={busy}
                              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <Archive size={11} />
                              Archive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vector Search Test — Admin/debug only (Milestone 4G) */}
        <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => { setShowVectorSearch(s => !s); setVsResult(null); setVsError(null) }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-purple-50/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Search size={15} className="text-purple-600" />
              Vector Search Test
              <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                Admin/debug only
              </span>
            </span>
            {showVectorSearch ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {showVectorSearch && (
            <div className="border-t border-purple-100 p-5 space-y-4">

              {/* Warning */}
              <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-900">This tests retrieval only. It does not generate staff answers.</p>
                  <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">
                    Embeds the query and searches existing embedded chunks using pgvector cosine similarity.
                    No LLM is called. No answer is generated. The <code className="font-mono">/ask</code> endpoint is unchanged.
                    Real governed/approved documents may be used for admin-only testing. Sensitive and escalation documents remain blocked.
                  </p>
                </div>
              </div>

              {/* Query */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Query</label>
                <textarea
                  value={vsQuery}
                  onChange={e => setVsQuery(e.target.value)}
                  placeholder="e.g. What should staff do when administering medication?"
                  rows={2}
                  maxLength={500}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">{vsQuery.length}/500 characters</p>
              </div>

              {/* Match count + allow dummy */}
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Match count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={vsMatchCount}
                    onChange={e => setVsMatchCount(Math.max(1, Math.min(10, Number(e.target.value))))}
                    className="w-20 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                  <input
                    type="checkbox"
                    checked={vsAllowDummy}
                    onChange={e => setVsAllowDummy(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-400"
                  />
                  <span className="text-xs text-slate-600">Allow dummy/sample documents</span>
                </label>
              </div>

              {/* Submit */}
              <div>
                <button
                  onClick={handleVectorSearch}
                  disabled={vsLoading || !vsQuery.trim()}
                  className="flex items-center gap-2 text-sm font-semibold bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {vsLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Searching…</>
                  ) : (
                    <><Search size={14} /> Test vector search</>
                  )}
                </button>
              </div>

              {/* Error */}
              {vsError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p>{vsError}</p>
                    {vsError.includes('006_vector_search.sql') && (
                      <p className="mt-1 font-medium">
                        Run <code className="font-mono">backend/sql/006_vector_search.sql</code> in Supabase SQL Editor first.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {vsResult && (
                <div className="space-y-3">
                  {vsResult.status === 'not_configured' ? (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <p>OPENAI_API_KEY is not configured on the backend. Set it in Render environment variables (backend service only).</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-sm font-semibold ${(vsResult.result_count ?? 0) > 0 ? 'text-teal-700' : 'text-slate-500'}`}>
                          {vsResult.result_count ?? 0} result{(vsResult.result_count ?? 0) !== 1 ? 's' : ''} retrieved
                        </span>
                        {vsResult.query && (
                          <span className="text-xs text-slate-400">for &ldquo;{vsResult.query}&rdquo;</span>
                        )}
                      </div>

                      {vsResult.error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700">
                          <XCircle size={12} className="shrink-0 mt-0.5" />
                          <div>
                            <p>{vsResult.error}</p>
                            {vsResult.error.includes('006_vector_search.sql') && (
                              <p className="mt-1 font-medium">Run <code className="font-mono">backend/sql/006_vector_search.sql</code> in Supabase SQL Editor.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(vsResult.results ?? []).length === 0 && !vsResult.error && (
                        <p className="text-xs text-slate-400">
                          No matching chunks found. Make sure documents have been uploaded and embeddings generated
                          (use the <Zap size={11} className="inline text-indigo-500" /> Generate embeddings button in the table above), then try again.
                        </p>
                      )}

                      {(vsResult.results ?? []).map(item => (
                        <div key={item.chunk_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{item.document_title}</p>
                              <p className="text-[11px] text-slate-400">
                                Chunk {item.chunk_index} · {item.category} · {item.vertical}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-base font-bold ${item.similarity >= 0.7 ? 'text-teal-700' : item.similarity >= 0.4 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {(item.similarity * 100).toFixed(1)}%
                              </span>
                              <p className="text-[10px] text-slate-400">similarity</p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white border border-slate-100 rounded-lg px-3 py-2 whitespace-pre-wrap line-clamp-5">
                            {item.chunk_preview || '(no preview)'}
                          </p>

                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-full border ${item.approved_for_ai_answers ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {item.approved_for_ai_answers ? 'Approved for AI' : 'Not approved for AI'}
                            </span>
                            {item.escalation_required && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Escalation required
                              </span>
                            )}
                            {item.is_sensitive && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Sensitive
                              </span>
                            )}
                            {item.access_roles.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                {item.access_roles.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {vsResult.note && (
                        <p className="text-[11px] text-purple-600 flex items-center gap-1">
                          <Info size={10} className="shrink-0" />
                          {vsResult.note}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Governance — Admin only (Milestone 4I) */}
        <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => { setShowGovernance(s => !s); setGovError(null); setGovSuccess(null) }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-emerald-50/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClipboardList size={15} className="text-emerald-600" />
              Document Governance
              <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Admin only
              </span>
            </span>
            {showGovernance ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {showGovernance && (
            <div className="border-t border-emerald-100 p-5 space-y-4">

              {/* Info notice */}
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Governance gate — Milestone 4I</p>
                  <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                    Real documents must be explicitly approved before embedding or AI answer testing.
                    Sensitive and escalation-required documents remain blocked from AI use.
                    Governance-approved documents can be embedded and used for admin-only vector search and answer testing.
                    Uploading a document does not make it staff-visible or AI-answerable — embedding approval, AI answer approval and staff visibility are separate gates.
                    Staff-facing <code className="font-mono">/ask</code> only uses documents that are approved, indexed, staff-visible and governance-reviewed, and only when pilot auth gates are deliberately enabled.
                    Staff policy visibility requires <code className="font-mono">approved_for_staff_visibility=true</code>.
                  </p>
                </div>
              </div>

              {/* Real document readiness checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ClipboardList size={13} className="text-slate-500" />
                  Real document readiness checklist
                </p>
                <p className="text-[11px] text-slate-400">Guidance only — confirm all points before approving a real document for embedding or staff visibility.</p>
                <ul className="space-y-1">
                  {[
                    'Approved non-sensitive policy, SOP or training document only',
                    'No service-user records',
                    'No care plans',
                    'No MAR charts with names',
                    'No staff HR or payroll records',
                    'No safeguarding case notes',
                    'No named complaints',
                    'No confidential third-party/QCS content unless licence and use is confirmed',
                    'Human review completed before embedding',
                    'Human review completed before staff visibility',
                    'Document owner and source confirmed',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-0.5 shrink-0 text-slate-300">☐</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Success / Error */}
              {govSuccess && (
                <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-xs text-teal-700">
                  <CheckCircle2 size={13} className="shrink-0" />
                  {govSuccess}
                </div>
              )}
              {govError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{govError}</span>
                </div>
              )}

              {/* Document governance list */}
              {docs.length === 0 ? (
                <p className="text-xs text-slate-400">No documents in registry. Upload a PDF to get started.</p>
              ) : (
                <div className="space-y-3">
                  {docs.map(doc => {
                    const isSensOrEsc = doc.is_sensitive || doc.escalation_required
                    const isReal = doc.real_document === true
                    const isDummy = !isReal
                    const busy = govLoading === doc.id

                    const govStatusConfig: Record<string, { label: string; colour: string }> = {
                      not_reviewed: { label: 'Not reviewed', colour: 'bg-slate-100 text-slate-500 border-slate-200' },
                      pilot_approved: { label: 'Pilot approved', colour: 'bg-blue-50 text-blue-700 border-blue-200' },
                      approved_for_staff: { label: 'Approved for staff', colour: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                      approved_for_ai: { label: 'Approved for AI', colour: 'bg-teal-50 text-teal-700 border-teal-200' },
                      rejected: { label: 'Rejected', colour: 'bg-red-50 text-red-700 border-red-200' },
                      archived: { label: 'Archived', colour: 'bg-slate-100 text-slate-400 border-slate-200' },
                    }
                    const govSt = govStatusConfig[doc.governance_status ?? 'not_reviewed'] ?? govStatusConfig.not_reviewed
                    const ragBadge = computeRagBadge(doc)

                    return (
                      <div key={doc.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                        {/* Document header */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isReal ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {isReal ? 'Real document' : 'Dummy/sample'}
                              </span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${govSt.colour}`}>
                                {govSt.label}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${ragBadge.colour}`}
                                title={ragBadge.reason}
                              >
                                {ragBadge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{doc.file_name ?? '—'} · {doc.category}</p>
                            <p className="text-[10px] text-slate-400 italic mt-0.5">{ragBadge.reason}</p>
                          </div>
                          {isSensOrEsc && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 shrink-0">
                              <AlertTriangle size={10} />
                              {doc.is_sensitive ? 'Sensitive' : ''}{doc.is_sensitive && doc.escalation_required ? ' · ' : ''}{doc.escalation_required ? 'Escalation required' : ''}
                            </span>
                          )}
                        </div>

                        {/* Approval flags */}
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {[
                            { label: 'Embedding approved', value: doc.approved_for_embedding },
                            { label: 'AI test approved', value: doc.approved_for_source_grounded_answers },
                            { label: 'Staff visible', value: doc.approved_for_staff_visibility },
                          ].map(({ label, value }) => (
                            <span key={label} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${value ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {value ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                              {label}: {value ? 'Yes' : 'No'}
                            </span>
                          ))}
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${doc.requires_human_review_before_embedding !== false ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            <AlertTriangle size={9} />
                            Human review before embedding: {doc.requires_human_review_before_embedding !== false ? 'Required' : 'Not required'}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${doc.requires_human_review_before_staff_visibility !== false ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            <AlertTriangle size={9} />
                            Human review before staff visibility: {doc.requires_human_review_before_staff_visibility !== false ? 'Required' : 'Not required'}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${doc.governance_reviewed_by ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            <UserCheck size={9} />
                            Reviewer: {doc.governance_reviewed_by ?? 'Not set'}
                          </span>
                          {doc.governance_reviewed_at && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-violet-50 text-violet-600 border-violet-200">
                              <UserCheck size={9} />
                              Reviewed: {formatDate(doc.governance_reviewed_at)}
                            </span>
                          )}
                        </div>

                        {/* Governance readiness summary */}
                        {(() => {
                          const r = computeGovernanceReadiness(doc)
                          return (
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${r.canEmbed ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                {r.canEmbed ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                                Embed: {r.canEmbed ? 'Yes' : 'No'}
                              </span>
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${r.canAiTest ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                {r.canAiTest ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                                AI test: {r.canAiTest ? 'Yes' : 'No'}
                              </span>
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${r.canShowToStaff ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                {r.canShowToStaff ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                                Staff: {r.canShowToStaff ? 'Yes' : 'No'}
                              </span>
                              {r.mainBlockedReason && (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <AlertTriangle size={9} className="shrink-0" />
                                  {r.mainBlockedReason}
                                </span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-1.5">
                          {isReal && (
                            <button
                              onClick={() => handleGovernanceAction(doc.id, { dummy_document: true })}
                              disabled={busy}
                              className="flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : null}
                              Mark as dummy test document
                            </button>
                          )}
                          {isDummy && (
                            <button
                              onClick={() => handleGovernanceAction(doc.id, { real_document: true })}
                              disabled={busy}
                              className="flex items-center gap-1 text-[10px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : null}
                              Mark as real pilot document
                            </button>
                          )}
                          {!doc.approved_for_embedding && (
                            <button
                              onClick={() => { if (!isSensOrEsc) handleGovernanceAction(doc.id, { approved_for_embedding: true }) }}
                              disabled={busy || isSensOrEsc}
                              title={isSensOrEsc ? 'Blocked: document is sensitive or requires escalation. Cannot approve for embedding.' : 'Approve for embedding'}
                              className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${isSensOrEsc ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-emerald-700 hover:text-emerald-900 border-emerald-200 hover:border-emerald-400'}`}
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : isSensOrEsc ? <Lock size={9} /> : <CheckCircle size={9} />}
                              Approve for embedding
                            </button>
                          )}
                          {!doc.approved_for_source_grounded_answers && (
                            <button
                              onClick={() => { if (!isSensOrEsc) handleGovernanceAction(doc.id, { approved_for_source_grounded_answers: true }) }}
                              disabled={busy || isSensOrEsc}
                              title={isSensOrEsc ? 'Blocked: document is sensitive or requires escalation. Cannot approve for AI answer testing.' : 'Approve for source-grounded answer testing'}
                              className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${isSensOrEsc ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-teal-700 hover:text-teal-900 border-teal-200 hover:border-teal-400'}`}
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : isSensOrEsc ? <Lock size={9} /> : <Brain size={9} />}
                              Approve for AI test
                            </button>
                          )}
                          {!doc.approved_for_staff_visibility && (
                            <button
                              onClick={() => handleGovernanceAction(doc.id, { approved_for_staff_visibility: true })}
                              disabled={busy}
                              className="flex items-center gap-1 text-[10px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : <Users size={9} />}
                              Approve for staff visibility
                            </button>
                          )}
                          {doc.governance_status !== 'rejected' && (
                            <button
                              onClick={() => handleGovernanceAction(doc.id, { governance_status: 'rejected' })}
                              disabled={busy}
                              className="flex items-center gap-1 text-[10px] font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : <XCircle size={9} />}
                              Reject
                            </button>
                          )}
                        </div>

                        {/* Reviewer metadata — required for staff /ask RAG gate (Milestone 4S.10) */}
                        <div className="border-t border-slate-100 pt-2.5 space-y-2">
                          <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                            <UserCheck size={10} className="text-violet-500" />
                            Governance reviewer
                            <span className="font-normal text-slate-400">— required for staff /ask eligibility</span>
                          </p>
                          {doc.governance_reviewed_by ? (
                            <p className="text-[10px] text-slate-500">
                              Currently: <span className="font-medium text-slate-700">{doc.governance_reviewed_by}</span>
                              {doc.governance_reviewed_at ? ` · ${formatDate(doc.governance_reviewed_at)}` : ''}
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={9} className="shrink-0" />
                              Not set — document cannot qualify for staff /ask until a reviewer is recorded.
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Reviewer name (e.g. Shagufta Akram)"
                              value={reviewerInput[doc.id] ?? ''}
                              onChange={e => setReviewerInput(prev => ({ ...prev, [doc.id]: e.target.value }))}
                              className="flex-1 min-w-0 text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 placeholder:text-slate-300 disabled:opacity-50"
                              disabled={busy}
                            />
                            <button
                              onClick={() => {
                                const name = (reviewerInput[doc.id] ?? '').trim()
                                if (!name) return
                                handleGovernanceAction(doc.id, {
                                  governance_reviewed_by: name,
                                  governance_reviewed_at: new Date().toISOString(),
                                })
                              }}
                              disabled={busy || !(reviewerInput[doc.id] ?? '').trim()}
                              title={!(reviewerInput[doc.id] ?? '').trim() ? 'Enter a reviewer name first' : 'Set governance reviewer and record timestamp'}
                              className="flex items-center gap-1 text-[10px] font-medium text-violet-700 hover:text-violet-900 border border-violet-200 hover:border-violet-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
                            >
                              {busy ? <Loader2 size={9} className="animate-spin" /> : <UserCheck size={9} />}
                              Set reviewer
                            </button>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source-Grounded Answer Test — Admin/debug only (Milestone 4H) */}
        <div className="bg-white border border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => { setShowAnswerTest(s => !s); setAtResult(null); setAtError(null) }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-indigo-50/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquare size={15} className="text-indigo-600" />
              Source-Grounded Answer Test
              <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Admin/debug only
              </span>
            </span>
            {showAnswerTest ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {showAnswerTest && (
            <div className="border-t border-indigo-100 p-5 space-y-4">

              {/* Warning */}
              <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">This tests answer generation from retrieved chunks only. It is not enabled for staff.</p>
                  <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                    Retrieves relevant chunks using pgvector, then sends <em>only those chunks</em> to the answer model.
                    The model is instructed to answer from sources only — no general knowledge, no invented policy detail.
                    The <code className="font-mono">/ask</code> endpoint is unchanged. Real governed/approved documents may be tested here — admin-only.
                  </p>
                </div>
              </div>

              {/* Query */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Query</label>
                <textarea
                  value={atQuery}
                  onChange={e => setAtQuery(e.target.value)}
                  placeholder="e.g. What should this test document not contain?"
                  rows={2}
                  maxLength={500}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">{atQuery.length}/500 characters</p>
              </div>

              {/* Match count + allow dummy */}
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Match count (max 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={atMatchCount}
                    onChange={e => setAtMatchCount(Math.max(1, Math.min(5, Number(e.target.value))))}
                    className="w-20 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                  <input
                    type="checkbox"
                    checked={atAllowDummy}
                    onChange={e => setAtAllowDummy(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className="text-xs text-slate-600">Allow dummy/sample documents</span>
                </label>
              </div>

              {/* Submit */}
              <div>
                <button
                  onClick={handleAnswerTest}
                  disabled={atLoading || !atQuery.trim()}
                  className="flex items-center gap-2 text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {atLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating…</>
                  ) : (
                    <><MessageSquare size={14} /> Generate source-grounded test answer</>
                  )}
                </button>
              </div>

              {/* Error */}
              {atError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p>{atError}</p>
                    {atError.includes('006_vector_search.sql') && (
                      <p className="mt-1 font-medium">
                        Run <code className="font-mono">backend/sql/006_vector_search.sql</code> in Supabase SQL Editor first.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {atResult && (
                <div className="space-y-3">
                  {atResult.status === 'not_configured' ? (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <p>OPENAI_API_KEY is not configured on the backend. Set it in Render environment variables (backend service only).</p>
                    </div>
                  ) : (
                    <>
                      {/* Confidence badge */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                          atResult.confidence === 'source_grounded'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : atResult.confidence === 'blocked_safety'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {atResult.confidence === 'source_grounded' && <CheckCircle2 size={12} />}
                          {atResult.confidence === 'blocked_safety' && <AlertTriangle size={12} />}
                          {atResult.confidence === 'insufficient_sources' && <Info size={12} />}
                          {atResult.confidence === 'source_grounded' ? 'Source grounded'
                            : atResult.confidence === 'blocked_safety' ? 'Blocked — safety escalation'
                            : 'Insufficient sources'}
                        </span>
                        {atResult.result_count !== undefined && (
                          <span className="text-xs text-slate-400">{atResult.result_count} chunk{atResult.result_count !== 1 ? 's' : ''} used</span>
                        )}
                        {atResult.model && (
                          <span className="text-xs text-slate-400 font-mono">{atResult.model}</span>
                        )}
                      </div>

                      {/* Answer */}
                      {atResult.answer && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Answer</p>
                          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{atResult.answer}</p>
                        </div>
                      )}

                      {/* Safety note */}
                      {atResult.safety_note && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                          <p>{atResult.safety_note}</p>
                        </div>
                      )}

                      {/* Sources */}
                      {(atResult.sources ?? []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sources used</p>
                          {(atResult.sources ?? []).map(src => (
                            <div key={src.chunk_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <span className="text-xs font-bold text-indigo-700">{src.source_label}</span>
                                  <span className="text-xs text-slate-600 ml-1.5">{src.document_title}</span>
                                  <p className="text-[11px] text-slate-400">Chunk {src.chunk_index} · {src.category} · {src.vertical}</p>
                                </div>
                                <span className={`text-sm font-bold shrink-0 ${src.similarity >= 0.7 ? 'text-teal-700' : src.similarity >= 0.4 ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {(src.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white border border-slate-100 rounded-lg px-3 py-2 whitespace-pre-wrap line-clamp-4">
                                {src.source_preview || '(no preview)'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cost note */}
                      {atResult.estimated_cost_note && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Info size={10} className="shrink-0" />
                          {atResult.estimated_cost_note}
                        </p>
                      )}

                      {/* Admin note */}
                      {atResult.note && (
                        <p className="text-[11px] text-indigo-600 flex items-center gap-1">
                          <Info size={10} className="shrink-0" />
                          {atResult.note}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
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
            Embedding records are prepared per chunk (Milestone 4E). Governance-approved documents can be embedded for admin-only use
            (Milestone 4F — <Zap size={11} className="inline text-indigo-500" /> button in the Embedding column).{' '}
            Admin-only vector search (Milestone 4G/4I) and source-grounded answer testing (Milestone 4H/4J) are available above.{' '}
            <strong>Staff-facing Ask WorkTwin remains disabled from using RAG. Sensitive and escalation-required documents remain blocked.</strong>
          </p>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Admin-only answer testing uses only documents listed here. Staff-facing Ask WorkTwin does not use RAG. WorkTwin does not use the internet or external sources.
        </p>
      </div>
    </AppLayout>
  )
}
