// WorkTwin API helper — calls the FastAPI backend at NEXT_PUBLIC_API_URL.

import type { AskRequest, AskResponse, DocumentRecord, StaffPolicyRecord, DocumentListResponse, UploadDocumentResult, GenerateEmbeddingsResult, VectorSearchResponse, AnswerDebugResponse, GovernanceUpdateRequest } from './types'
import { getSupabaseAccessToken } from './supabase-browser'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'


export async function askWorktwin(question: string): Promise<AskResponse> {
  const payload: AskRequest = {
    question,
  }

  const token = await getSupabaseAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`WorkTwin API error: ${response.status}`)
  }

  return response.json() as Promise<AskResponse>
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Document Registry (Milestone 4A)
// ---------------------------------------------------------------------------

export async function fetchDocuments(params?: {
  status?: string
  category?: string
  vertical?: string
}): Promise<DocumentListResponse> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.category) qs.set('category', params.category)
  if (params?.vertical) qs.set('vertical', params.vertical)
  const url = `/api/admin/documents${qs.toString() ? `?${qs}` : ''}`
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentListResponse>
}

export async function fetchDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`/api/admin/documents/${id}`, {
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}

// ---------------------------------------------------------------------------
// Staff-safe policy library (Milestone 4A.1)
// Calls GET /policies — approved, role-visible documents only.
// ---------------------------------------------------------------------------

export async function fetchPolicies(params?: {
  vertical?: string
  category?: string
  language?: string
}): Promise<StaffPolicyRecord[]> {
  const qs = new URLSearchParams()
  if (params?.vertical) qs.set('vertical', params.vertical)
  if (params?.category) qs.set('category', params.category)
  if (params?.language) qs.set('language', params.language)
  const url = `${API_BASE_URL}/policies${qs.toString() ? `?${qs}` : ''}`
  const token = await getSupabaseAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(5_000) })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<StaffPolicyRecord[]>
}

export async function approveDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`/api/admin/documents/${id}/approve`, {
    method: 'POST',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}

export async function archiveDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`/api/admin/documents/${id}/archive`, {
    method: 'POST',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}

// ---------------------------------------------------------------------------
// Milestone 4B — Safe PDF upload
// Sends multipart form data to POST /documents/upload.
// Supabase keys are never exposed here — only the backend uses them.
// ---------------------------------------------------------------------------

export interface UploadDocumentParams {
  file: File
  title: string
  vertical: string
  category: string
  access_roles: string[]
  status: string
  is_sensitive: boolean
  escalation_required: boolean
  approved_for_ai_answers: boolean
  primary_language: string
  available_languages: string[]
  review_due_date?: string
  description?: string
  version?: string
}

export async function uploadDocumentPdf(params: UploadDocumentParams): Promise<UploadDocumentResult> {
  const form = new FormData()
  form.append('file', params.file)
  form.append('title', params.title)
  form.append('vertical', params.vertical)
  form.append('category', params.category)
  form.append('access_roles', params.access_roles.join(','))
  form.append('status', params.status)
  form.append('is_sensitive', String(params.is_sensitive))
  form.append('escalation_required', String(params.escalation_required))
  form.append('approved_for_ai_answers', String(params.approved_for_ai_answers))
  form.append('primary_language', params.primary_language)
  form.append('available_languages', params.available_languages.join(','))
  if (params.review_due_date) form.append('review_due_date', params.review_due_date)
  if (params.description) form.append('description', params.description)
  if (params.version) form.append('version', params.version)

  const response = await fetch('/api/admin/documents/upload', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  })

  const data = await response.json()

  // 503 = storage not configured — return structured data so the UI can explain it
  if (response.status === 503) {
    return data as UploadDocumentResult
  }

  if (!response.ok) {
    throw new Error(
      (data as { detail?: string }).detail ?? `Upload failed: ${response.status}`
    )
  }

  return data as UploadDocumentResult
}

// ---------------------------------------------------------------------------
// Milestone 4F — Controlled embedding generation (admin-only, backend calls OpenAI)
// OPENAI_API_KEY is never used or referenced in this file.
// ---------------------------------------------------------------------------

export async function generateEmbeddings(
  id: string,
  params: { allow_dummy_override?: boolean; max_chunks?: number } = {},
): Promise<GenerateEmbeddingsResult> {
  const body = {
    allow_dummy_override: params.allow_dummy_override ?? false,
    max_chunks: params.max_chunks ?? 20,
  }
  const response = await fetch(`/api/admin/documents/${id}/generate-embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { detail?: string }).detail ?? `Embedding generation failed: ${response.status}`)
  }
  return data as GenerateEmbeddingsResult
}

// ---------------------------------------------------------------------------
// Milestone 4G — Admin/debug vector search (no AI answers, no LLM calls)
// OPENAI_API_KEY is never used or referenced in this file.
// ---------------------------------------------------------------------------

export async function vectorSearchDocuments(params: {
  query: string
  organisation_id: string
  match_count?: number
  allow_dummy_override?: boolean
}): Promise<VectorSearchResponse> {
  const body = {
    query: params.query,
    organisation_id: params.organisation_id,
    match_count: params.match_count ?? 5,
    allow_dummy_override: params.allow_dummy_override ?? false,
  }
  const response = await fetch('/api/admin/documents/search-vector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { detail?: string }).detail ?? `Vector search failed: ${response.status}`)
  }
  return data as VectorSearchResponse
}

// ---------------------------------------------------------------------------
// Milestone 4H — Admin/debug source-grounded answer test
// OPENAI_API_KEY is never used or referenced in this file.
// This endpoint is admin/debug only — not wired to the staff /ask page.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Milestone 4I — Document governance update (admin-only)
// Calls PATCH /documents/{id}/governance — never enables /ask or staff features.
// ---------------------------------------------------------------------------

export async function updateDocumentGovernance(
  id: string,
  updates: GovernanceUpdateRequest,
): Promise<DocumentRecord> {
  const response = await fetch(`/api/admin/documents/${id}/governance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    signal: AbortSignal.timeout(15_000),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { detail?: string }).detail ?? `Governance update failed: ${response.status}`)
  }
  return data as DocumentRecord
}

export async function answerDebug(params: {
  query: string
  organisation_id: string
  match_count?: number
  allow_dummy_override?: boolean
}): Promise<AnswerDebugResponse> {
  const body = {
    query: params.query,
    organisation_id: params.organisation_id,
    match_count: params.match_count ?? 5,
    allow_dummy_override: params.allow_dummy_override ?? false,
  }
  const response = await fetch('/api/admin/documents/answer-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { detail?: string }).detail ?? `Answer debug failed: ${response.status}`)
  }
  return data as AnswerDebugResponse
}
