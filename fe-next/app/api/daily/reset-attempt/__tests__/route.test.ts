/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }))

import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/admin/server'
import { POST } from '../route'

const body = (o: Record<string, unknown>) =>
  new Request('http://localhost/api/daily/reset-attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzleDate: '2026-05-12', language: 'en', ...o }),
  })

function setup(o: { existing?: { id: string; extra_tries: number } | null; updated?: Array<{ id: string }>; updateError?: { message: string } | null } = {}) {
  const selectEqs: Array<[string, unknown]> = []
  const selectChain: any = {
    eq: vi.fn((k: string, v: unknown) => { selectEqs.push([k, v]); return selectChain }),
    maybeSingle: vi.fn().mockResolvedValue({ data: o.existing === undefined ? { id: 'a1', extra_tries: 1 } : o.existing, error: null }),
  }
  const updateChain: any = {
    eq: vi.fn(() => updateChain),
    select: vi.fn().mockResolvedValue({ data: o.updateError ? null : (o.updated ?? [{ id: 'a1' }]), error: o.updateError ?? null }),
  }
  const update = vi.fn(() => updateChain)
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => selectChain), update })),
  } as never)
  return { update, selectEqs }
}

describe('POST /api/daily/reset-attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'me' } as never)
  })

  it('rejects a playerId when the caller is not signed in', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null)
    setup()
    const res = await POST(body({ playerId: 'victim' }))
    expect(res.status).toBe(401)
  })

  it("rejects acting on another player's attempt", async () => {
    const { update } = setup()
    const res = await POST(body({ playerId: 'victim' }))
    expect(res.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
  })

  it('increments extra_tries for the signed-in player and reports the new count', async () => {
    const { update, selectEqs } = setup()
    const res = await POST(body({ playerId: 'me' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, extraTries: 2 })
    expect(update).toHaveBeenCalledWith({ extra_tries: 2 })
    expect(selectEqs).toContainEqual(['player_id', 'me'])
  })

  it('does not require auth for a guest fingerprint', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null)
    const { selectEqs } = setup()
    const res = await POST(body({ guestFingerprint: 'fp-1' }))
    expect(res.status).toBe(200)
    expect(selectEqs).toContainEqual(['guest_fingerprint', 'fp-1'])
  })

  it('reports failure (not success) when the update matched no row', async () => {
    setup({ updated: [] })
    const res = await POST(body({ playerId: 'me' }))
    expect(res.status).toBe(409)
    expect((await res.json()).success).toBe(false)
  })

  it('reports failure when the update errors', async () => {
    setup({ updateError: { message: 'denied' } })
    const res = await POST(body({ playerId: 'me' }))
    expect(res.status).toBe(500)
    expect((await res.json()).success).toBe(false)
  })

  it('treats a missing attempt as a fresh try', async () => {
    setup({ existing: null })
    const res = await POST(body({ playerId: 'me' }))
    expect(await res.json()).toEqual({ success: true, extraTries: 0 })
  })

  it('returns 503 when the admin client is unavailable', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null as never)
    const res = await POST(body({ playerId: 'me' }))
    expect(res.status).toBe(503)
  })
})
