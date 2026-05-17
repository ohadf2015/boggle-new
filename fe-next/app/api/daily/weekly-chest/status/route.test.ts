import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }))
// @/ alias not resolved for transitive imports in node env; re-export real module
vi.mock('@/lib/daily/weeklyChest', () => import('../../../../../lib/daily/weeklyChest'))

// Fixed "today" so date-dependent assertions stay stable as real time advances
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-12T12:00:00Z'))
})
afterAll(() => {
  vi.useRealTimers()
})

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

function makeMockSupabase(opts: {
  user?: { id: string } | null
  puzzleAttempts?: Array<{ puzzle_date: string }>
  huntAttempts?: Array<{ puzzle_date: string }>
  wheelAttempts?: Array<{ puzzle_date: string }>
  existingChests?: Array<{ cycle_start?: string; tier: string; contents: any; opened_at: string | null }>
} = {}) {
  const user = opts.user !== undefined ? opts.user : { id: 'user-1' }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: new Error('Unauthorized') }
      ),
    },
    from: vi.fn((table: string) => {
      if (table === 'daily_puzzle_attempts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                data: opts.puzzleAttempts ?? [],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'daily_word_hunt_attempts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: opts.huntAttempts ?? [],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'daily_word_wheel_attempts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                data: opts.wheelAttempts ?? [],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'daily_weekly_chests') {
        // Route now does a single `.eq('player_id', …)` and awaits — so the
        // outer `.eq` itself must resolve. Keep `.eq().eq()` working as a
        // fallback for any caller still chaining.
        const resolved = { data: opts.existingChests ?? [], error: null }
        const thenable = {
          ...resolved,
          eq: vi.fn().mockResolvedValue(resolved),
          then: (onFulfilled: any) => Promise.resolve(resolved).then(onFulfilled),
        }
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(thenable) }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
        }),
      }
    }),
  }
}

describe('GET /api/daily/weekly-chest/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: null }) as any)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns daysCompleted 0 when no attempts', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daysCompleted).toBe(0)
    expect(body.isClaimable).toBe(false)
    expect(body.pendingChest).toBe(null)
  })

  it('returns daysCompleted 1 for single day attempt', async () => {
    const today = '2026-05-12'
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        puzzleAttempts: [{ puzzle_date: today }],
      }) as any
    )
    const res = await GET()
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
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        huntAttempts: dates.map((d) => ({ puzzle_date: d })),
      }) as any
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daysCompleted).toBe(7)
    expect(body.isClaimable).toBe(true)
  })

  it('combines attempts from all three daily modes', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        puzzleAttempts: [{ puzzle_date: '2026-05-12' }],
        huntAttempts: [{ puzzle_date: '2026-05-11' }],
        wheelAttempts: [{ puzzle_date: '2026-05-10' }],
      }) as any
    )
    const res = await GET()
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

    vi.mocked(createClient).mockResolvedValue(
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
      }) as any
    )

    const res = await GET()
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
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        huntAttempts: [...priorCycle, '2026-05-12'].map(d => ({ puzzle_date: d })),
        // No chest row at all — never claimed.
        existingChests: [],
      }) as any
    )
    const res = await GET()
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
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        huntAttempts: [...priorCycle, '2026-05-12'].map(d => ({ puzzle_date: d })),
        existingChests: [
          { cycle_start: '2026-05-01', tier: 'silver', contents: { coins: 250 }, opened_at: '2026-05-08T10:00:00Z' },
        ],
      }) as any
    )
    const res = await GET()
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

    vi.mocked(createClient).mockResolvedValue(
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
      }) as any
    )

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isClaimable).toBe(false)
    expect(body.pendingChest).toBe(null)
  })
})
