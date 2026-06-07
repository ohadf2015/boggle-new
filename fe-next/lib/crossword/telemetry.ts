// Crossword analytics. Routes a solved puzzle through the shared trackGameEnd so
// it persists to analytics_events — the admin game log's source. Crossword has no
// score or opponent, so the solved-slot count stands in for score + wordCount and
// a completion is always a win.

import { trackGameEnd } from '@/utils/growthTracking';
import type { CrosswordPuzzle } from './types';

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
