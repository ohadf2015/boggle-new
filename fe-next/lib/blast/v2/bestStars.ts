/**
 * Local personal-best star tracking for Blast V2 levels.
 *
 * Schema co-habits `bestRecords.ts` (same localStorage key) — values may be a
 * plain number (legacy) or a `{ stars, bonusBest, fastestSeconds }` object.
 * Both readers normalize so an old payload upgrades silently on next write.
 *
 * Gives returning players a "beat your 2★" replay hook without a server
 * migration — the retention loop word-puzzle research keeps pointing at.
 *
 * SSR-safe: guards `typeof window` and swallows storage errors, so it's a no-op
 * during server render and in private-mode / quota-failure situations.
 */

export const BEST_STARS_KEY = 'blast-v2-best-stars';

type StoredValue = number | { stars?: number; bonusBest?: number; fastestSeconds?: number };
type BestMap = Record<string, StoredValue>;

function keyFor(locale: string, level: number): string {
  return `${locale}:${level}`;
}

function readMap(): BestMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BEST_STARS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as BestMap) : {};
  } catch {
    return {};
  }
}

function starsOf(v: StoredValue | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v && typeof v === 'object' && typeof v.stars === 'number' && Number.isFinite(v.stars)) {
    return v.stars;
  }
  return 0;
}

export function readBestStars(locale: string, level: number): number {
  return starsOf(readMap()[keyFor(locale, level)]);
}

/**
 * Record a run's star rating, keeping the higher of stored vs new. Preserves
 * any bonus/time fields that may already exist in the stored object so the
 * extended record from `bestRecords.ts` survives a legacy-API write.
 *
 * @returns the resulting best and whether this run set a new best.
 */
export function recordBestStars(
  locale: string,
  level: number,
  stars: number,
): { best: number; isNewBest: boolean } {
  const map = readMap();
  const k = keyFor(locale, level);
  const prevVal = map[k];
  const prev = starsOf(prevVal);
  if (stars <= prev) return { best: prev, isNewBest: false };

  if (typeof prevVal === 'object' && prevVal !== null) {
    map[k] = { ...prevVal, stars };
  } else {
    map[k] = stars;
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BEST_STARS_KEY, JSON.stringify(map));
    } catch {
      // best-effort — ignore quota / disabled-storage failures
    }
  }
  return { best: stars, isNewBest: true };
}
