/**
 * Per-level personal-best records for Blast V2 — stars + bonus-words + fastest
 * time. Builds on `bestStars.ts` (same localStorage key) so existing data isn't
 * lost; an old plain-number value upgrades silently to the new shape on next
 * write.
 *
 * Three-axis personal best turns a one-shot star goal into a triple replay
 * hook: "I cleared this for 3★, can I beat my time? can I find more bonus
 * words?" Stays client-only to dodge a server migration during the push.
 */

import { BEST_STARS_KEY } from './bestStars';

export type BestRecord = {
  stars: number;
  bonusBest: number;
  fastestSeconds: number;
};

type StoredValue = number | Partial<BestRecord>;
type StoredMap = Record<string, StoredValue>;

const EMPTY: BestRecord = { stars: 0, bonusBest: 0, fastestSeconds: 0 };

function keyFor(locale: string, level: number): string {
  return `${locale}:${level}`;
}

function readMap(): StoredMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BEST_STARS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as StoredMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: StoredMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BEST_STARS_KEY, JSON.stringify(map));
  } catch {
    // best-effort
  }
}

function normalize(v: StoredValue | undefined): BestRecord {
  if (typeof v === 'number') return { stars: Number.isFinite(v) ? v : 0, bonusBest: 0, fastestSeconds: 0 };
  if (v && typeof v === 'object') {
    return {
      stars: typeof v.stars === 'number' && Number.isFinite(v.stars) ? v.stars : 0,
      bonusBest: typeof v.bonusBest === 'number' && Number.isFinite(v.bonusBest) ? v.bonusBest : 0,
      fastestSeconds:
        typeof v.fastestSeconds === 'number' && Number.isFinite(v.fastestSeconds) ? v.fastestSeconds : 0,
    };
  }
  return EMPTY;
}

export function readBestRecord(locale: string, level: number): BestRecord {
  return normalize(readMap()[keyFor(locale, level)]);
}

export function recordBestRun(
  locale: string,
  level: number,
  run: { stars: number; bonusWords: number; timeSeconds: number },
): { record: BestRecord; newBests: { stars: boolean; bonus: boolean; time: boolean } } {
  const map = readMap();
  const k = keyFor(locale, level);
  const prev = normalize(map[k]);
  const next: BestRecord = { ...prev };
  const newBests = { stars: false, bonus: false, time: false };

  if (run.stars > prev.stars) {
    next.stars = run.stars;
    newBests.stars = true;
  }
  if (run.bonusWords > prev.bonusBest) {
    next.bonusBest = run.bonusWords;
    newBests.bonus = true;
  }
  // A "fastest" only counts for positive durations. Either there was no prior
  // time (treat as +Infinity) or this run beats it.
  if (run.timeSeconds > 0 && (prev.fastestSeconds === 0 || run.timeSeconds < prev.fastestSeconds)) {
    next.fastestSeconds = run.timeSeconds;
    newBests.time = true;
  }

  if (newBests.stars || newBests.bonus || newBests.time) {
    map[k] = next;
    writeMap(map);
  }
  return { record: next, newBests };
}

export function formatFastest(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
