/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }))

// Fixed "today" so date-dependent assertions stay stable as real time advances
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-12T12:00:00Z'))
})
afterAll(() => {
  vi.useRealTimers()
})

import { NextRequest } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import { GET } from './route'

const eqCalls: Array<[string, string, unknown]> = []

// Table-driven admin-client mock. Every builder chains .eq/.gt to any depth and
// resolves on await; eq() calls are recorded so tests can assert user scoping.
function makeMockSupabase(opts: {
  user?: { id: string } | null
  puzzleAttempts?: Array<{ puzzle_date: string }>
  huntAttempts?: Array<{ puzzle_date: string; efficiency_score?: number }>
  wheelAttempts?: Array<{ puzzle_date: string }>
  towerAttempts?: Array<{ puzzle_date: string }>
  connectionsAttempts?: Array<{ puzzle_date: string }>
  frozenDates?: Array<{ frozen_date: string }>
  existingChests?: Array<{ cycle_start?: string; tier: string; contents: any; opened_at: string | null }>
} = {}) {
  const user = opts.user !== undefined ? opts.user : { id: 'user-1' }
  vi.mocked(getAuthedUser).mockResolvedValue(user as any)
  const rows: Record<string, unknown[]> = {
    daily_puzzle_attempts: opts.puzzleAttempts ?? [],
    daily_word_hunt_attempts: opts.huntAttempts ?? [],
    daily_word_wheel_attempts: opts.wheelAttempts ?? [],
    daily_word_tower_attempts: opts.towerAttempts ?? [],
    connections_daily_scores: opts.connectionsAttempts ?? [],
    daily_streak_freezes: opts.frozenDates ?? [],
    daily_weekly_chests: opts.existingChests ?? [],
  }
  const admin = {
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((c: string, v: unknown) => { eqCalls.push([table, c, v]); return chain }),
        gt: vi.fn(() => chain),
        then: (ok: any) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(ok),
      }
      return chain
    }),
  }
  vi.mocked(getSupabaseAdmin).mockReturnValue(admin as any)
  return admin
}

const req = () => new NextRequest('http://localhost/api/daily/weekly-chest/status')

