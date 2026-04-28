// Milestone 4S.2A — Server-side proxy for admin/document endpoints.
// ADMIN_TOKEN stays server-side; the browser never receives or sends it.
//
// SECURITY NOTE (interim): This proxy hides ADMIN_TOKEN from the browser bundle
// but does not add admin session auth. A later milestone must add real session
// protection before real users access the admin area.
import { NextRequest, NextResponse } from 'next/server'

// Allow up to 120 s on Vercel — generate-embeddings can take that long
export const maxDuration = 120

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? ''
const BACKEND_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ''

async function proxyHandler(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<NextResponse> {
  if (!ADMIN_TOKEN || !BACKEND_URL) {
    return NextResponse.json({ detail: 'Admin proxy not configured.' }, { status: 503 })
  }

  const backendPath = params.path.join('/')
  const backendUrl = `${BACKEND_URL}/${backendPath}${request.nextUrl.search}`

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  }
  // Forward Content-Type verbatim — multipart/form-data must include its boundary
  const contentType = request.headers.get('content-type')
  if (contentType) forwardHeaders['Content-Type'] = contentType

  // blob() forwards body without re-parsing, preserving multipart form boundaries
  const requestBody: BodyInit | null =
    request.method !== 'GET' ? await request.blob() : null

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: requestBody,
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable.' }, { status: 502 })
  }

  const responseBlob = await upstream.blob()
  return new NextResponse(responseBlob, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}

export const GET = proxyHandler
export const POST = proxyHandler
export const PATCH = proxyHandler
