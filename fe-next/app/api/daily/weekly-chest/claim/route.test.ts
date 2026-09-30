/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }))
vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 1600 }),
}))

import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import { POST } from './route'

// Fixed "today" so the live cycle is deterministic (real weeklyChest lib, not mocked:
// the routes and the shared loader must agree on real cycle math).
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-12T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const CYCLE = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12']
const PRIOR = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07']

const eqCalls: Array<[string, string, unknown]> = []
const req = () => new NextRequest('http://localhost/api/daily/weekly-chest/claim', { method: 'POST' })

interface Opts {
  user?: { id: string } | null
  hunt?: Array<{ puzzle_date: string; efficiency_score: number }>
  wheel?: Array<{ puzzle_date: string; score: number; time_seconds: number }>
  tower?: Array<{ puzzle_date: string }>
  connections?: Array<{ puzzle_date: string }>
  chests?: Array<Record<string, unknown>>
  insertResult?: { data: unknown; error: { code?: string; message: string } | null }
  updateRows?: Array<{ id: string }>
}

function setup(o: Opts = {}) {
  vi.mocked(getAuthedUser).mockResolvedValue((o.user === undefined ? { id: 'user-123' } : o.user) as never)
  const rows: Record<string, unknown[]> = {
    daily_word_hunt_attempts: o.hunt ?? [],
    daily_word_wheel_attempts: o.wheel ?? [],
    daily_word_tower_attempts: o.tower ?? [],
    connections_daily_scores: o.connections ?? [],
    daily_weekly_chests: o.chests ?? [],
  }
  const insert = vi.fn().mockResolvedValue(o.insertResult ?? { data: [{ id: 'new' }], error: null })
  const updateChain: any = {
    eq: vi.fn(() => updateChain),
    is: vi.fn(() => updateChain),
    select: vi.fn(() => Promise.resolve({ data: o.updateRows ?? [{ id: 'chest-existing' }], error: null })),
  }
  const update = vi.fn(() => updateChain)
  const engagementUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
  const admin = {
    from: vi.fn((table: string) => {
      if (table === 'player_engagement') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { streak_freezes_available: 0 }, error: null }) })) })),
          update: engagementUpdate,
        }
      }
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((c: string, v: unknown) => { eqCalls.push([table, c, v]); return chain }),
        gt: vi.fn(() => chain),
        then: (ok: any) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(ok),
        insert,
        update,
      }
      return chain
    }),
  }
  vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never)
  return { admin, insert, update, updateChain }
}

const hunt = (dates: string[], score = 900) => dates.map(d => ({ puzzle_date: d, efficiency_score: score }))

describe('POST /api/daily/weekly-chest/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
  })

  it('returns 401 when unauthenticated', async () => {
    setup({ user: null })
    const res = await POST(req())
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('authenticates with getAuthedUser and reads via the admin client scoped to user.id', async () => {
    setup({ user: { id: 'bearer-user' }, hunt: hunt(CYCLE) })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(getAuthedUser).toHaveBeenCalled()
    const scoped = eqCalls.filter(([, c]) => c === 'player_id')
    expect(scoped.length).toBeGreaterThanOrEqual(6)
    expect(scoped.every(([, , v]) => v === 'bearer-user')).toBe(true)
  })

  it('returns 500 when the admin client is unavailable', async () => {
    setup({ hunt: hunt(CYCLE) })
    vi.mocked(getSupabaseAdmin).mockReturnValue(null as never)
    const res = await POST(req())
    expect(res.status).toBe(500)
  })

  it('returns 400 when chest not claimable (< 7 days)', async () => {
    setup({ hunt: hunt(CYCLE.slice(0, 3)) })
    const res = await POST(req())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Chest not ready')
  })

  it('counts Word Tower and Connections days so a mixed week is claimable', async () => {
    setup({
      hunt: hunt(CYCLE.slice(0, 4)),
      tower: [{ puzzle_date: CYCLE[4] }, { puzzle_date: CYCLE[5] }],
      connections: [{ puzzle_date: CYCLE[6] }],
    })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect((await res.json()).cycleNumber).toBe(1)
  })

  it('grants an unclaimed prior-cycle chest even after a new week began', async () => {
    const { insert } = setup({ hunt: hunt([...PRIOR, '2026-05-12']) })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ cycle_start: '2026-05-01' }))
  })

  it('returns 409 when the chest is already claimed', async () => {
    setup({
      hunt: hunt(CYCLE),
      chests: [{ id: 'c1', cycle_start: '2026-05-06', opened_at: '2026-05-12T10:00:00Z', tier: 'gold', contents: {} }],
    })
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Already claimed')
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('claims gold, inserts a new row and awards coins', async () => {
    const { insert } = setup({ hunt: hunt(CYCLE, 900) })
    const res = await POST(req())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tier).toBe('gold')
    expect(json.coins).toBeGreaterThanOrEqual(500)
    expect(json.coins).toBeLessThanOrEqual(800)
    expect(json.badgeId).toBe('badge_weekly_gold')
    expect(json.variantId).toMatch(/^gold-/)
    expect(json.labelKey).toMatch(/^daily\.weeklyChest\.prize\./)
    expect(json.cycleNumber).toBe(1)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ player_id: 'user-123', cycle_start: '2026-05-06' }))
    expect(awardCoinsServer).toHaveBeenCalledWith(
      'user-123', json.coins, 'daily_weekly_chest',
      expect.objectContaining({ tier: 'gold', cycle_number: '1', variant_id: expect.stringMatching(/^gold-/) }),
    )
  })

  it('updates an existing unopened chest row instead of inserting, guarded on opened_at IS NULL', async () => {
    const { insert, update, updateChain } = setup({
      hunt: hunt(CYCLE, 550),
      chests: [{ id: 'chest-existing', cycle_start: '2026-05-06', opened_at: null, tier: 'bronze', contents: { coins: 150 } }],
    })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
    expect(updateChain.is).toHaveBeenCalledWith('opened_at', null)
    expect((await res.json()).tier).toBe('silver')
  })

  it('returns 409 and awards nothing when a concurrent claim already opened the row (update matched 0 rows)', async () => {
    setup({
      hunt: hunt(CYCLE),
      chests: [{ id: 'chest-existing', cycle_start: '2026-05-06', opened_at: null, tier: 'bronze', contents: {} }],
      updateRows: [],
    })
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('returns 409 and awards nothing on a unique-violation from a concurrent insert', async () => {
    setup({ hunt: hunt(CYCLE), insertResult: { data: null, error: { code: '23505', message: 'dup' } } })
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('returns 500 when saving the chest fails for another reason', async () => {
    setup({ hunt: hunt(CYCLE), insertResult: { data: null, error: { message: 'db down' } } })
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })
})
