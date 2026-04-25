// Types mirroring the FastAPI Pydantic models.

// ---------------------------------------------------------------------------
// Ask endpoint
// ---------------------------------------------------------------------------

export interface AskSource {
  document_name: string
  section?: string
  page?: number
}

export type RiskCategory =
  | 'standard'
  | 'medication'
  | 'safeguarding'
  | 'hr'
  | 'legal'
  | 'wellbeing'

export interface AskRequest {
  organisation_id: string
  user_id: string
  user_role: string
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
export type EmbeddingStatus = 'not_started' | 'pending' | 'processing' | 'indexed' | 'failed'
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
  created_by: string
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
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
  extracted_text_preview?: string | null
  extracted_character_count?: number | null
  extracted_page_count?: number | null
  extraction_warnings?: string[]
  personal_data_risk?: 'low' | 'possible'
  personal_data_warnings?: string[]
  embedding_status?: string
  ai_answers_note?: string
  document?: DocumentRecord
  // 503 not-configured fields
  validation_passed?: boolean
  message?: string
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  pa: 'Punjabi',
  ar: 'Arabic',
  bn: 'Bengali',
  gu: 'Gujarati',
}