describe('GET /api/daily/weekly-chest/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
  })

  it('returns 401 when unauthenticated', async () => {
    makeMockSupabase({ user: null })
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('a freeze bridges a single missed day so the cycle completes — and the frozen day does NOT pollute scoring', async () => {
    // Cycle ending today (2026-05-12): days 05-06..05-12. Played 6 of them
    // (missed 05-11) all at efficiency 900 → 90; a freeze row covers 05-11.
    makeMockSupabase({
        huntAttempts: [
          { puzzle_date: '2026-05-06', efficiency_score: 900 },
          { puzzle_date: '2026-05-07', efficiency_score: 900 },
          { puzzle_date: '2026-05-08', efficiency_score: 900 },
          { puzzle_date: '2026-05-09', efficiency_score: 900 },
          { puzzle_date: '2026-05-10', efficiency_score: 900 },
          { puzzle_date: '2026-05-12', efficiency_score: 900 },
        ],
        frozenDates: [{ frozen_date: '2026-05-11' }],
      })
    const res = await GET(req())
    const body = await res.json()
    expect(body.daysCompleted).toBe(7)
    expect(body.isClaimable).toBe(true)
    // Frozen day excluded from scoring: avg of the six played days (90), not
    // diluted to ~77 by counting the frozen day as a zero.
    expect(body.weekScore).toBe(90)
    expect(body.projectedTier).toBe('gold')
  })

  it('returns daysCompleted 0 when no attempts', async () => {
    makeMockSupabase()
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daysCompleted).toBe(0)
    expect(body.isClaimable).toBe(false)
    expect(body.pendingChest).toBe(null)
  })

  it('returns currentStreak as the full run (uncapped) and survives a grace day', async () => {
    // 10 consecutive days ending today (2026-05-12). daysCompleted clamps to the
    // 7-cycle, but currentStreak reports the real run (10) for the fire icon.
    const tenDays = Array.from({ length: 10 }, (_, i) => {
      const d = new Date('2026-05-03T00:00:00Z')
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
    makeMockSupabase({ huntAttempts: tenDays.map(d => ({ puzzle_date: d })) })
    const res = await GET(req())
    const body = await res.json()
    expect(body.currentStreak).toBe(10)
  })

  it('keeps currentStreak alive on a grace day (played through yesterday, not today)', async () => {
    // Played 05-08..05-11; today (05-12) not yet played. Streak must stay 4
    // while the chest cycle (today-anchored) shows no progress yet.
    makeMockSupabase({
        huntAttempts: ['2026-05-08','2026-05-09','2026-05-10','2026-05-11'].map(d => ({ puzzle_date: d })),
      })
    const res = await GET(req())
    const body = await res.json()
    expect(body.currentStreak).toBe(4)
    expect(body.daysCompleted).toBe(0)
  })

  it('returns daysCompleted 1 for single day attempt', async () => {
    const today = '2026-05-12'
    makeMockSupabase({
        puzzleAttempts: [{ puzzle_date: today }],
      })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daysCompleted).toBe(1)
    expect(body.cycleNumber).toBe(1)
    expect(body.cycleStart).toBe(today)
  })

  it('returns isClaimable true when 7 consecutive days completed', async () => {
    const dates = [
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
      '2026-05-10',
      '2026-05-11',
      '2026-05-12',
    ]
    makeMockSupabase({
        huntAttempts: dates.map((d) => ({ puzzle_date: d })),
      })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daysCompleted).toBe(7)
    expect(body.isClaimable).toBe(true)
  })

  it('combines attempts from all three daily modes', async () => {
    makeMockSupabase({
        puzzleAttempts: [{ puzzle_date: '2026-05-12' }],
        huntAttempts: [{ puzzle_date: '2026-05-11' }],
        wheelAttempts: [{ puzzle_date: '2026-05-10' }],
      })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.completedDates).toContain('2026-05-12')
    expect(body.completedDates).toContain('2026-05-11')
    expect(body.completedDates).toContain('2026-05-10')
  })

  it('returns pendingChest with tier and coins when claimable and chest exists', async () => {
    const today = '2026-05-12'
    const cycleStart = '2026-05-06'
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cycleStart)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })

    makeMockSupabase({
        huntAttempts: dates.map((d) => ({ puzzle_date: d })),
        existingChests: [
          {
            cycle_start: '2026-05-06',
            tier: 'gold',
            contents: { coins: 500, badge_id: 'badge-123' },
            opened_at: null,
          },
        ],
      })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isClaimable).toBe(true)
    expect(body.pendingChest).not.toBe(null)
    expect(body.pendingChest.tier).toBe('gold')
    expect(body.pendingChest.coins).toBe(500)
    expect(body.pendingChest.badgeId).toBe('badge-123')
  })

  it('surfaces an UNCLAIMED prior cycle even after a new week started', async () => {
    // Today is 2026-05-12. Player completed days 2026-05-01..2026-05-07 (a full
    // chest cycle) but never claimed it, and now days 2026-05-12 alone — the
    // streak from today only counts 1 day, but the prior chest is still owed.
    const priorCycle = [
      '2026-05-01','2026-05-02','2026-05-03','2026-05-04',
      '2026-05-05','2026-05-06','2026-05-07',
    ]
    makeMockSupabase({
        huntAttempts: [...priorCycle, '2026-05-12'].map(d => ({ puzzle_date: d })),
        // No chest row at all — never claimed.
        existingChests: [],
      })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isClaimable).toBe(true)
    expect(body.cycleStart).toBe('2026-05-01')
    expect(body.daysCompleted).toBe(7)
    expect(body.completedDates).toEqual(priorCycle)
  })

  it('falls back to in-progress cycle when prior cycle WAS claimed', async () => {
    const priorCycle = [
      '2026-05-01','2026-05-02','2026-05-03','2026-05-04',
      '2026-05-05','2026-05-06','2026-05-07',
    ]
    makeMockSupabase({
        huntAttempts: [...priorCycle, '2026-05-12'].map(d => ({ puzzle_date: d })),
        existingChests: [
          { cycle_start: '2026-05-01', tier: 'silver', contents: { coins: 250 }, opened_at: '2026-05-08T10:00:00Z' },
        ],
      })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isClaimable).toBe(false)
    expect(body.daysCompleted).toBe(1)
    expect(body.cycleStart).toBe('2026-05-12')
  })

  it('returns null pendingChest when already claimed (opened_at set)', async () => {
    const today = '2026-05-12'
    const cycleStart = '2026-05-06'
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cycleStart)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })

    makeMockSupabase({
        huntAttempts: dates.map((d) => ({ puzzle_date: d })),
        existingChests: [
          {
            cycle_start: '2026-05-06',
            tier: 'gold',
            contents: { coins: 500 },
            opened_at: '2026-05-12T10:00:00Z',
          },
        ],
      })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isClaimable).toBe(false)
    expect(body.pendingChest).toBe(null)
  })

  it('authenticates via getAuthedUser (bearer-capable) and reads with the admin client scoped to user.id', async () => {
    makeMockSupabase({ user: { id: 'bearer-user' }, huntAttempts: [{ puzzle_date: '2026-05-12' }] })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(getAuthedUser).toHaveBeenCalled()
    const tables = new Set(eqCalls.map(([t]) => t))
    expect(tables.size).toBeGreaterThanOrEqual(7)
    for (const [, col, val] of eqCalls.filter(([, c]) => c === 'player_id')) {
      expect(col).toBe('player_id')
      expect(val).toBe('bearer-user')
    }
  })

  it('returns 500 (not a silent empty chest) when the admin client is unavailable', async () => {
    makeMockSupabase()
    vi.mocked(getSupabaseAdmin).mockReturnValue(null as any)
    const res = await GET(req())
    expect(res.status).toBe(500)
  })

  it('counts Word Tower and Connections days toward the chest cycle', async () => {
    makeMockSupabase({
      towerAttempts: [{ puzzle_date: '2026-05-11' }],
      connectionsAttempts: [{ puzzle_date: '2026-05-12' }],
    })
    const res = await GET(req())
    const body = await res.json()
    expect(body.completedDates).toEqual(['2026-05-11', '2026-05-12'])
    expect(body.daysCompleted).toBe(2)
    expect(body.currentStreak).toBe(2)
  })

  it('tower/connections days do not dilute the tier score', async () => {
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    makeMockSupabase({
      huntAttempts: dates.slice(0, 5).map(d => ({ puzzle_date: d, efficiency_score: 900 })),
      towerAttempts: [{ puzzle_date: dates[5] }],
      connectionsAttempts: [{ puzzle_date: dates[6] }],
    })
    const body = await (await GET(req())).json()
    expect(body.isClaimable).toBe(true)
    expect(body.weekScore).toBe(90)
  })
})
