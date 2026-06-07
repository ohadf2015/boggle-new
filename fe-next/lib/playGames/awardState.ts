/**
 * Local persisted state for one-time / cross-session Play Games awards.
 *
 * PGS unlocks are idempotent server-side, but we still track local flags to
 * avoid re-firing native calls every game and to compute cross-session facts
 * (distinct languages played). SSR-safe: every accessor degrades to a no-op
 * when localStorage is unavailable.
 */

const FIRST_WORD_KEY = 'pgs_first_word_awarded';
const POLYGLOT_KEY = 'pgs_polyglot_awarded';
const LANGUAGES_KEY = 'pgs_languages_played';

function store(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasAwardedFirstWord(): boolean {
  return store()?.getItem(FIRST_WORD_KEY) === '1';
}

export function markFirstWordAwarded(): void {
  store()?.setItem(FIRST_WORD_KEY, '1');
}

export function hasAwardedPolyglot(): boolean {
  return store()?.getItem(POLYGLOT_KEY) === '1';
}

export function markPolyglotAwarded(): void {
  store()?.setItem(POLYGLOT_KEY, '1');
}

/**
 * Record a language as played and return the running count of DISTINCT
 * languages. Returns 0 when storage is unavailable or `lang` is empty.
 */
export function recordLanguagePlayed(lang: string): number {
  const s = store();
  if (!s || !lang) return 0;
  let langs: string[] = [];
  try {
    const raw = s.getItem(LANGUAGES_KEY);
    if (raw) langs = JSON.parse(raw);
  } catch {
    langs = [];
  }
  const set = new Set(Array.isArray(langs) ? langs : []);
  set.add(lang);
  try {
    s.setItem(LANGUAGES_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota errors */
  }
  return set.size;
}
