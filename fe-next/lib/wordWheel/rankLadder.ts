export const WHEEL_RANKS = [
  'warmUp',
  'spinning',
  'onARoll',
  'sharp',
  'hotStreak',
  'wordsmith',
  'whirlwind',
  'wizard',
  'legend',
] as const;

export type WheelRankKey = (typeof WHEEL_RANKS)[number];

// Calibrated for the 2-minute daily: one 3-letter word (12) lifts you off the floor,
// a strong player (~1,100 on the live board) tops out.
const BASE_THRESHOLDS = [0, 12, 42, 90, 160, 260, 400, 600, 850];
const BASE_DURATION = 120;
const FIRST_STEP = 12;

export function rankThresholds(durationSec: number = BASE_DURATION): number[] {
  const scale = Math.min(1, Math.max(0.25, durationSec / BASE_DURATION));
  return BASE_THRESHOLDS.map((v, i) =>
    i === 0 ? 0 : Math.max(FIRST_STEP * i, Math.round((v * scale) / 6) * 6),
  );
}

export interface RankProgress {
  index: number;
  /** 0..1 along the whole track; moves between dots so every point counts. */
  position: number;
  /** Points to the next rank, 0 at the top. */
  toNext: number;
}

export function rankProgress(score: number, thresholds: number[]): RankProgress {
  const last = thresholds.length - 1;
  let index = 0;
  for (let i = 0; i <= last; i++) if (score >= thresholds[i]) index = i;
  if (index === last) return { index, position: 1, toNext: 0 };
  const lo = thresholds[index];
  const hi = thresholds[index + 1];
  const within = (score - lo) / (hi - lo);
  return { index, position: (index + within) / last, toNext: hi - score };
}

export type PraiseKey = 'nice' | 'great' | 'superb' | 'brilliant' | 'fullWheel';

export function praiseFor(word: string, fullWheel: boolean): PraiseKey {
  if (fullWheel) return 'fullWheel';
  if (word.length >= 6) return 'brilliant';
  if (word.length === 5) return 'superb';
  if (word.length === 4) return 'great';
  return 'nice';
}
