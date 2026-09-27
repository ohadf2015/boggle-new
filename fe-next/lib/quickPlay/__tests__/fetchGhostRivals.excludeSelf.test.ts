/**
 * Ghost rivals are drawn from the most recent `quick_play_results` rows for a
 * mode. Nothing excluded the REQUESTING player, so the player raced their own
 * past runs under their own display name ("+91 pts to beat <your name>").
 *
 * Filtering in SQL rather than after the fetch is deliberate: the candidate
 * window is a fixed 120 rows, and a player's own rows are the most recent ones
 * precisely because they are the one playing — post-filtering would spend the
 * whole budget on rows it then throws away, leaving few or no real rivals.
 *
 * Written BEFORE implementation (RED phase).
 */
import { describe, it, expect, vi } from 'vitest';

import { fetchGhostRivals } from '../fetchGhostRivals';

/** Chainable Supabase-query stub that records the filters applied. */
function makeDb(resultsRows: any[], profileRows: any[] = []) {
  const calls: Array<{ table: string; neq: Array<[string, unknown]> }> = [];

  const from = vi.fn((table: string) => {
    const entry = { table, neq: [] as Array<[string, unknown]> };
    calls.push(entry);
    const rows = table === 'quick_play_results' ? resultsRows : profileRows;
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      in: () => Promise.resolve({ data: rows, error: null }),
      order: () => builder,
      neq: (col: string, val: unknown) => {
        entry.neq.push([col, val]);
        return builder;
      },
      limit: () => Promise.resolve({ data: rows, error: null }),
    };
    return builder;
  });

  return { db: { from }, calls };
}

const RESULTS = [
  { user_id: 'me', score_pct: 90 },
  { user_id: 'other-1', score_pct: 40 },
  { user_id: 'other-2', score_pct: 70 },
];
const PROFILES = [
  { id: 'me', username: 'Ohad', avatar_config: null },
  { id: 'other-1', username: 'Ada', avatar_config: null },
  { id: 'other-2', username: 'Grace', avatar_config: null },
];

describe('fetchGhostRivals — never race yourself', () => {
  it('excludes the requesting user in the query when an id is supplied', async () => {
    const { db, calls } = makeDb(RESULTS, PROFILES);

    await fetchGhostRivals(db as any, 'classic', 'seed-1', undefined, 'me', 'en');

    const resultsQuery = calls.find((c) => c.table === 'quick_play_results')!;
    expect(resultsQuery.neq).toContainEqual(['user_id', 'me']);
  });

  it('applies no exclusion for a guest (no user id)', async () => {
    const { db, calls } = makeDb(RESULTS, PROFILES);

    await fetchGhostRivals(db as any, 'classic', 'seed-1', undefined, null, 'en');

    const resultsQuery = calls.find((c) => c.table === 'quick_play_results')!;
    expect(resultsQuery.neq).toHaveLength(0);
  });

  it('still returns the other players as rivals, padded to GHOST_COUNT', async () => {
    const { db } = makeDb(
      RESULTS.filter((r) => r.user_id !== 'me'),
      PROFILES
    );

    const ghosts = await fetchGhostRivals(db as any, 'classic', 'seed-1', undefined, 'me', 'en');

    // Two real rivals (Ada, Grace) plus one synthetic = GHOST_COUNT (3).
    expect(ghosts.length).toBe(3);
    expect(ghosts.filter((g) => !g.userId.startsWith('synthetic:')).map((g) => g.name).sort()).toEqual([
      'Ada',
      'Grace',
    ]);
    expect(ghosts.some((g) => g.userId === 'me')).toBe(false);
  });
});
