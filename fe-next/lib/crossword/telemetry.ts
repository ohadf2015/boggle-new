// Crossword analytics. Routes a solved puzzle through the shared trackGameEnd so
// it persists to analytics_events — the admin game log's source. Crossword has no
// score or opponent, so the solved-slot count stands in for score + wordCount and
// a completion is always a win.

import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';
import type { CrosswordPuzzle } from './types';

/**
 * Crossword emitted a completion but never a start, so PostHog read it as 0
 * starts against N completions — absent from every started→completed funnel,
 * and a completion with no matching start skews any cross-mode aggregate.
 * Same defect `word-craft` had.
 */
export function emitCrosswordGameStart(puzzle: CrosswordPuzzle): void {
  trackGameStart('crossword', {
    puzzleId: puzzle.id,
    difficulty: puzzle.difficulty,
    language: puzzle.locale,
  });
}

export function emitCrosswordGameEnd(puzzle: CrosswordPuzzle, elapsedMs: number): void {
  const slotCount = puzzle.slots.length;
  const durationSec = Math.round(Math.max(0, elapsedMs) / 1000);
  trackGameEnd('crossword', slotCount, slotCount, true, durationSec, {
    isWinner: true,
    puzzleId: puzzle.id,
    difficulty: puzzle.difficulty,
    language: puzzle.locale,
  });
}
