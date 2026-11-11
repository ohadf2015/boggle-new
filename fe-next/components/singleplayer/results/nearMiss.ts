import { pickCelebrationKind } from '@/components/mascot/celebrationKind';
import type { MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';

export type NearMiss =
  | { kind: 'newBest' }
  | { kind: 'best'; gap: number }
  | { kind: 'rival'; gap: number; name: string };

export interface NearMissInput {
  score: number;
  /** The personal best the progress card shows (current game included). */
  best: number;
  isNewBest: boolean;
  /** False on the first ever game: there is no best to be near yet. */
  hasHistory: boolean;
  /** Any other "new record" signal on this screen (result flag, record badge). */
  isRecord: boolean;
  /** The participant directly above the player, if any. */
  rival: { name: string; score: number } | null;
}

export function nearMissMargin(target: number): number {
  return Math.max(3, Math.round(target * 0.1));
}

function gapIfNear(score: number, target: number): number | null {
  const gap = target - score;
  return gap > 0 && gap <= nearMissMargin(target) ? gap : null;
}

export function pickNearMiss(input: NearMissInput): NearMiss | null {
  const { score, best, isNewBest, hasHistory, isRecord, rival } = input;
  if (!hasHistory || score <= 0) return null;
  if (isNewBest || isRecord) return { kind: 'newBest' };

  const bestGap = gapIfNear(score, best);
  const rivalGap = rival ? gapIfNear(score, rival.score) : null;
  if (rival && rivalGap !== null && (bestGap === null || rivalGap <= bestGap)) {
    return { kind: 'rival', gap: rivalGap, name: rival.name };
  }
  return bestGap !== null ? { kind: 'best', gap: bestGap } : null;
}

export interface ResultsCelebrationInput {
  won: boolean;
  newBest: boolean;
  rank: number;
  totalPlayers: number;
  hadBingo: boolean;
}

export function pickResultsCelebration(input: ResultsCelebrationInput): MascotCelebrationKind | null {
  const { won, newBest, rank, totalPlayers, hadBingo } = input;
  if (!won && !newBest) return null;
  if (hadBingo) return 'bingo';
  if (won) return pickCelebrationKind({ rank, totalPlayers }) === 'champion' ? 'champion' : 'knight';
  return 'knight';
}
