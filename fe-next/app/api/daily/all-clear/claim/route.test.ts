/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 100 }),
}))

import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import { rollDayPrize } from '@/lib/daily/dayPrize'
import { GET, POST } from './route'

const PRIZE = rollDayPrize('user-1', '2026-11-03', 'perfect')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const req = () => new NextRequest('http://localhost/api/daily/all-clear/claim', { method: 'POST' })

interface Opts {
  user?: { id: string } | null
  played?: Partial<Record<'hunt' | 'wheel' | 'tower' | 'connections', boolean>>
  insertError?: { code?: string; message: string } | null
  /** Education side: a teacher account or a classroom member. */
  edu?: 'teacher' | 'student' | null
}

function setup(o: Opts = {}) {
  vi.mocked(getAuthedUser).mockResolvedValue((o.user === undefined ? { id: 'user-1' } : o.user) as never)
  const played = { hunt: true, wheel: true, tower: true, connections: true, ...o.played }
  const byTable: Record<string, boolean> = {
    daily_word_hunt_attempts: played.hunt,
    daily_word_wheel_attempts: played.wheel,
    daily_word_tower_attempts: played.tower,
    connections_daily_scores: played.connections,
  }
  const extraRows: Record<string, unknown[]> = {
    profiles: [{ user_role: o.edu === 'teacher' ? 'teacher' : 'student' }],
    classroom_memberships: o.edu === 'student' ? [{ classroom_id: 'class-1' }] : [],
  }
  const insert = vi.fn().mockResolvedValue({ error: o.insertError ?? null })
  const delChain: any = { eq: vi.fn(() => delChain), then: (ok: any) => Promise.resolve({ error: null }).then(ok) }
  const del = vi.fn(() => delChain)
  const rpc = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => {
    const rows = extraRows[table] ?? (byTable[table] ? [{ puzzle_date: '2026-11-03' }] : [])
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (ok: any) => Promise.resolve({ data: rows, error: null }).then(ok),
    }
    // The claim table is written (insert / delete) and, by GET, read for today's open box.
    if (table === 'daily_all_clear_claims') return { ...chain, insert, delete: del }
    return chain
  })
  vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as never)
  return { insert, del, rpc, from }
}

describe('POST /api/daily/all-clear/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(awardCoinsServer).mockResolvedValue({ success: true, newBalance: 100 })
  })

  it('401 when signed out', async () => {
    setup({ user: null })
    expect((await POST(req())).status).toBe(401)
  })

  it('400 and no payout while a mode is unplayed', async () => {
    const { insert } = setup({ played: { tower: false } })
    const res = await POST(req())
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('pays the rolled perfect-day prize once when all four modes are played', async () => {
    const { insert, rpc } = setup()
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...PRIZE, fixed: false, claimed: true })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ player_id: 'user-1', claim_date: '2026-11-03' }))
    expect(awardCoinsServer).toHaveBeenCalledWith('user-1', PRIZE.coins, 'daily_all_clear', expect.anything())
    expect(rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'user-1', p_xp_amount: PRIZE.xp })
  })

  it('second claim the same day is a 200 with claimed:false and pays nothing', async () => {
    setup({ insertError: { code: '23505', message: 'dup' } })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...PRIZE, fixed: false, claimed: false })
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('reopens the day (deletes the claim row) when the coin grant fails, so a retry can pay', async () => {
    const { del } = setup()
    vi.mocked(awardCoinsServer).mockResolvedValue({ success: false, error: 'boom' })
    const res = await POST(req())
    expect(res.status).toBe(502)
    expect(del).toHaveBeenCalled()
  })

  it('Given a classroom student, When claiming, Then pays the fixed 50 coins (no roll) with the same XP', async () => {
    const { insert, rpc } = setup({ edu: 'student' })
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ coins: 50, tier: 'common', fixed: true, claimed: true, xp: PRIZE.xp })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ coins: 50 }))
    expect(awardCoinsServer).toHaveBeenCalledWith('user-1', 50, expect.any(String), expect.anything())
    expect(rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'user-1', p_xp_amount: PRIZE.xp })
  })

  it('Given a teacher account, When claiming, Then the prize is the fixed one too', async () => {
    setup({ edu: 'teacher' })
    expect(await (await POST(req())).json()).toMatchObject({ coins: 50, fixed: true })
  })

  it('Given a regular player, Then GET says the box is random; for the education side it says fixed', async () => {
    setup()
    expect(await (await GET(req())).json()).toEqual({ fixed: false, opened: null })
    setup({ edu: 'student' })
    expect(await (await GET(req())).json()).toEqual({ fixed: true, opened: null })
    setup({ user: null })
    expect((await GET(req())).status).toBe(401)
  })

  it('500 when the claim insert fails for another reason, nothing paid', async () => {
    setup({ insertError: { code: '42P01', message: 'no table' } })
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })
})
