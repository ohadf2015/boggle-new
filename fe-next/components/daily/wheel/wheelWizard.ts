import { rankProgress, rankThresholds, WHEEL_RANKS } from '@/lib/wordWheel/rankLadder';
import { scaleRankThresholds } from '@/utils/dailyChallenge/wordWheelScoring';

const WIZARD = WHEEL_RANKS.indexOf('wizard');

/** The "Word Wizard" banner means the wizard rung of the same ladder the player climbed in game. */
export function reachesWizardRank(score: number, puzzleDate: string): boolean {
  return rankProgress(score, scaleRankThresholds(rankThresholds(), puzzleDate)).index >= WIZARD;
}
