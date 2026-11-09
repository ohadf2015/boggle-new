/**
 * Daily Word Wheel schedule (puzzles from WHEEL_V3_START_DATE).
 *
 * Before v3 each day drew its source word independently at random, so a small
 * pool (Hebrew had 8 words) repeated often, sometimes three days running, and
 * neighbouring days could share 6 of 7 letters. Now the days are dealt in
 * cycles: every source is used once per cycle in a seeded order, consecutive
 * days share at most MAX_SHARED_LETTERS letters where the pool allows it, and
 * the center letter never repeats from one day to the next.
 */

import type { Language } from '@/types';
import { mulberry32, hashString } from './prng';
import { getUniqueLetters, shuffleInPlace } from './wordWheelLetters';

export const WHEEL_SIZE = 7;
export const MAX_SHARED_LETTERS = 4;

export interface ScheduledWheel {
  source: string;
  center: string;
  /** Center first, then the 6 outer letters in wheel order. */
  letters: string[];
}

interface Candidate { source: string; letters: string[] }

const DAY_MS = 86_400_000;
const cycleCache = new Map<string, ScheduledWheel[]>();

export function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS);
}

const shared = (a: string[], b: string[]) => a.filter((l) => b.includes(l)).length;

function pickNext(pool: Candidate[], prev: ScheduledWheel | null): Candidate {
  if (!prev) return pool.splice(0, 1)[0];
  let best = 0;
  for (let i = 0; i < pool.length; i++) {
    const overlap = shared(pool[i].letters, prev.letters);
    if (overlap <= MAX_SHARED_LETTERS) { best = i; break; }
    if (overlap < shared(pool[best].letters, prev.letters)) best = i;
  }
  return pool.splice(best, 1)[0];
}

function buildCycle(
  sources: readonly string[], language: Language, hard: readonly string[], cycle: number, prev: ScheduledWheel | null,
): ScheduledWheel[] {
  const random = mulberry32(hashString(`word-wheel-v3-${language}-cycle-${cycle}`));
  const pool: Candidate[] = shuffleInPlace(
    sources.map((source) => ({ source, letters: getUniqueLetters(source, language).slice(0, WHEEL_SIZE) })),
    random,
  );
  const days: ScheduledWheel[] = [];
  let last = prev;
  while (pool.length) {
    const next = pickNext(pool, last);
    const centers = next.letters.filter((l) => !hard.includes(l) && l !== last?.center);
    const usable = centers.length ? centers : next.letters;
    const center = usable[Math.floor(random() * usable.length)];
    const outer = shuffleInPlace(next.letters.filter((l) => l !== center), random);
    last = { source: next.source, center, letters: [center, ...outer] };
    days.push(last);
  }
  return days;
}

function cycleFor(
  sources: readonly string[], language: Language, hard: readonly string[], cycle: number,
): ScheduledWheel[] {
  let prev: ScheduledWheel | null = null;
  let days: ScheduledWheel[] = [];
  for (let c = 0; c <= cycle; c++) {
    const key = `${language}|${sources.length}|${c}`;
    days = cycleCache.get(key) ?? buildCycle(sources, language, hard, c, prev);
    cycleCache.set(key, days);
    prev = days[days.length - 1];
  }
  return days;
}

/** The wheel for `date`, counting days from `startDate` (both YYYY-MM-DD, UTC). */
export function scheduledWheel(
  date: string, startDate: string, sources: readonly string[], language: Language, hard: readonly string[] = [],
): ScheduledWheel {
  const day = Math.max(0, daysBetween(startDate, date));
  const cycle = Math.floor(day / sources.length);
  return cycleFor(sources, language, hard, cycle)[day % sources.length];
}
