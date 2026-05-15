import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 1600 }),
}))

vi.mock('@/lib/daily/weeklyChest', () => ({
  computeCycleProgress: vi.fn(),
  computeChestTierForCycle: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import {
  computeCycleProgress,
  computeChestTierForCycle,
} from '@/lib/daily/weeklyChest'
import { POST } from './route'

// Helper to create a chainable mock for Supabase query builder
function createChainableMock(data: unknown) {
  const leaf = { data, error: null }
  const mock = {
    eq: vi.fn().mockReturnValue({
      ...leaf,
      eq: vi.fn().mockResolvedValue(leaf),
      gt: vi.fn().mockResolvedValue(leaf),
    }),
  }
  return mock
}

describe('POST /api/daily/weekly-chest/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('not authenticated'),
        }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)

    const res = await POST()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when chest not claimable (< 7 days completed)', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue(
          createChainableMock([])
        ),
      })),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.mocked(computeCycleProgress).mockReturnValue({
      cycleStart: '2026-05-06',
      cycleNumber: 1,
      completedDates: ['2026-05-06', '2026-05-07', '2026-05-08'],
      daysCompleted: 3,
      isClaimable: false,
    })

    const res = await POST()
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Chest not ready')
  })

  it('returns 409 when chest already claimed in current cycle', async () => {
    const chestData = [
      {
        id: 'chest-1',
        opened_at: '2026-05-12T10:00:00Z',
        tier: 'gold',
        contents: { coins: 600, badge_id: 'badge_weekly_gold' },
      },
    ]
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'daily_weekly_chests') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock(chestData)
            ),
          }
        }
        if (table === 'player_engagement') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { streak_freezes_available: 0 },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue(
            createChainableMock([])
          ),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.mocked(computeCycleProgress).mockReturnValue({
      cycleStart: '2026-05-06',
      cycleNumber: 1,
      completedDates: [
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
        '2026-05-09',
        '2026-05-10',
        '2026-05-11',
        '2026-05-12',
      ],
      daysCompleted: 7,
      isClaimable: true,
    })

    const res = await POST()
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Already claimed')
  })

  it('successfully claims chest, inserts new row, and awards coins', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'daily_word_hunt_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([
                { puzzle_date: '2026-05-06', efficiency_score: 85 },
                { puzzle_date: '2026-05-07', efficiency_score: 90 },
              ])
            ),
          }
        }
        if (table === 'daily_word_wheel_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([
                { puzzle_date: '2026-05-06', score: 2400, time_seconds: 45 },
                { puzzle_date: '2026-05-07', score: 2600, time_seconds: 50 },
              ])
            ),
          }
        }
        if (table === 'daily_puzzle_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([])
            ),
          }
        }
        if (table === 'daily_weekly_chests') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([])
            ),
            insert: vi.fn().mockResolvedValue({
              data: [{ id: 'chest-new', tier: 'gold' }],
              error: null,
            }),
          }
        }
        if (table === 'player_engagement') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { streak_freezes_available: 0 },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue(
            createChainableMock([])
          ),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.mocked(computeCycleProgress).mockReturnValue({
      cycleStart: '2026-05-06',
      cycleNumber: 1,
      completedDates: [
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
        '2026-05-09',
        '2026-05-10',
        '2026-05-11',
        '2026-05-12',
      ],
      daysCompleted: 7,
      isClaimable: true,
    })
    vi.mocked(computeChestTierForCycle).mockReturnValue({ weekScore: 75, tier: 'gold' })

    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tier).toBe('gold')
    // Prize pool varies the exact coin amount per variant — assert range, not exact.
    expect(json.coins).toBeGreaterThanOrEqual(500)
    expect(json.coins).toBeLessThanOrEqual(800)
    expect(json.badgeId).toBe('badge_weekly_gold')
    expect(json.variantId).toMatch(/^gold-/)
    expect(json.labelKey).toMatch(/^daily\.weeklyChest\.prize\./)
    expect(json.cycleNumber).toBe(1)
    expect(typeof json.freezes).toBe('number')

    expect(awardCoinsServer).toHaveBeenCalledWith(
      'user-123',
      json.coins,
      'daily_weekly_chest',
      expect.objectContaining({
        tier: 'gold',
        cycle_number: '1',
        variant_id: expect.stringMatching(/^gold-/),
      })
    )
  })

  it('updates existing chest row if it already exists but not yet opened', async () => {
    const existingChestId = 'chest-existing'
    const existingChest = [
      {
        id: existingChestId,
        opened_at: null,
        tier: 'bronze',
        contents: { coins: 150 },
      },
    ]
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'daily_word_hunt_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([{ puzzle_date: '2026-05-06', efficiency_score: 80 }])
            ),
          }
        }
        if (table === 'daily_word_wheel_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([])
            ),
          }
        }
        if (table === 'daily_puzzle_attempts') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock([])
            ),
          }
        }
        if (table === 'daily_weekly_chests') {
          return {
            select: vi.fn().mockReturnValue(
              createChainableMock(existingChest)
            ),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: existingChestId }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'player_engagement') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { streak_freezes_available: 0 },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue(
            createChainableMock([])
          ),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.mocked(computeCycleProgress).mockReturnValue({
      cycleStart: '2026-05-06',
      cycleNumber: 1,
      completedDates: [
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
        '2026-05-09',
        '2026-05-10',
        '2026-05-11',
        '2026-05-12',
      ],
      daysCompleted: 7,
      isClaimable: true,
    })
    vi.mocked(computeChestTierForCycle).mockReturnValue({ weekScore: 55, tier: 'silver' })

    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tier).toBe('silver')
    expect(json.coins).toBeGreaterThanOrEqual(250)
    expect(json.coins).toBeLessThanOrEqual(400)
    expect(json.variantId).toMatch(/^silver-/)

    expect(awardCoinsServer).toHaveBeenCalledWith(
      'user-123',
      json.coins,
      'daily_weekly_chest',
      expect.objectContaining({
        tier: 'silver',
        variant_id: expect.stringMatching(/^silver-/),
      })
    )
  })
})
