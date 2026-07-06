import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Mock @supabase/ssr directly. The callback route builds its own Supabase
// client with createServerClient, so mocking the older server helper would not
// exercise the real callback code path.
const { verifyOtp, exchangeCodeForSession, createServerClient } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}))

import { GET } from './route'

const ORIGIN = 'https://example.com'

function request(query: string): NextRequest {
  return {
    url: `${ORIGIN}/auth/callback${query}`,
    cookies: {
      getAll: () => [],
    },
  } as unknown as NextRequest
}

function location(res: Response): string | null {
  return res.headers.get('location')
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

  verifyOtp.mockReset()
  exchangeCodeForSession.mockReset()
  createServerClient.mockReset()

  createServerClient.mockReturnValue({
    auth: { verifyOtp, exchangeCodeForSession },
  })
})

describe('GET /auth/callback - token_hash verifyOtp allowlist', () => {
  it('type=email: calls verifyOtp with type=email and redirects to next', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(request('?token_hash=HASH&type=email&next=/dashboard'))
    expect(verifyOtp).toHaveBeenCalledTimes(1)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'HASH', type: 'email' })
    expect(location(res)).toBe(`${ORIGIN}/dashboard`)
  })

  it('type=magiclink: calls verifyOtp with type=magiclink and redirects to next', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(request('?token_hash=HASH&type=magiclink&next=/notes'))
    expect(verifyOtp).toHaveBeenCalledTimes(1)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'HASH', type: 'magiclink' })
    expect(location(res)).toBe(`${ORIGIN}/notes`)
  })

  it('type=signup: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?token_hash=HASH&type=signup&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('type=invite: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?token_hash=HASH&type=invite&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('type=recovery: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?token_hash=HASH&type=recovery&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('unsupported/random type: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?token_hash=HASH&type=totally-made-up&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('valid type but verifyOtp errors: fails closed', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'invalid token' } })
    const res = await GET(request('?token_hash=HASH&type=email&next=/dashboard'))
    expect(verifyOtp).toHaveBeenCalledTimes(1)
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('missing token_hash: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?type=email&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('missing type: fails closed and verifyOtp is not called', async () => {
    const res = await GET(request('?token_hash=HASH&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('unsafe next is sanitized to /dashboard on token_hash success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(request('?token_hash=HASH&type=email&next=https://evil.example/steal'))
    expect(location(res)).toBe(`${ORIGIN}/dashboard`)
  })

  it('non-staff-root next is sanitized to /dashboard on token_hash success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(request('?token_hash=HASH&type=email&next=/admin/documents'))
    expect(location(res)).toBe(`${ORIGIN}/dashboard`)
  })
})

describe('GET /auth/callback - code PKCE path', () => {
  it('uses exchangeCodeForSession and redirects to next on success', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(request('?code=THECODE&next=/policies'))
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(exchangeCodeForSession).toHaveBeenCalledWith('THECODE')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/policies`)
  })

  it('code exchange error fails closed', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } })
    const res = await GET(request('?code=BADCODE&next=/dashboard'))
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('unsafe next is sanitized to /dashboard on code success', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(request('?code=THECODE&next=https://evil.example'))
    expect(location(res)).toBe(`${ORIGIN}/dashboard`)
  })
})
