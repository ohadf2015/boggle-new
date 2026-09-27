/**
 * Text direction for the MP Wheel Rush built-word row.
 *
 * Direction follows the LETTERS ACTUALLY ON SCREEN, not the `gameLanguage`
 * prop. The prop can arrive null at in-game render (the in-game player view
 * passes bare `gameLanguage` without the `roomLanguage` fallback the waiting
 * view uses), and `languageDir(null)` is 'ltr' — which rendered Hebrew
 * puzzles left-to-right, reversed versus the daily Word Wheel (whose row
 * inherits dir="rtl" from <html>).
 *
 * Using the letters themselves is immune to that plumbing and still honours
 * the cross-language case: a Hebrew-UI player in an English game gets Latin
 * letters → 'ltr' (read L→R), exactly as intended.
 */
import type { Language } from '@/types';
import { languageDir } from '@/lib/languageConfig';

/** Hebrew block — the only RTL script LexiClash supports (see RTL_LANGUAGES). */
const RTL_CHAR = /[֐-׿]/;

export function wheelWordDir(
  letters: string | string[] | null | undefined,
  gameLanguage?: Language | null,
): 'rtl' | 'ltr' {
  const joined = Array.isArray(letters) ? letters.join('') : letters ?? '';
  if (RTL_CHAR.test(joined)) return 'rtl';
  // Real letters present and none are RTL → it's an LTR script.
  if (joined.length > 0) return 'ltr';
  // No letters yet (puzzle not loaded) — fall back to the language hint so the
  // empty placeholder still aligns sensibly.
  return languageDir(gameLanguage);
}
