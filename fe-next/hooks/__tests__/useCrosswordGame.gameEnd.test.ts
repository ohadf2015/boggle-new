// @vitest-environment jsdom
/**
 * Wiring guard: useCrosswordGame must fire the completion analytics exactly
 * once when the puzzle reaches 'solved', so solved puzzles reach the admin
 * game log. The emit helper itself is tested in lib/crossword/__tests__.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';
import type { SeedPuzzle } from '@/lib/crossword/puzzles/seed';
import { saveProgress, emptyProgress } from '@/lib/crossword/progress';

const emitCrosswordGameEnd = vi.fn();
vi.mock('@/lib/crossword/telemetry', () => ({
  emitCrosswordGameEnd: (...args: unknown[]) => emitCrosswordGameEnd(...args),
}));

import { useCrosswordGame } from '../useCrosswordGame';

const seed: SeedPuzzle = {
  id: 'wiring-test',
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

describe('useCrosswordGame — completion analytics wiring', () => {
  beforeEach(() => {
    emitCrosswordGameEnd.mockClear();
    localStorage.clear();
  });

  it('fires emitCrosswordGameEnd once when the puzzle mounts solved', () => {
    // Seed every cell with its solution so initGame resolves to 'solved'.
    const entries: Record<string, string> = {};
    for (const c of puzzle.cells) if (!c.block) entries[`${c.row},${c.col}`] = c.solution;
    saveProgress({ ...emptyProgress(puzzle.id, 1), entries, status: 'solved' });

    renderHook(() => useCrosswordGame(puzzle));

    expect(emitCrosswordGameEnd).toHaveBeenCalledTimes(1);
    expect(emitCrosswordGameEnd.mock.calls[0][0]).toMatchObject({ id: puzzle.id });
  });

  it('does NOT fire while the puzzle is still unsolved', () => {
    renderHook(() => useCrosswordGame(puzzle));
    expect(emitCrosswordGameEnd).not.toHaveBeenCalled();
  });

  it('fires onWordSolved once when a word becomes fully correct by typing', () => {
    const onWordSolved = vi.fn();
    const { result } = renderHook(() => useCrosswordGame(puzzle, { onWordSolved }));
    act(() => {
      result.current.inputLetter('b');
      result.current.inputLetter('i');
      result.current.inputLetter('r');
      result.current.inputLetter('d'); // completes 1-across "bird"
    });
    expect(onWordSolved).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onWordSolved for a partially-typed or wrong word', () => {
    const onWordSolved = vi.fn();
    const { result } = renderHook(() => useCrosswordGame(puzzle, { onWordSolved }));
    act(() => {
      result.current.inputLetter('b');
      result.current.inputLetter('i');
      result.current.inputLetter('x'); // wrong — word never completes correctly
    });
    expect(onWordSolved).not.toHaveBeenCalled();
  });
});
