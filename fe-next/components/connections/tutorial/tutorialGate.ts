import { getPuzzlesForLocale } from '@/lib/connections/puzzles';
import { loadDailyResult } from '@/lib/connections/dailyResultStore';
import type { ConnectionPuzzle } from '@/lib/connections/types';

export const TUTORIAL_SEEN_KEY = 'lc:connections-daily-tutorial-seen';
/** Written by every finished Word Bridge daily, before this tutorial existed too. */
const PLAYED_KEY = 'connections-daily-played';

/** One easy, short, well-known riddle per locale, taken from the curated pool. */
const TUTORIAL_PUZZLE_ID: Record<string, string> = {
  en: 'en-e-122',
  he: 'he-e-075',
  es: 'es-r26-012',
  sv: 'sv-r26-008',
  ja: 'ja-v-017',
  ru: 'ru-a-012',
};

const FALLBACK: ConnectionPuzzle = { id: 'tutorial', word1: 'GOLD', bridge: 'FISH', word2: 'POND', difficulty: 'easy' };

export function tutorialPuzzle(locale: string): ConnectionPuzzle {
  const find = (l: string) => getPuzzlesForLocale(l).find((p) => p.id === TUTORIAL_PUZZLE_ID[l]);
  return find(locale) ?? find('en') ?? FALLBACK;
}

/** First visit only: never for a player who has finished a Word Bridge daily before. */
export function shouldAutoShowTutorial(today: string, language: string): boolean {
  try {
    if (window.localStorage.getItem(TUTORIAL_SEEN_KEY)) return false;
    if (window.localStorage.getItem(PLAYED_KEY)) return false;
    return loadDailyResult(today, language) == null;
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch { /* storage off */ }
}
