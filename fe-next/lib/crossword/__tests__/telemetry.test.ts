/**
 * emitCrosswordGameEnd — crossword puzzle-solved telemetry.
 *
 * Crossword fired onSolved but emitted no analytics, so solved puzzles never
 * reached analytics_events and were invisible in the admin game log. This
 * helper routes completion through the shared trackGameEnd so it persists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CrosswordPuzzle } from '@/lib/crossword/types';

const trackGameEnd = vi.fn();
const trackGameStart = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
}));

import { emitCrosswordGameEnd, emitCrosswordGameStart } from '../telemetry';

function makePuzzle(overrides: Partial<CrosswordPuzzle> = {}): CrosswordPuzzle {
  return {
    id: 'en-mini-001',
    locale: 'en',
    size: 5,
    rtl: false,
    cells: [],
    slots: [
      { id: 'A1' }, { id: 'A3' }, { id: 'D1' }, { id: 'D2' },
    ],
    difficulty: 'easy',
    source: 'authored',
    ...overrides,
  } as unknown as CrosswordPuzzle;
}

describe('emitCrosswordGameEnd', () => {
  beforeEach(() => trackGameEnd.mockClear());

  it("fires trackGameEnd('crossword', slotCount, slotCount, completed=true, durationSec)", () => {
    emitCrosswordGameEnd(makePuzzle(), 42_600);

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'crossword',
      4, // slots solved
      4, // word count = slots
      true,
      43, // 42_600ms rounded to seconds
      expect.objectContaining({ isWinner: true, puzzleId: 'en-mini-001', difficulty: 'easy', language: 'en' }),
    );
  });

  it('handles a zero elapsed time as 0 seconds', () => {
    emitCrosswordGameEnd(makePuzzle(), 0);
    expect(trackGameEnd.mock.calls[0][4]).toBe(0);
  });
});

/**
 * Crossword emitted a completion but NO start, so PostHog showed it with 0
 * starts against N completions — invisible in every started→completed funnel,
 * exactly like `word-craft`. A completion without a matching start also skews
 * any cross-mode aggregate.
 */
describe('emitCrosswordGameStart', () => {
  beforeEach(() => trackGameStart.mockClear());

  it('routes through the canonical trackGameStart with mode crossword', () => {
    emitCrosswordGameStart(makePuzzle());

    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart.mock.calls[0][0]).toBe('crossword');
  });

  it('carries the puzzle identity so starts can be joined to completions', () => {
    emitCrosswordGameStart(makePuzzle({ id: 'he-mini-007', difficulty: 'hard' }));

    expect(trackGameStart.mock.calls[0][1]).toMatchObject({
      puzzleId: 'he-mini-007',
      difficulty: 'hard',
    });
  });
});
