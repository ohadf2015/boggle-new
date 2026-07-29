import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

const req = (mode: string, date = '2026-05-12') =>
  new NextRequest(`http://localhost/api/daily/insights?mode=${mode}&date=${date}`)

describe('GET /api/daily/insights', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error() }) },
    } as never)
    expect((await GET(req('word_hunt'))).status).toBe(401)
  })

  it('returns empty insights when no today attempt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    expect(body.insights).toEqual([])
  })

  it('returns at most 3 insight cards', async () => {
    const mockAttempt = { efficiency_score: 95, solved: true, attempts_used: 1 }
    const mockHistory = [{ efficiency_score: 95 }, { efficiency_score: 60 }, { efficiency_score: 50 }]
    const mockRecent = [
      { efficiency_score: 60, puzzle_date: '2026-05-11' },
      { efficiency_score: 50, puzzle_date: '2026-05-10' },
      { efficiency_score: 55, puzzle_date: '2026-05-09' },
    ]
    const mockPeers = [{ efficiency_score: 95 }, { efficiency_score: 40 }]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((k1: string) => {
            if (k1 === 'player_id') {
              return {
                eq: vi.fn(() => ({
                  single: async () => ({ data: mockAttempt, error: null }),
                })),
                order: vi.fn(() => ({
                  limit: async () => ({ data: mockHistory, error: null }),
                })),
                gte: vi.fn(() => ({
                  order: vi.fn(async () => ({ data: mockRecent, error: null })),
                })),
              }
            }
            if (k1 === 'puzzle_date') {
              return { limit: async () => ({ data: mockPeers, error: null }) }
            }
            return {}
          }),
        })),
      })),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    expect(Array.isArray(body.insights)).toBe(true)
    expect(body.insights.length).toBeLessThanOrEqual(3)
  })

  it('returns percentile insight when user is in top 20%', async () => {
    // user score 90 beats 4 of 5 peers (incl self) → percentile = (4/5)*100 = 80 → top 20% → emit
    const mockAttempt = { efficiency_score: 90, solved: false, attempts_used: 4 }
    const mockHistory = [{ efficiency_score: 90 }, { efficiency_score: 60 }]
    const mockRecent: Array<{ efficiency_score: number; puzzle_date: string }> = []
    const mockPeers = [
      { efficiency_score: 90 },
      { efficiency_score: 50 },
      { efficiency_score: 40 },
      { efficiency_score: 30 },
      { efficiency_score: 20 },
    ]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((k1: string) => {
            if (k1 === 'player_id') {
              return {
                eq: vi.fn(() => ({ single: async () => ({ data: mockAttempt, error: null }) })),
                order: vi.fn(() => ({ limit: async () => ({ data: mockHistory, error: null }) })),
                gte: vi.fn(() => ({ order: vi.fn(async () => ({ data: mockRecent, error: null })) })),
              }
            }
            if (k1 === 'puzzle_date') {
              return { limit: async () => ({ data: mockPeers, error: null }) }
            }
            return {}
          }),
        })),
      })),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    const types = body.insights.map((i: { type: string }) => i.type)
    expect(types).toContain('percentile')
    const p = body.insights.find((i: { type: string }) => i.type === 'percentile')
    // top 20% — n should be ≤ 20
    expect(p.subParams.n).toBeLessThanOrEqual(20)
    expect(p.subParams.n).toBeGreaterThan(0)
  })

  it('skips percentile insight when user is below top 20%', async () => {
    // user score 30 beats only 1 of 5 peers → 80th percentile from bottom → not top 20
    const mockAttempt = { efficiency_score: 30, solved: false, attempts_used: 4 }
    const mockHistory: Array<{ efficiency_score: number }> = []
    const mockRecent: Array<{ efficiency_score: number; puzzle_date: string }> = []
    const mockPeers = [
      { efficiency_score: 90 },
      { efficiency_score: 80 },
      { efficiency_score: 70 },
      { efficiency_score: 60 },
      { efficiency_score: 30 },
      { efficiency_score: 20 },
    ]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((k1: string) => {
            if (k1 === 'player_id') {
              return {
                eq: vi.fn(() => ({ single: async () => ({ data: mockAttempt, error: null }) })),
                order: vi.fn(() => ({ limit: async () => ({ data: mockHistory, error: null }) })),
                gte: vi.fn(() => ({ order: vi.fn(async () => ({ data: mockRecent, error: null })) })),
              }
            }
            if (k1 === 'puzzle_date') {
              return { limit: async () => ({ data: mockPeers, error: null }) }
            }
            return {}
          }),
        })),
      })),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    const types = body.insights.map((i: { type: string }) => i.type)
    expect(types).not.toContain('percentile')
  })
})
