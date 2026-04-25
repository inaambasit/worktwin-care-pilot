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

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  pa: 'Punjabi',
  ar: 'Arabic',
  bn: 'Bengali',
  gu: 'Gujarati',
}
