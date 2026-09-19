/**
 * Per-world run persistence (sessionStorage) so a reload resumes the run.
 * Guarded: private mode / blocked storage just means no resume.
 */
import type { PublicRun } from '@/lib/adventure/play/runToken';

export interface StoredRun { runToken: string; run: PublicRun }

export const runStorageKey = (world: number) => `adv-run-w${world}`;

export function readRun(world: number): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(runStorageKey(world));
    const v = raw ? (JSON.parse(raw) as StoredRun) : null;
    return v && typeof v.runToken === 'string' && v.run && typeof v.run.step === 'number' ? v : null;
  } catch {
    return null;
  }
}

export function writeRun(world: number, value: StoredRun | null) {
  try {
    if (value) sessionStorage.setItem(runStorageKey(world), JSON.stringify(value));
    else sessionStorage.removeItem(runStorageKey(world));
  } catch {
    /* storage unavailable — run just won't survive a reload */
  }
}

/** Best word across the levels of the current run (for the run-over / run-complete recap). */
export interface RunBest { word: string; pts: number }

const bestKey = (world: number) => `adv-run-best-w${world}`;

export function readRunBest(world: number): RunBest | null {
  try {
    const raw = sessionStorage.getItem(bestKey(world));
    const v = raw ? (JSON.parse(raw) as RunBest) : null;
    return v && typeof v.word === 'string' && typeof v.pts === 'number' ? v : null;
  } catch {
    return null;
  }
}

/** Fold one level's best word in. Level 1 opens a new run, so it forgets the old one. */
export function recordRunBest(world: number, level: number, cand: RunBest | null): void {
  try {
    const prev = level <= 1 ? null : readRunBest(world);
    const best = cand && (!prev || cand.pts > prev.pts) ? cand : prev;
    if (best) sessionStorage.setItem(bestKey(world), JSON.stringify(best));
    else sessionStorage.removeItem(bestKey(world));
  } catch {
    /* storage unavailable — the recap shows this level's best only */
  }
}

/** Words found per cleared level of the current run — the draft cards replay them for live values. */
const wordsKey = (world: number) => `adv-run-words-w${world}`;
const MAX_WORDS_PER_LEVEL = 120;

export function readRunWords(world: number): string[][] {
  try {
    const raw = sessionStorage.getItem(wordsKey(world));
    const v: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) ? v.filter((l): l is string[] => Array.isArray(l) && l.every((w) => typeof w === 'string')) : [];
  } catch {
    return [];
  }
}

/** Store one level's words at its slot (idempotent). Level 1 opens a new run. */
export function recordRunWords(world: number, level: number, words: readonly string[]): void {
  try {
    const levels = level <= 1 ? [] : readRunWords(world).slice(0, level - 1);
    while (levels.length < level - 1) levels.push([]);
    levels[level - 1] = words.slice(0, MAX_WORDS_PER_LEVEL);
    sessionStorage.setItem(wordsKey(world), JSON.stringify(levels));
  } catch {
    /* storage unavailable — draft cards fall back to their static line */
  }
}
