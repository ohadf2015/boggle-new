import { describe, it, expect, vi } from 'vitest'
import { loadChestActivity } from '../weeklyChestData'

type Rows = Record<string, unknown[]>

// Records every filter applied per table so tests can assert what counts.
function makeDb(rows: Rows) {
  const calls: Record<string, Array<[string, string, unknown]>> = {}
  const from = vi.fn((table: string) => {
    calls[table] = []
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, v: unknown) => { calls[table].push(['eq', col, v]); return chain }),
      gt: vi.fn((col: string, v: unknown) => { calls[table].push(['gt', col, v]); return chain }),
      then: (ok: any) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(ok),
    }
    return chain
  })
  return { db: { from } as any, calls }
}

describe('loadChestActivity', () => {
  it('counts Word Tower and Connections days but gives them no score rows', async () => {
    const { db } = makeDb({
      daily_word_hunt_attempts: [{ puzzle_date: '2026-05-10', efficiency_score: 900 }],
      daily_word_tower_attempts: [{ puzzle_date: '2026-05-11' }],
      connections_daily_scores: [{ puzzle_date: '2026-05-12' }],
      daily_streak_freezes: [{ frozen_date: '2026-05-09' }],
    })
    const a = await loadChestActivity(db, 'u1')
    expect([...a.allDates].sort()).toEqual(['2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12'])
    expect(a.huntRows).toHaveLength(1)
    expect(a.wheelRows).toHaveLength(0)
    expect(a.puzzleRows).toHaveLength(0)
  })

  it('only counts finished tower/connections attempts for this user', async () => {
    const { db, calls } = makeDb({})
    await loadChestActivity(db, 'u1')
    expect(calls.daily_word_tower_attempts).toEqual(
      expect.arrayContaining([['eq', 'player_id', 'u1'], ['gt', 'best_height_m', 0]]),
    )
    expect(calls.connections_daily_scores).toEqual(
      expect.arrayContaining([['eq', 'player_id', 'u1'], ['gt', 'puzzles_solved', 0]]),
    )
    expect(calls.daily_word_hunt_attempts).toEqual(
      expect.arrayContaining([['eq', 'player_id', 'u1'], ['eq', 'solved', true], ['eq', 'is_catchup', false]]),
    )
  })

  it('throws when a query errors, so routes never silently under-count', async () => {
    const db: any = {
      from: () => {
        const chain: any = {
          select: () => chain, eq: () => chain, gt: () => chain,
          then: (ok: any) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok),
        }
        return chain
      },
    }
    await expect(loadChestActivity(db, 'u1')).rejects.toThrow('boom')
  })
})
