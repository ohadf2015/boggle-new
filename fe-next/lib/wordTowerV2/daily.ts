import { fnv1aHash, mulberry32 } from '@/lib/rng/seededRandom';
import { dailyBestKey, isDailyTowerPlayed, mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { type CraneSwing, SWING } from './crane';

/** utcTodayKey + language — every player of a locale shares this day's tower. */
export function v2DailyKey(date: Date = new Date(), language = 'en'): string {
  return `${utcDateKey(date)}${language}`;
}

/** FNV-1a of utcTodayKey + language. Feeds crate RNG, world seed, swing script. */
export function v2DailyNumericSeed(date: Date = new Date(), language = 'en'): number {
  return fnv1aHash(v2DailyKey(date, language)) || 1;
}

/** Wheel seed: same UTC day + language → same letters. */
export function v2DailySeed(date: Date = new Date(), language = 'en'): string {
  return `daily-${utcDateKey(date)}-${language}`;
}

/** Scripted crane for drop `dropIndex` — deterministic from the daily seed. */
export function v2DailySwing(seed: number, dropIndex: number): CraneSwing {
  const rng = mulberry32(fnv1aHash(`wt2-swing-${seed}-${dropIndex}`) || 1);
  return {
    amplitudeRad: SWING.amplitudeRad * (0.9 + rng() * 0.2),
    periodMs: SWING.periodMs * (0.9 + rng() * 0.2),
    phase: rng() * Math.PI * 2,
  };
}

export function hasPlayedV2DailyToday(
  storage: { getItem(key: string): string | null } | null = typeof localStorage === 'undefined' ? null : localStorage,
  date: Date = new Date(),
): boolean {
  if (!storage) return false;
  try {
    return isDailyTowerPlayed(storage.getItem(dailyBestKey(utcDateKey(date))));
  } catch {
    return false;
  }
}

export function rankFromDailyBoard(rows: { isYou?: boolean; rank: number }[]): number | null {
  const you = rows.find((r) => r.isYou);
  return you ? you.rank : null;
}

export function playedOnDailyBoard(rows: { isYou?: boolean }[]): boolean {
  return rows.some((r) => r.isYou);
}

export interface DailyClimb {
  climbM: number;
  floors: number;
  longestWord: string;
}

export interface DailySubmitBody extends DailyClimb {
  heightM: number;
  language: string;
  guestFingerprint: string | null;
}

/**
 * Record today's climb on the same localStorage key v1 uses (hub progress)
 * and return the POST body when the personal best improved.
 */
export function recordV2DailyClimb(
  result: DailyClimb,
  opts: {
    language: string;
    guestFingerprint: string | null;
    storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void };
    date?: Date;
  },
): DailySubmitBody | null {
  const date = opts.date ?? new Date();
  const storage = opts.storage;
  if (!storage) return null;
  let merged = 0;
  let improved = false;
  try {
    const key = dailyBestKey(utcDateKey(date));
    const stored = Number(storage.getItem(key)) || 0;
    merged = mergeDailyBest(stored, result.climbM);
    improved = merged > stored;
    storage.setItem(key, String(merged));
  } catch {
    return null;
  }
  if (!improved || merged <= 0) return null;
  return {
    ...result,
    heightM: merged,
    language: opts.language,
    guestFingerprint: opts.guestFingerprint,
  };
}
