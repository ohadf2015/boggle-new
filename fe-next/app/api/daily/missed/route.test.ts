import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { createClient } from '@/utils/supabase/server'
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

function makeSupabase(opts: { user?: { id: string } | null; solved?: string[] } = {}) {
  const huntResolved = { data: (opts.solved ?? []).map(d => ({ puzzle_date: d })), error: null }
  const huntChain: any = {
    eq: vi.fn(() => huntChain),
    then: (f: any) => Promise.resolve(huntResolved).then(f),
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: 'u1' } : opts.user },
        error: null,
      }),
    },
    from: vi.fn(() => ({ select: vi.fn().mockReturnValue(huntChain) })),
  }
}

describe('GET /api/daily/missed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T10:00:00Z')) // today = 2026-05-12
  })
  afterEach(() => vi.useRealTimers())

  it('returns an empty list for guests (no session)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as any)
    const res = await GET()
    const json = await res.json()
    expect(json.today).toBe('2026-05-12')
    expect(json.missed).toEqual([])
  })

  it('returns catch-up days the player has not completed, newest first', async () => {
    // Completed yesterday only → 05-10 and 05-09 remain missed.
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ solved: ['2026-05-11'] }) as any)
    const res = await GET()
    const json = await res.json()
    expect(json.missed.map((m: any) => m.date)).toEqual(['2026-05-10', '2026-05-09'])
    expect(json.missed[0].puzzleNumber).toBe(getPuzzleNumber('2026-05-10'))
  })

  it('returns all three when nothing in the window is completed', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ solved: [] }) as any)
    const res = await GET()
    const json = await res.json()
    expect(json.missed.map((m: any) => m.date)).toEqual(['2026-05-11', '2026-05-10', '2026-05-09'])
  })

  it('returns empty when every catch-up day is already done', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ solved: ['2026-05-11', '2026-05-10', '2026-05-09'] }) as any,
    )
    const res = await GET()
    const json = await res.json()
    expect(json.missed).toEqual([])
  })
})
