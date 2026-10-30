/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }))

import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/admin/server'
import { createClient } from '@/utils/supabase/server'
import logger from '@/utils/logger'
import { GET, POST } from '../route'

beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-05-12T12:00:00Z')) })
afterAll(() => vi.useRealTimers())

const TOKEN_ROW = { id: 't1', expires_at: '2026-05-12T23:00:00Z', puzzle_date: '2026-05-12', language: 'en', use_count: 0 }

const post = (o: Record<string, unknown>) =>
  new Request('http://localhost/api/daily/validate-retry-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'tok', ...o }),
  })

function setup(o: { rpcError?: { message: string } | null; deleted?: Array<{ id: string }>; deleteError?: { message: string } | null } = {}) {
  const tokenSelect = vi.fn()
  // Token rows are admin-only under RLS; the anon/cookie client must never be used to read them.
  vi.mocked(createClient).mockRejectedValue(new Error('anon client must not read retry tokens'))
  const eqs: Array<[string, unknown]> = []
  const delChain: any = {
    eq: vi.fn((k: string, v: unknown) => { eqs.push([k, v]); return delChain }),
    select: vi.fn().mockResolvedValue({ data: o.deleteError ? null : (o.deleted ?? [{ id: 'a1' }]), error: o.deleteError ?? null }),
  }
  const del = vi.fn(() => delChain)
  const rpc = vi.fn().mockResolvedValue({ error: o.rpcError ?? null })
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from: vi.fn(() => ({
      select: (cols: string) => { tokenSelect(cols); return { eq: () => ({ single: async () => ({ data: TOKEN_ROW, error: null }) }) } },
      delete: del,
    })),
    rpc,
  } as never)
  return { del, eqs, rpc, tokenSelect }
}

describe('POST /api/daily/validate-retry-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'me' } as never)
  })

  it('rejects a playerId when the caller is not signed in', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null)
    const { del } = setup()
    const res = await POST(post({ playerId: 'victim' }))
    expect(res.status).toBe(401)
    expect(del).not.toHaveBeenCalled()
  })

  it("rejects deleting another player's attempt even with a valid token", async () => {
    const { del } = setup()
    const res = await POST(post({ playerId: 'victim' }))
    expect(res.status).toBe(403)
    expect(del).not.toHaveBeenCalled()
  })

  it('deletes the signed-in player attempt and reports the count (admin-link flow)', async () => {
    const { eqs, rpc } = setup()
    const res = await POST(post({ playerId: 'me' }))
    const json = await res.json()
    expect(json).toMatchObject({ success: true, attemptsReset: 1, puzzleDate: '2026-05-12', language: 'en' })
    expect(eqs).toContainEqual(['player_id', 'me'])
    expect(rpc).toHaveBeenCalledWith('increment_retry_token_use_count', { token_id: 't1' })
  })

  it('still resets a guest by fingerprint without auth', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null)
    const { eqs } = setup()
    const res = await POST(post({ guestFingerprint: 'fp-1' }))
    expect((await res.json()).success).toBe(true)
    expect(eqs).toContainEqual(['guest_fingerprint', 'fp-1'])
  })

  it('surfaces a delete error as a failure instead of success:true', async () => {
    setup({ deleteError: { message: 'denied' } })
    const res = await POST(post({ playerId: 'me' }))
    expect(res.status).toBe(500)
    expect((await res.json()).success).toBe(false)
  })

  it('logs an error when the use-count RPC fails but does not block a shared link', async () => {
    setup({ rpcError: { message: 'function does not exist' } })
    const res = await POST(post({ playerId: 'me' }))
    expect((await res.json()).success).toBe(true)
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('GET /api/daily/validate-retry-token', () => {
  it('selects only the columns it returns, not *', async () => {
    const { tokenSelect } = setup()
    await GET(new Request('http://localhost/api/daily/validate-retry-token?token=tok'))
    expect(tokenSelect).toHaveBeenCalled()
    expect(tokenSelect.mock.calls[0][0]).not.toBe('*')
  })

  it('reads the token with the service-role client', async () => {
    setup()
    const res = await GET(new Request('http://localhost/api/daily/validate-retry-token?token=tok'))
    expect((await res.json()).valid).toBe(true)
  })
})
