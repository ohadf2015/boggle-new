import { rankProgress, wheelRankLadder, WHEEL_RANKS } from '@/lib/wordWheel/rankLadder';

const WIZARD = WHEEL_RANKS.indexOf('wizard');

/** The "Word Wizard" banner means the wizard rung of the same ladder the player climbed in game. */
export function reachesWizardRank(score: number, puzzleDate: string, language?: string): boolean {
  return rankProgress(score, wheelRankLadder({ puzzleDate, language })).index >= WIZARD;
}
