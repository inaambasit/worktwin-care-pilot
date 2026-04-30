// Types mirroring the FastAPI Pydantic models.

// ---------------------------------------------------------------------------
// Ask endpoint
// ---------------------------------------------------------------------------

export interface AskSource {
  document_name: string
  section?: string
  page?: number
  source_label?: string
  source_preview?: string
}

export type RiskCategory =
  | 'standard'
  | 'medication'
  | 'safeguarding'
  | 'hr'
  | 'legal'
  | 'wellbeing'

export interface AskRequest {
  question: string
}

export interface AskResponse {
  answer: string
  next_steps: string[]
  sources: AskSource[]
  escalate_if: string[]
  learning_option?: string
  requires_escalation: boolean
  allowed_to_answer: boolean
  source_confidence?: number
  risk_category: RiskCategory
  anonymised_insight_topic?: string
  contact_routes?: string[]
}

// ---------------------------------------------------------------------------
// Document Registry (Milestone 4A)
// ---------------------------------------------------------------------------

export type DocumentStatus = 'draft' | 'approved' | 'under_review' | 'archived'
export type DocumentVertical =
  | 'care'
  | 'finance'
  | 'property'
  | 'recruitment'
  | 'healthcare_admin'
  | 'training_provider'
  | 'general'
  | 'custom'
export type EmbeddingStatus = 'not_started' | 'pending' | 'processing' | 'indexed' | 'partial' | 'embedded' | 'failed'
export type TranslationStatus = 'not_required' | 'pending' | 'in_progress' | 'complete'

export interface DocumentRecord {
  id: string
  organisation_id: string
  title: string
  description?: string
  file_name?: string
  file_type?: string
  file_size_bytes?: number
  storage_key?: string
  vertical: DocumentVertical
  category: string
  tags: string[]
  status: DocumentStatus
  access_roles: string[]
  is_sensitive: boolean
  escalation_required: boolean
  approved_for_ai_answers: boolean
  contains_personal_data_warning: boolean
  primary_language: string
  available_languages: string[]
  translation_status: TranslationStatus
  human_review_required: boolean
  version: string
  review_due_date?: string
  embedding_status: EmbeddingStatus
  extraction_status?: string
  extracted_character_count?: number | null
  extracted_page_count?: number | null
  personal_data_risk?: string
  personal_data_warnings?: string[]
  created_by: string
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
  // Milestone 4I — governance fields (optional; absent on pre-migration records)
  governance_status?: string
  governance_reviewed_by?: string | null
  governance_reviewed_at?: string | null
  governance_notes?: string | null
  real_document?: boolean
  dummy_document?: boolean
  source_owner?: string | null
  source_licence_notes?: string | null
  contains_qcs_or_third_party_content?: boolean
  requires_human_review_before_embedding?: boolean
  requires_human_review_before_staff_visibility?: boolean
  approved_for_embedding?: boolean
  approved_for_staff_visibility?: boolean
  approved_for_source_grounded_answers?: boolean
}

// ---------------------------------------------------------------------------
// Document list response (Milestone 4C.1)
// ---------------------------------------------------------------------------

export type RegistrySource = 'database' | 'demo_fallback'

export interface DocumentListResponse {
  documents: DocumentRecord[]
  registry_source: RegistrySource
  registry_warning: string | null
}

// ---------------------------------------------------------------------------
// Milestone 4B — PDF upload result
// ---------------------------------------------------------------------------

export interface UploadDocumentResult {
  upload_status?: 'success' | 'failed'
  storage_status: 'uploaded' | 'not_configured' | 'failed'
  registry_status?: 'saved' | 'failed' | 'not_configured'
  registry_error?: string
  document_id?: string
  file_name?: string
  file_size_bytes?: number
  storage_key?: string | null
  extraction_status?: 'success' | 'failed' | 'skipped'
  extraction_storage_status?: 'saved' | 'failed' | 'not_configured' | 'skipped'
  extraction_storage_error?: string
  extracted_text_preview?: string | null
  extracted_character_count?: number | null
  extracted_page_count?: number | null
  extraction_warnings?: string[]
  personal_data_risk?: 'low' | 'possible'
  personal_data_warnings?: string[]
  embedding_status?: string
  chunking_status?: 'prepared' | 'failed' | 'not_configured' | 'skipped' | 'no_text'
  chunking_error?: string
  chunk_count?: number
  chunking_note?: string
  embedding_preparation_status?: 'prepared' | 'already_prepared' | 'failed' | 'not_configured' | 'skipped'
  embedding_record_count?: number
  embedding_note?: string
  ai_answers_note?: string
  document?: DocumentRecord
  // 503 not-configured fields
  validation_passed?: boolean
  message?: string
}

// ---------------------------------------------------------------------------
// Milestone 4F — Embedding generation result
// ---------------------------------------------------------------------------

export interface GenerateEmbeddingsResult {
  document_id?: string
  status?: string
  embedding_model?: string
  embedding_dimensions?: number
  attempted_count?: number
  embedded_count?: number
  skipped_count?: number
  failed_count?: number
  total_tokens?: number
  estimated_cost_note?: string
  embedding_status?: string
  note?: string
  api_error?: string
}

// ---------------------------------------------------------------------------
// Milestone 4G — Vector search (admin/debug only, no AI answers)
// ---------------------------------------------------------------------------

export interface VectorSearchResultItem {
  document_id: string
  chunk_id: string
  document_title: string
  chunk_index: number
  similarity: number
  category: string
  vertical: string
  access_roles: string[]
  approved_for_ai_answers: boolean
  escalation_required: boolean
  is_sensitive: boolean
  chunk_preview: string
}

export interface VectorSearchResponse {
  query?: string
  organisation_id?: string
  match_count?: number
  result_count?: number
  results?: VectorSearchResultItem[]
  note?: string
  // present when OPENAI_API_KEY is not configured or on error
  status?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Milestone 4H — Source-grounded answer debug (admin/debug only)
// ---------------------------------------------------------------------------

export interface AnswerDebugSourceItem {
  source_label: string
  document_id: string
  chunk_id: string
  document_title: string
  chunk_index: number
  similarity: number
  category: string
  vertical: string
  source_preview: string
}

export type AnswerDebugConfidence = 'source_grounded' | 'insufficient_sources' | 'blocked_safety'

export interface AnswerDebugResponse {
  query?: string
  organisation_id?: string
  answer?: string
  confidence?: AnswerDebugConfidence
  result_count?: number
  sources?: AnswerDebugSourceItem[]
  safety_note?: string | null
  model?: string
  estimated_cost_note?: string | null
  note?: string
  // present when OPENAI_API_KEY is not configured
  status?: string
}

// ---------------------------------------------------------------------------
// Milestone 4I — Document governance update request
// ---------------------------------------------------------------------------

export interface GovernanceUpdateRequest {
  governance_status?: string
  real_document?: boolean
  dummy_document?: boolean
  governance_notes?: string
  governance_reviewed_by?: string
  governance_reviewed_at?: string
  source_owner?: string
  source_licence_notes?: string
  contains_qcs_or_third_party_content?: boolean
  approved_for_embedding?: boolean
  approved_for_staff_visibility?: boolean
  approved_for_source_grounded_answers?: boolean
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  pa: 'Punjabi',
  ar: 'Arabic',
  bn: 'Bengali',
  gu: 'Gujarati',
}
