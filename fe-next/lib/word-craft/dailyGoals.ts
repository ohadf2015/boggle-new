import type { GameHighlights } from './gameHighlights';

export const DAILY_LONG_WORD = 5;
export const DAILY_CLAIM_CELLS = 8;

export type DailyGoalId = 'longWord' | 'claim' | 'win';

export interface DailyGoalResult {
  id: DailyGoalId;
  done: boolean;
}

export function evaluateDailyGoals(g: { highlights: GameHighlights; playerCells: number; botCells: number }): DailyGoalResult[] {
  return [
    { id: 'longWord', done: (g.highlights.longestWord?.length ?? 0) >= DAILY_LONG_WORD },
    { id: 'claim', done: g.playerCells >= DAILY_CLAIM_CELLS },
    { id: 'win', done: g.playerCells > g.botCells },
  ];
}
