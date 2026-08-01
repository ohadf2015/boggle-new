import { getPuzzleForLevel, getTotalLevels } from './puzzles';
import type { ConnectionPuzzle } from './types';

/**
 * Persistent per-locale record of puzzles the player already solved, so a
 * solved puzzle never reappears — not on replay, and not when the pool grows
 * and the seeded ordering reshuffles level indices (the pre-2026-08 behavior
 * that resurfaced old puzzles after every content drop).
 *
 * localStorage, insertion-ordered, capped: oldest ids fall off first — after
 * SOLVED_CAP solves the earliest puzzles may eventually recycle, which beats
 * unbounded growth.
 */

type SolvedKind = 'regular' | 'pyramid';

export const SOLVED_CAP = 3000;

const key = (kind: SolvedKind, locale: string) => `connections-solved-${kind}-${locale}`;

function readList(kind: SolvedKind, locale: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key(kind, locale));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function getSolvedIds(kind: SolvedKind, locale: string): ReadonlySet<string> {
  return new Set(readList(kind, locale));
}

export function markSolved(kind: SolvedKind, locale: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = readList(kind, locale);
    if (list.includes(id)) return;
    list.push(id);
    window.localStorage.setItem(key(kind, locale), JSON.stringify(list.slice(-SOLVED_CAP)));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function clearSolved(kind: SolvedKind, locale: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(kind, locale));
  } catch {
    /* non-fatal */
  }
}

/**
 * Resolve the first level at `fromLevel` or beyond whose puzzle the player has
 * NOT solved yet. Self-heals across pool reshuffles: whatever position a
 * solved puzzle lands on, it is skipped. Returns `{ puzzle: null }` when the
 * remaining chain is exhausted (pack cleared).
 */
export function findFirstUnsolvedLevel(
  locale: string,
  fromLevel: number,
  banned: ReadonlySet<string>,
  solved: ReadonlySet<string>,
  seed: number,
): { level: number; puzzle: ConnectionPuzzle | null } {
  const start = Math.max(1, fromLevel);
  // getPuzzleForLevel CYCLES modulo the pool, so bound the walk at one full
  // lap — beyond that everything is solved (pack cleared → puzzle: null).
  const total = getTotalLevels(locale, banned, seed);
  for (let step = 0; step < Math.max(1, total); step++) {
    const level = start + step;
    const puzzle = getPuzzleForLevel(locale, level, banned, seed);
    if (!puzzle) return { level, puzzle: null };
    if (!solved.has(puzzle.id)) return { level, puzzle };
  }
  return { level: start, puzzle: null };
}
