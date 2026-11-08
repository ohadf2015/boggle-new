/**
 * Rounds before the 60-second par were scored against the solver perfect
 * (0-5% for everyone), so their score_pct isn't on the same scale as today's.
 * Mixing them in would bring back near-zero ghosts and skew the bands.
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchGhostRivals, PAR_SCALE_SINCE } from '../fetchGhostRivals';

function makeDb(rows: any[]) {
  const gte: Array<[string, unknown]> = [];
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    gt: () => builder,
    neq: () => builder,
    gte: (col: string, val: unknown) => {
      gte.push([col, val]);
      return builder;
    },
    order: () => builder,
    in: () => Promise.resolve({ data: [], error: null }),
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return { db: { from: vi.fn(() => builder) }, gte };
}

describe('fetchGhostRivals — par-scale rows only', () => {
  it('only reads rounds recorded since the par scale', async () => {
    const { db, gte } = makeDb([]);
    await fetchGhostRivals(db as any, 'classic', 'seed-1');
    expect(gte).toContainEqual(['created_at', PAR_SCALE_SINCE]);
  });

  it('with no par-scale rows yet, the field is three synthetic rivals spread around a beatable target', async () => {
    const { db } = makeDb([]);
    const rivals = await fetchGhostRivals(db as any, 'classic', 'seed-1');
    expect(rivals).toHaveLength(3);
    // Every rival is under 100% of par: the strongest is a stretch, not a wall.
    expect(rivals.every((r) => r.scorePct > 0 && r.scorePct < 100)).toBe(true);
  });
});
