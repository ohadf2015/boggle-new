// Client-side progress persistence (localStorage). Enables resume + offline play. SSR-safe:
// every accessor guards against a missing window/localStorage.

import type { CrosswordProgress } from './types';

const PREFIX = 'lexiclash:crossword:';

export const storageKey = (puzzleId: string) => `${PREFIX}${puzzleId}`;

const cellKey = (row: number, col: number) => `${row},${col}`;

function store(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // Safari private mode etc.
  }
}

export function emptyProgress(puzzleId: string, now: number): CrosswordProgress {
  return {
    puzzleId,
    entries: {},
    status: 'playing',
    startedAt: now,
    elapsedMs: 0,
    revealedCells: [],
  };
}

/** Immutably set (or clear, when letter is empty) a cell entry. */
export function setEntry(
  progress: CrosswordProgress,
  row: number,
  col: number,
  letter: string,
): CrosswordProgress {
  const entries = { ...progress.entries };
  const k = cellKey(row, col);
  if (letter && letter.length > 0) entries[k] = letter;
  else delete entries[k];
  return { ...progress, entries };
}

export function loadProgress(puzzleId: string): CrosswordProgress | null {
  const s = store();
  if (!s) return null;
  const raw = s.getItem(storageKey(puzzleId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CrosswordProgress;
    if (!parsed || typeof parsed !== 'object' || parsed.puzzleId !== puzzleId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(progress: CrosswordProgress): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(storageKey(progress.puzzleId), JSON.stringify(progress));
  } catch {
    // quota / private mode — non-fatal; play continues in memory.
  }
}

export function clearProgress(puzzleId: string): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(storageKey(puzzleId));
  } catch {
    /* non-fatal */
  }
}
