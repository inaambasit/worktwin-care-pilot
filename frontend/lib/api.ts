// WorkTwin API helper — calls the FastAPI backend at NEXT_PUBLIC_API_URL.

import type { AskRequest, AskResponse, DocumentRecord } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function askWorktwin(question: string): Promise<AskResponse> {
  const payload: AskRequest = {
    organisation_id: 'demo-org',
    user_id: 'demo-user',
    user_role: 'care-worker',
    question,
  }

  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}): Promise<DocumentRecord[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.category) qs.set('category', params.category)
  if (params?.vertical) qs.set('vertical', params.vertical)
  const url = `${API_BASE_URL}/documents${qs.toString() ? `?${qs}` : ''}`
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord[]>
}

export async function fetchDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}

export async function approveDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/approve`, {
    method: 'POST',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}

export async function archiveDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/archive`, {
    method: 'POST',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<DocumentRecord>
}
