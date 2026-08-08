import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRivalRace, RANK_FLASH_MS } from '../useRivalRace';
import type { LeaderboardRivalRow } from '../rivals';

const row = (rank: number, heightM: number, extra: Partial<LeaderboardRivalRow> = {}): LeaderboardRivalRow => ({
  rank,
  playerId: `p${rank}`,
  username: `Player ${rank}`,
  bestHeightM: heightM,
  highestBiome: 'city',
  ...extra,
});

const BOARD: LeaderboardRivalRow[] = [
  row(1, 900), row(2, 200), row(3, 120), row(4, 96),
  row(5, 74), row(6, 58), row(7, 41), row(8, 33),
  row(9, 22), row(10, 14),
];

describe('useRivalRace', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('centres the cohort on the viewer, not on the board leaders', () => {
    const { result } = renderHook(() => useRivalRace(BOARD, 30));
    const chase = result.current.rivals.filter((r) => r.heightM > 30).map((r) => r.heightM);
    expect(Math.min(...chase)).toBe(33);
  });

  it('reports the viewer\'s live rank', () => {
    const { result } = renderHook(({ h }) => useRivalRace(BOARD, h), { initialProps: { h: 30 } });
    // Above 30: 900, 200, 120, 96, 74, 58, 41, 33 → 8 ahead → rank 9.
    expect(result.current.rank).toBe(9);
  });

  it('fires a rank gain when the viewer overtakes, then clears it', () => {
    const { result, rerender } = renderHook(({ h }) => useRivalRace(BOARD, h), { initialProps: { h: 30 } });
    expect(result.current.rankGain).toBeNull();

    act(() => rerender({ h: 45 })); // passes 33 and 41 → rank 9 → 7
    expect(result.current.rankGain).toEqual({ from: 9, to: 7, gained: 2 });

    act(() => { vi.advanceTimersByTime(RANK_FLASH_MS + 1); });
    expect(result.current.rankGain).toBeNull();
  });

  it('does not fire a rank gain when the height moves but the rank does not', () => {
    const { result, rerender } = renderHook(({ h }) => useRivalRace(BOARD, h), { initialProps: { h: 34 } });
    act(() => rerender({ h: 36 })); // still between 33 and 41
    expect(result.current.rankGain).toBeNull();
  });

  it('never fires a rank gain on the first render', () => {
    const { result } = renderHook(() => useRivalRace(BOARD, 5000));
    expect(result.current.rank).toBe(1);
    expect(result.current.rankGain).toBeNull();
  });

  it('keeps the SAME cohort array identity while the band is unchanged', () => {
    const { result, rerender } = renderHook(({ h }) => useRivalRace(BOARD, h), { initialProps: { h: 34 } });
    const first = result.current.rivals;
    act(() => rerender({ h: 36 }));
    // Climbing without crossing anyone must not re-create the ghost towers —
    // a new array identity would remount every rail child mid-climb.
    expect(result.current.rivals).toBe(first);
  });

  it('produces a NEW cohort array once the band actually shifts', () => {
    const { result, rerender } = renderHook(({ h }) => useRivalRace(BOARD, h), { initialProps: { h: 34 } });
    const first = result.current.rivals;
    act(() => rerender({ h: 100 }));
    expect(result.current.rivals).not.toBe(first);
  });

  it('is inert for an empty board — no rivals, rank 1, no gain', () => {
    const { result } = renderHook(() => useRivalRace([], 30));
    expect(result.current.rivals).toEqual([]);
    expect(result.current.rank).toBe(1);
    expect(result.current.rankGain).toBeNull();
  });
});
