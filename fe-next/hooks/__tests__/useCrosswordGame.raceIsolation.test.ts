// @vitest-environment jsdom
/**
 * A multiplayer race reuses the solo engine but must not share its saved
 * progress: a puzzle already solved solo would mount solved and win instantly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';
import type { SeedPuzzle } from '@/lib/crossword/puzzles/seed';
import { saveProgress, emptyProgress, loadProgress } from '@/lib/crossword/progress';

const emitCrosswordGameEnd = vi.fn();
const emitCrosswordGameStart = vi.fn();
vi.mock('@/lib/crossword/telemetry', () => ({
  emitCrosswordGameEnd: (...args: unknown[]) => emitCrosswordGameEnd(...args),
  emitCrosswordGameStart: (...args: unknown[]) => emitCrosswordGameStart(...args),
}));

import { useCrosswordGame } from '../useCrosswordGame';

const seed: SeedPuzzle = {
  id: 'race-isolation',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    ['b', 'i', 'r', 'd'],
    ['i', 'd', 'e', 'a'],
    ['r', 'e', 's', 't'],
    ['d', 'a', 't', 'e'],
  ],
  clues: { bird: 'b', idea: 'i', rest: 'r', date: 'd' },
};
const puzzle = buildSeedPuzzle(seed);
const RACE_KEY = 'mp:1234:race-isolation';

describe('useCrosswordGame — race progress isolation', () => {
  beforeEach(() => {
    emitCrosswordGameEnd.mockClear();
    emitCrosswordGameStart.mockClear();
    localStorage.clear();
  });

  it('a race on a puzzle solved solo starts unsolved', () => {
    const entries: Record<string, string> = {};
    for (const c of puzzle.cells) if (!c.block) entries[`${c.row},${c.col}`] = c.solution;
    saveProgress({ ...emptyProgress(puzzle.id, 1), entries, status: 'solved' });

    const { result } = renderHook(() => useCrosswordGame(puzzle, { progressKey: RACE_KEY, telemetry: false }));

    expect(result.current.state.status).toBe('playing');
    expect(result.current.elapsedMs).toBe(0);
  });

  it('race typing is saved under the race key and leaves the solo save alone', () => {
    const { result } = renderHook(() => useCrosswordGame(puzzle, { progressKey: RACE_KEY, telemetry: false }));
    act(() => { result.current.inputLetter('b'); });

    expect(loadProgress(puzzle.id)).toBeNull();
    expect(Object.values(loadProgress(RACE_KEY)?.entries ?? {})).toContain('b');
  });

  it('a race does not emit solo crossword telemetry', () => {
    const { result } = renderHook(() => useCrosswordGame(puzzle, { progressKey: RACE_KEY, telemetry: false }));
    act(() => {
      for (const c of puzzle.cells) {
        if (c.block) continue;
        result.current.focusCell(c.row, c.col);
        result.current.inputLetter(c.solution);
      }
    });
    expect(result.current.state.status).toBe('solved');
    expect(emitCrosswordGameStart).not.toHaveBeenCalled();
    expect(emitCrosswordGameEnd).not.toHaveBeenCalled();
  });
});
