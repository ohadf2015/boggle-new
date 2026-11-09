/**
 * Round results showed rivals as "Player_9ed33e25": the signup trigger's
 * placeholder username (the start of the user's UUID). Rivals must show a
 * chosen name, or a readable stand-in, never the id.
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchGhostRivals } from '../fetchGhostRivals';

function makeDb(resultsRows: any[], profileRows: any[]) {
  const from = vi.fn((table: string) => {
    const rows = table === 'quick_play_results' ? resultsRows : profileRows;
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      gte: () => builder,
      neq: () => builder,
      order: () => builder,
      in: () => Promise.resolve({ data: rows, error: null }),
      limit: () => Promise.resolve({ data: rows, error: null }),
    };
    return builder;
  });
  return { from };
}

const RESULTS = [
  { user_id: '9ed33e25-0000-0000-0000-000000000001', score_pct: 40 },
  { user_id: '7f2c3a29-0000-0000-0000-000000000002', score_pct: 60 },
  { user_id: 'cd211332-0000-0000-0000-000000000003', score_pct: 80 },
];

describe('fetchGhostRivals — names, never ids', () => {
  it('shows a stand-in for placeholder usernames and the chosen display name when set', async () => {
    const db = makeDb(RESULTS, [
      { id: RESULTS[0].user_id, username: 'Player_9ed33e25', display_name: null, avatar_config: null },
      { id: RESULTS[1].user_id, username: 'Player_7f2c3a29', display_name: 'Noa', avatar_config: null },
      { id: RESULTS[2].user_id, username: 'Player_cd211332', display_name: '', avatar_config: null },
    ]);

    const rivals = await fetchGhostRivals(db as any, 'classic', 'seed-1', undefined, null, 'he');

    const names = rivals.map((r) => r.name);
    expect(names).toContain('Noa');
    for (const n of names) expect(n).not.toMatch(/^player[_-]/i);
    expect(new Set(names).size).toBe(names.length);
  });
});
