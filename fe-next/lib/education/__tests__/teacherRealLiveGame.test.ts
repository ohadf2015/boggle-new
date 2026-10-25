import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { hasCompletedRealLiveGame } from '../teacherProMilestoneCounts';

function client(result: { count: number | null; error: { message: string } | null }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte']) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return { calls, db: { from: (t: string) => (calls.push(['from', t]), chain) } };
}

describe('hasCompletedRealLiveGame', () => {
  it('is true once the teacher has a completed round with at least two players', async () => {
    const { db, calls } = client({ count: 1, error: null });
    expect(await hasCompletedRealLiveGame('t1', db as never)).toBe(true);
    expect(calls).toContainEqual(['from', 'classroom_rounds']);
    expect(calls).toContainEqual(['eq', 'teacher_id', 't1']);
    expect(calls).toContainEqual(['gte', 'player_count', 2]);
  });

  it('is false with no such round (a solo self-test does not count)', async () => {
    const { db } = client({ count: 0, error: null });
    expect(await hasCompletedRealLiveGame('t1', db as never)).toBe(false);
  });

  it('fails closed to false on a read error or with no teacher', async () => {
    const { db } = client({ count: null, error: { message: 'relation does not exist' } });
    expect(await hasCompletedRealLiveGame('t1', db as never)).toBe(false);
    expect(await hasCompletedRealLiveGame('', db as never)).toBe(false);
  });
});
