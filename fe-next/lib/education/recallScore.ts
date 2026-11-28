import type { RecallKind } from './recallQuiz';

/** Points only ever add: speed earns a bonus, a miss just scores nothing and breaks the combo. */

const BASE = 100;
const BONUS_MAX = 50;
const MAX_MULTIPLIER = 3;
const BONUS_WINDOW_MS: Record<RecallKind, number> = { pick: 6000, spell: 12000 };

export interface RecallTally {
  score: number;
  lastPoints: number;
  bestCombo: number;
  correct: number;
  wrong: number;
}

export interface RecallSummary {
  score: number;
  bestCombo: number;
  stars: number;
}

export interface RecallAnswer {
  correct: boolean;
  streak: number;
  kind: RecallKind;
  elapsedMs?: number;
}

export const bonusWindowMs = (kind: RecallKind) => BONUS_WINDOW_MS[kind];

export function comboMultiplier(streak: number): number {
  return Math.min(MAX_MULTIPLIER, Math.max(1, streak));
}

export function speedBonus(kind: RecallKind, elapsedMs: number | undefined): number {
  if (elapsedMs === undefined) return 0;
  const left = Math.max(0, 1 - elapsedMs / BONUS_WINDOW_MS[kind]);
  return Math.round(left * (BONUS_MAX / 10)) * 10;
}

export function recallPoints({ streak, kind, elapsedMs }: Omit<RecallAnswer, 'correct'>): number {
  return (BASE + speedBonus(kind, elapsedMs)) * comboMultiplier(streak);
}

export const emptyTally = (): RecallTally => ({ score: 0, lastPoints: 0, bestCombo: 0, correct: 0, wrong: 0 });

export function tallyAnswer(tally: RecallTally, answer: RecallAnswer): RecallTally {
  if (!answer.correct) return { ...tally, lastPoints: 0, wrong: tally.wrong + 1 };
  const points = recallPoints(answer);
  return {
    score: tally.score + points,
    lastPoints: points,
    bestCombo: Math.max(tally.bestCombo, answer.streak),
    correct: tally.correct + 1,
    wrong: tally.wrong,
  };
}

export function recallStars(correct: number, wrong: number): number {
  const answers = correct + wrong;
  const accuracy = answers ? correct / answers : 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}

export function summarize(tally: RecallTally): RecallSummary {
  return { score: tally.score, bestCombo: tally.bestCombo, stars: recallStars(tally.correct, tally.wrong) };
}
