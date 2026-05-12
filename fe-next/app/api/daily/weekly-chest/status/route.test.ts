import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/supabase/server')

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

function makeMockSupabase(opts: {
  user?: { id: string } | null
  puzzleAttempts?: Array<{ puzzle_date: string }>
  huntAttempts?: Array<{ puzzle_date: string }>
  wheelAttempts?: Array<{ puzzle_date: string }>
  existingChests?: Array<{ tier: string; contents: any; opened_at: string | null }>
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
            eq: vi.fn().mockResolvedValue({
              data: opts.puzzleAttempts ?? [],
              error: null,
            }),
          }),
        }
      }
      if (table === 'daily_word_hunt_attempts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: opts.huntAttempts ?? [],
              error: null,
            }),
          }),
        }
      }
      if (table === 'daily_word_wheel_attempts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: opts.wheelAttempts ?? [],
              error: null,
            }),
          }),
        }
      }
      if (table === 'daily_weekly_chests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: opts.existingChests ?? [],
                  error: null,
                }),
              }),
          }),
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
