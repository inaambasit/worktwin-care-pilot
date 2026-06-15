import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Mock the server Supabase client so verifyOtp / exchangeCodeForSession are
// observable and we never touch real Supabase.
const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: () => ({
    auth: { verifyOtp, exchangeCodeForSession },
  }),
}))

import { GET } from './route'

const ORIGIN = 'https://example.com'

function request(query: string): NextRequest {
  return { url: `${ORIGIN}/auth/callback${query}` } as unknown as NextRequest
}

function location(res: Response): string | null {
  return res.headers.get('location')
}

beforeEach(() => {
  verifyOtp.mockReset()
  exchangeCodeForSession.mockReset()
})

describe('GET /auth/callback — token_hash verifyOtp allowlist', () => {
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

  it('type=signup: fails closed (verifyOtp not called) -> /login?error=auth', async () => {
    const res = await GET(request('?token_hash=HASH&type=signup&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('type=invite: fails closed (verifyOtp not called) -> /login?error=auth', async () => {
    const res = await GET(request('?token_hash=HASH&type=invite&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('type=recovery: fails closed (verifyOtp not called) -> /login?error=auth', async () => {
    const res = await GET(request('?token_hash=HASH&type=recovery&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('unsupported/random type: fails closed (verifyOtp not called) -> /login?error=auth', async () => {
    const res = await GET(request('?token_hash=HASH&type=totally-made-up&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('valid type but verifyOtp errors: fails closed -> /login?error=auth', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'invalid token' } })
    const res = await GET(request('?token_hash=HASH&type=email&next=/dashboard'))
    expect(verifyOtp).toHaveBeenCalledTimes(1)
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('missing token_hash (type only): fails closed (verifyOtp not called)', async () => {
    const res = await GET(request('?type=email&next=/dashboard'))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/login?error=auth`)
  })

  it('missing type (token_hash only): fails closed (verifyOtp not called)', async () => {
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

describe('GET /auth/callback — ?code= PKCE path', () => {
  it('uses exchangeCodeForSession and redirects to next on success', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(request('?code=THECODE&next=/policies'))
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(exchangeCodeForSession).toHaveBeenCalledWith('THECODE')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe(`${ORIGIN}/policies`)
  })

  it('code exchange error falls through to /login?error=auth', async () => {
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
