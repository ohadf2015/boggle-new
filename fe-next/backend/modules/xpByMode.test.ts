import { describe, it, expect } from 'vitest';
import { aggregateModeRows, fetchXpByMode } from './xpByMode';

describe('aggregateModeRows', () => {
  it('groups game_results rows by mode, counting games and summing score', () => {
    const rows = [
      { game_mode: 'classic', score: 100 },
      { game_mode: 'blast', score: 250 },
      { game_mode: 'classic', score: 50 },
    ];
    const result = aggregateModeRows(rows);
    expect(result).toContainEqual({ mode: 'classic', games: 2, score: 150 });
    expect(result).toContainEqual({ mode: 'blast', games: 1, score: 250 });
    expect(result).toHaveLength(2);
  });

  it('treats missing/null mode as classic (the column default)', () => {
    const rows = [
      { game_mode: null, score: 100 },
      { game_mode: 'classic', score: 100 },
    ];
    const result = aggregateModeRows(rows);
    expect(result).toEqual([{ mode: 'classic', games: 2, score: 200 }]);
  });

  it('coerces null/undefined score to 0', () => {
    const rows = [{ game_mode: 'blast', score: null }];
    expect(aggregateModeRows(rows)).toEqual([{ mode: 'blast', games: 1, score: 0 }]);
  });

  it('returns [] for no rows', () => {
    expect(aggregateModeRows([])).toEqual([]);
  });
});

// Minimal fake of the supabase query chain used by fetchXpByMode.
function fakeSupabase(rows: unknown[] | null, error: unknown = null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => Promise.resolve({ data: rows, error }),
  };
  return { from: () => builder };
}

describe('fetchXpByMode', () => {
  it('aggregates rows and splits the total XP across modes', async () => {
    const rows = [
      { game_mode: 'classic', score: 1000 },
      { game_mode: 'blast', score: 1000 },
    ];
    const result = await fetchXpByMode(fakeSupabase(rows) as never, 'player-1', 4000);
    const sum = result.reduce((acc, s) => acc + s.xp, 0);
    expect(sum).toBe(4000);
    // Both competitive modes present; the rest of total_xp surfaces as Other.
    const modes = result.map((s) => s.mode);
    expect(modes).toContain('classic');
    expect(modes).toContain('blast');
    expect(modes).toContain('__other__');
  });

  it('returns [] when the query errors (never throws)', async () => {
    const result = await fetchXpByMode(
      fakeSupabase(null, { message: 'boom' }) as never,
      'player-1',
      4000,
    );
    expect(result).toEqual([]);
  });

  it('returns [] when total XP is zero', async () => {
    const rows = [{ game_mode: 'classic', score: 1000 }];
    const result = await fetchXpByMode(fakeSupabase(rows) as never, 'player-1', 0);
    expect(result).toEqual([]);
  });
});
