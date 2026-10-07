/**
 * Last-visit cache for `/api/themed-words` results.
 *
 * Why this exists (PSI r6/r7): timed single-player modes deal the board behind
 * a Start card, so the mount-time themed-words POST sat inside the Lighthouse
 * load window and added modeled network contention to simLCP. Gating the fetch
 * on the Start tap entirely would strip themed boards from those modes.
 *
 * Instead: gated modes build their mount board from the PREVIOUS visit's
 * cached theme words (instant, zero network) and refresh the cache in the
 * background once the round is actually running. First-ever visits (and PSI,
 * which never taps) get a plain random board — pickRichestBoardClient still
 * selects the richest candidate, so the quality delta is bounded.
 *
 * localStorage only; every path is wrapped — a throwing/blocked store must
 * never break board generation.
 */

const CACHE_PREFIX = 'lexiclash_themed_words_v1_';

function keyFor(language: string): string {
  return `${CACHE_PREFIX}${language}`;
}

/** Read cached theme words for a language. Returns [] on miss or any error. */
export function readCachedThemedWords(language: string, maxCount: number): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(language));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((w): w is string => typeof w === 'string' && w.length > 0).slice(0, maxCount);
  } catch {
    return [];
  }
}

/** Persist theme words for the next visit's mount board. Never throws. */
export function cacheThemedWords(language: string, words: string[]): void {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(words) || words.length === 0) return;
  try {
    window.localStorage.setItem(keyFor(language), JSON.stringify(words.slice(0, 50)));
  } catch {
    // Quota/private-mode: the next board just falls back to plain random.
  }
}
