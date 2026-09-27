/**
 * The score the level foe (FoeTarget / hit fx) is drawn from. On a hunt the win is the
 * hidden words, not the score race — so the foe clings to its last HP until the hunt goal
 * is met, and never reads K.O. while the level is still running. Pure.
 */
import type { LevelKind } from '@/lib/adventure/play/levels';

export function foeScore({ score, top, kind, huntMet }: { score: number; top: number; kind: LevelKind; huntMet: boolean }): number {
  if (kind !== 'hunt' || huntMet || top <= 0) return score;
  return Math.min(score, top - 1);
}
