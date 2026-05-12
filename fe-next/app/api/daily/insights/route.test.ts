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
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((k1: string, v1: string) => {
            if (k1 === 'player_id') {
              return {
                eq: vi.fn(() => ({
                  single: async () => ({ data: mockAttempt, error: null }),
                })),
                order: vi.fn(() => ({
                  limit: async () => ({ data: mockHistory, error: null }),
                })),
                gte: vi.fn(async () => ({ data: mockRecent, error: null })),
              }
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
})
