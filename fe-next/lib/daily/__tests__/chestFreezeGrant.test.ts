import { describe, it, expect, vi } from 'vitest'
import { grantStreakFreezes } from '../chestFreezeGrant'

type Row = { streak_freezes_available: number } | null

function makeDb(opts: { row: Row; casMatches?: boolean[]; insertError?: { code?: string; message: string } | null }) {
  const casQueue = [...(opts.casMatches ?? [true])]
  const updates: Array<{ patch: unknown; guard: unknown }> = []
  const inserts: unknown[] = []
  let row = opts.row
  const db = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: row, error: null })) })),
      })),
      update: vi.fn((patch: unknown) => ({
        eq: vi.fn(() => ({
          eq: vi.fn((_c: string, guard: unknown) => ({
            select: vi.fn(async () => {
              updates.push({ patch, guard })
              const ok = casQueue.shift() ?? true
              if (!ok) row = { streak_freezes_available: (row?.streak_freezes_available ?? 0) + 1 }
              return { data: ok ? [{ player_id: 'p' }] : [], error: null }
            }),
          })),
        })),
      })),
      insert: vi.fn(async (v: unknown) => {
        inserts.push(v)
        return { error: opts.insertError ?? null }
      }),
    })),
  }
  return { db, updates, inserts }
}

describe('grantStreakFreezes', () => {
  it('increments with a compare-and-swap on the value it read', async () => {
    const { db, updates } = makeDb({ row: { streak_freezes_available: 2 } })
    expect(await grantStreakFreezes(db as never, 'p', 1)).toBe(true)
    expect(updates[0]).toEqual({ patch: { streak_freezes_available: 3 }, guard: 2 })
  })

  it('retries when a concurrent writer changed the count, then succeeds on the fresh value', async () => {
    const { db, updates } = makeDb({ row: { streak_freezes_available: 2 }, casMatches: [false, true] })
    expect(await grantStreakFreezes(db as never, 'p', 1)).toBe(true)
    expect(updates.map(u => u.guard)).toEqual([2, 3])
  })

  it('creates the engagement row when missing instead of skipping', async () => {
    const { db, inserts } = makeDb({ row: null })
    expect(await grantStreakFreezes(db as never, 'p', 2)).toBe(true)
    expect(inserts[0]).toEqual({ player_id: 'p', streak_freezes_available: 2 })
  })

  it('reports false when the row cannot be created', async () => {
    const { db } = makeDb({ row: null, insertError: { message: 'fk violation' } })
    expect(await grantStreakFreezes(db as never, 'p', 1)).toBe(false)
  })

  it('reports false after exhausting retries', async () => {
    const { db } = makeDb({ row: { streak_freezes_available: 0 }, casMatches: [false, false, false, false, false] })
    expect(await grantStreakFreezes(db as never, 'p', 1)).toBe(false)
  })
})
