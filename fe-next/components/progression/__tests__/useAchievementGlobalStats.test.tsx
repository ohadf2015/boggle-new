import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  error: null as { message: string } | null,
  limit: 0,
  calls: 0,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: async (n: number) => {
          db.limit = n;
          db.calls++;
          return { data: db.error ? null : db.rows, error: db.error };
        },
      }),
    }),
  },
}));

import { useAchievementGlobalStats, formatHolderPercent, __resetAchievementStatsForTests } from '../useAchievementGlobalStats';

describe('useAchievementGlobalStats', () => {
  beforeEach(() => {
    __resetAchievementStatsForTests();
    db.rows = [
      { achievement_key: 'FIRST_BLOOD', holders: 50, total_players: 100 },
      { achievement_key: 'LEVIATHAN', holders: 1, total_players: 400 },
    ];
    db.error = null;
    db.calls = 0;
  });

  it('reads the cached daily aggregate with a row cap, once per session', async () => {
    const a = renderHook(() => useAchievementGlobalStats());
    await waitFor(() => expect(a.result.current.FIRST_BLOOD).toBe(50));
    renderHook(() => useAchievementGlobalStats());
    expect(db.limit).toBeGreaterThan(0);
    expect(db.limit).toBeLessThanOrEqual(500);
    expect(db.calls).toBe(1);
    expect(a.result.current.LEVIATHAN).toBe(0.25);
  });

  it('a failed read shows no percentages instead of zeros', async () => {
    db.error = { message: 'relation does not exist' };
    const { result } = renderHook(() => useAchievementGlobalStats());
    await new Promise(r => setTimeout(r, 0));
    expect(result.current).toEqual({});
  });

  it('formats tiny shares as "<1%"', () => {
    expect(formatHolderPercent(0.25)).toBe('<1');
    expect(formatHolderPercent(12.4)).toBe('12');
  });
});
