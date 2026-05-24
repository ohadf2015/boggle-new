/**
 * Local personal-best star tracking for Blast V2 levels.
 *
 * Gives returning players a "beat your 2★" replay hook without a server
 * migration — the retention loop word-puzzle research keeps pointing at. Stored
 * client-side per (locale, level); a future server column can supersede this for
 * cross-device best tracking.
 *
 * SSR-safe: guards `typeof window` and swallows storage errors, so it's a no-op
 * during server render and in private-mode / quota-failure situations.
 */

export const BEST_STARS_KEY = 'blast-v2-best-stars';

type BestMap = Record<string, number>;

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

export function readBestStars(locale: string, level: number): number {
  const map = readMap();
  const v = map[keyFor(locale, level)];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Record a run's star rating, keeping the higher of stored vs new.
 * @returns the resulting best and whether this run set a new best.
 */
export function recordBestStars(
  locale: string,
  level: number,
  stars: number,
): { best: number; isNewBest: boolean } {
  const prev = readBestStars(locale, level);
  if (stars <= prev) return { best: prev, isNewBest: false };

  const map = readMap();
  map[keyFor(locale, level)] = stars;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BEST_STARS_KEY, JSON.stringify(map));
    } catch {
      // best-effort — ignore quota / disabled-storage failures
    }
  }
  return { best: stars, isNewBest: true };
}
