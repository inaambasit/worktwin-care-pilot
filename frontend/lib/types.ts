// Types mirroring the FastAPI AskRequest / AskResponse Pydantic models.
// TODO (Milestone 4): Once RAG pipeline is connected, AskResponse will include
// real source document names, page references, and confidence scores.

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
