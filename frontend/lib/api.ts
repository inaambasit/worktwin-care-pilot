// WorkTwin API helper — calls the FastAPI backend at NEXT_PUBLIC_API_URL.
// TODO (Milestone 4): Replace placeholder backend with real RAG pipeline that retrieves
// answers from approved company documents and returns source citations with confidence scores.

import type { AskRequest, AskResponse } from './types'

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
