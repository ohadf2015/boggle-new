import { dailyBestKey, isDailyTowerPlayed, mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { dailyTowerGameCode, utcDateKey } from '@/lib/wordTower/dailySeed';

/** Same calendar seed v1 uses, so a later public swap ranks on the same board. */
export function v2DailySeed(date: Date = new Date()): string {
  return dailyTowerGameCode(date);
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
