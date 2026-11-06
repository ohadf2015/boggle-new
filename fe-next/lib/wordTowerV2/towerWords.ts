import { isBlockedWord } from './blocked';
import { cleanUntrustedText } from './sanitizeText';

const MAX_WORDS = 30;
const MAX_WORD = 15;
/** Same cap as a wreck round's building (wreck.ts MAX_WRECK_BLOCKS). */
const MAX_STORED = 24;

/** Untrusted word list (share link, review URL) -> safe, clamped labels. */
export function sanitizeWords(raw: unknown[]): string[] {
  return raw
    .filter((x): x is string => typeof x === 'string')
    .slice(0, MAX_WORDS)
    .map((x) => cleanUntrustedText(x, MAX_WORD))
    .filter((w) => w && !isBlockedWord(w));
}

/** A daily row's tower: the top floors of the climb, cleaned. null = the client sent none. */
export function dailyTowerWords(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const words = sanitizeWords(raw.filter((x) => typeof x === 'string').slice(-MAX_STORED));
  return words.length ? words : null;
}
