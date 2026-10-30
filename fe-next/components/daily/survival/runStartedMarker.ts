import { markWordHuntForfeitToday } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

const keyFor = (language: Language) => `lexiclash_wordhunt_run_started_${language}`;

export function markWordHuntRunStarted(language: Language, puzzleDate: string): void {
  try {
    localStorage.setItem(keyFor(language), puzzleDate);
  } catch {
    // Storage blocked: the reload just stays a free replay, as before.
  }
}

export function clearWordHuntRunStarted(language: Language): void {
  try {
    localStorage.removeItem(keyFor(language));
  } catch {
    // Storage blocked.
  }
}

/** A run started for this date but never finished or quit (reload, app kill) counts as a forfeit, same as a confirmed quit. */
export function consumeUnfinishedWordHuntRun(language: Language, puzzleDate: string): boolean {
  try {
    const started = localStorage.getItem(keyFor(language));
    if (started === null) return false;
    localStorage.removeItem(keyFor(language));
    if (started !== puzzleDate) return false;
    markWordHuntForfeitToday(language);
    return true;
  } catch {
    return false;
  }
}
