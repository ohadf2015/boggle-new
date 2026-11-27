/**
 * One memory per word: the schedule and strength stage behind `word_review_state`.
 * Pure — every function takes `today` as an ISO day ('YYYY-MM-DD').
 */

export const REVIEW_KINDS = ['recognise', 'context', 'recall', 'spell', 'use', 'find'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const STRENGTHS = ['seed', 'sprout', 'plant', 'flower', 'gold'] as const;
export type Strength = (typeof STRENGTHS)[number];
export type StoredStrength = Exclude<Strength, 'seed'>;

/** One answer as a client or game reports it. */
export interface WordResult {
  word: string;
  correct: boolean;
  kind: ReviewKind;
  ms?: number;
}

export interface MemoryState {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string;
  correctDays: number;
  lastCorrectDate: string | null;
  bestGapDays: number;
  strength: StoredStrength;
}

const KIND_WEIGHT: Record<ReviewKind, number> = {
  find: 0.5,
  recognise: 0.6,
  context: 0.9,
  recall: 1,
  spell: 1,
  use: 1.3,
};

const START_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 5;
const GOLD_GAP_DAYS = 7;
const MAX_INTERVAL_DAYS = 365;
const DAY_MS = 86_400_000;

const rank = (s: Strength) => STRENGTHS.indexOf(s);
const atLeast = (a: Strength, b: StoredStrength): StoredStrength => (rank(a) >= rank(b) ? (a as StoredStrength) : b);
const clampEase = (e: number) => Math.round(Math.min(MAX_EASE, Math.max(MIN_EASE, e)) * 100) / 100;

const utc = (isoDay: string) => Date.UTC(+isoDay.slice(0, 4), +isoDay.slice(5, 7) - 1, +isoDay.slice(8, 10));
export const dayDiff = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY_MS);
export const addDays = (isoDay: string, n: number) => new Date(utc(isoDay) + n * DAY_MS).toISOString().slice(0, 10);

/** A live board find counts: the student produced and spelled the word from letters. */
export const isRecallKind = (kind: ReviewKind) => kind !== 'recognise';
export const isMasteredStrength = (s: Strength) => s === 'flower' || s === 'gold';
export const isDue = (state: MemoryState | null, today: string) => !!state && state.nextReviewDate <= today;

/** Stored stage, one stage lower once the word is past its due day (never below sprout). */
export function effectiveStrength(state: MemoryState | null, today: string): Strength {
  if (!state) return 'seed';
  if (today <= state.nextReviewDate || state.strength === 'sprout') return state.strength;
  return STRENGTHS[rank(state.strength) - 1];
}

function nextStrength(prev: MemoryState | null, base: Strength, review: Pick<WordResult, 'correct' | 'kind'>, today: string): StoredStrength {
  if (!review.correct || !isRecallKind(review.kind)) return atLeast(base, 'sprout');
  const gap = prev?.lastCorrectDate ? dayDiff(prev.lastCorrectDate, today) : null;
  if (gap !== null && gap >= GOLD_GAP_DAYS) return 'gold';
  if (gap !== null && gap >= 1) return atLeast(base, 'flower');
  return atLeast(base, 'plant');
}

/**
 * Fold one answer into a word's memory. `grandfathered`: the word was in
 * `words_mastered` before the engine existed, so a first row starts at flower.
 */
export function applyReview(
  prev: MemoryState | null,
  review: Pick<WordResult, 'correct' | 'kind'>,
  today: string,
  opts: { grandfathered?: boolean } = {},
): MemoryState {
  // A right answer never lowers a word; only a wrong one makes the wilt stick.
  const base: Strength = !prev ? (opts.grandfathered ? 'flower' : 'seed') : review.correct ? prev.strength : effectiveStrength(prev, today);
  const strength = nextStrength(prev, base, review, today);
  const ease = prev?.easeFactor ?? START_EASE;
  const recallRight = review.correct && isRecallKind(review.kind);

  const recallFields = recallRight
    ? {
        correctDays: (prev?.correctDays ?? 0) + (prev?.lastCorrectDate === today ? 0 : 1),
        lastCorrectDate: today,
        bestGapDays: Math.max(prev?.bestGapDays ?? 0, prev?.lastCorrectDate ? dayDiff(prev.lastCorrectDate, today) : 0),
      }
    : { correctDays: prev?.correctDays ?? 0, lastCorrectDate: prev?.lastCorrectDate ?? null, bestGapDays: prev?.bestGapDays ?? 0 };

  if (!review.correct) {
    return { ...recallFields, strength, easeFactor: clampEase(ease - 0.2), interval: 1, repetitions: 0, nextReviewDate: today, lastReviewDate: today };
  }
  // Early reviews (word not due yet) never stretch the schedule.
  if (prev && today < prev.nextReviewDate) {
    return { ...prev, ...recallFields, strength, lastReviewDate: today };
  }
  const repetitions = (prev?.repetitions ?? 0) + 1;
  const grown = repetitions === 1 ? 1 : repetitions === 2 ? 3 : (prev?.interval ?? 1) * ease;
  const interval = Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(grown * KIND_WEIGHT[review.kind])));
  return {
    ...recallFields,
    strength,
    easeFactor: clampEase(ease + (recallRight ? 0.1 : 0)),
    interval,
    repetitions,
    nextReviewDate: addDays(today, interval),
    lastReviewDate: today,
  };
}
