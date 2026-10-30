import type { Language } from '@/types';
import { getJsonFromLocalStorage, saveJsonToLocalStorage, removeFromLocalStorage } from '@/utils/storageHelpers';
import { getWordWheelResultKey } from './constants';
import type { StoredWordWheelResult } from './types';

// Not under the result-key prefix: hasEverPlayedWordWheel scans that prefix.
const runKey = (language: Language, date: string) => `lexiclash_ww_run_${language}_${date}`;

export interface WordWheelRun { startedAt: string; wordsFound: string[]; score: number }

/** Written when the clock starts, so leaving mid-run cannot hand out a fresh board. */
export function startWordWheelRun(language: Language, date: string): void {
  saveJsonToLocalStorage(runKey(language, date), { startedAt: new Date().toISOString(), wordsFound: [], score: 0 });
}

export function recordWordWheelRunProgress(language: Language, date: string, progress: { wordsFound: string[]; score: number }): void {
  const run = getUnfinishedWordWheelRun(language, date);
  if (!run) return;
  saveJsonToLocalStorage(runKey(language, date), { ...run, ...progress });
}

export function getUnfinishedWordWheelRun(language: Language, date: string): WordWheelRun | null {
  return getJsonFromLocalStorage<WordWheelRun | null>(runKey(language, date), null);
}

export function clearWordWheelRun(language: Language, date: string): void {
  removeFromLocalStorage(runKey(language, date));
}

export function markWordWheelResultSubmitted(language: Language, date: string): void {
  const key = getWordWheelResultKey(language, date);
  const stored = getJsonFromLocalStorage<StoredWordWheelResult | null>(key, null);
  if (!stored) return;
  saveJsonToLocalStorage(key, { ...stored, submittedToServer: true });
}

/** Mirrors the server: a Wheel day extends the streak only with at least one word, and never on catch-up. */
export function countsTowardWheelStreak({ wordCount, isCatchup }: { wordCount: number; isCatchup: boolean }): boolean {
  return wordCount > 0 && !isCatchup;
}
