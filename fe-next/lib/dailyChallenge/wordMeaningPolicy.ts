/**
 * Daily-word meaning policy.
 *
 * The LLM judge returns a short `meaning` for every approved/replaced daily word,
 * but Hebrew meanings were consistently low-quality (awkward / off), so we suppress
 * them rather than show a wrong definition on the results page. This is the single
 * source of truth for "should this language persist a meaning" — applied at every
 * `daily_target_words.meaning` write site in dailyWordValidator.ts.
 *
 * @module lib/dailyChallenge/wordMeaningPolicy
 */

/** Languages whose daily-word meaning is suppressed (written as NULL). */
export const NO_MEANING_LANGUAGES = new Set(['he']);

/**
 * Meaning to persist for a given language: NULL for suppressed languages, otherwise
 * the trimmed meaning (empty/whitespace/nullish → NULL so the results card hides it).
 */
export function meaningForLanguage(
  language: string,
  meaning: string | null | undefined
): string | null {
  if (NO_MEANING_LANGUAGES.has(language)) return null;
  const trimmed = (meaning ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Unicode range each non-Latin language's meaning MUST contain at least one of.
 * A stored meaning that can't possibly match the puzzle's script (e.g. an English
 * gloss for an unrelated word attached to a Hebrew target) is the wrong definition
 * and must not be shown. Latin-script languages (en/es/sv) have no entry — there's
 * nothing to disambiguate, so anything non-empty passes.
 */
const REQUIRED_SCRIPT: Record<string, RegExp> = {
  he: /[֐-׿]/,                       // Hebrew
  ru: /[Ѐ-ӿ]/,                       // Cyrillic
  ja: /[぀-ヿ一-鿿ｦ-ﾟ]/, // Hiragana / Katakana / Kanji
};

/**
 * Whether `meaning` is safe to render on the results card for a puzzle in
 * `language`. Guards against a mismatched-script definition (the "Hebrew word,
 * English gazelle definition" bug) slipping through from stale/legacy DB rows:
 * for a non-Latin language the meaning must contain at least one character of
 * that language's script, else it's hidden.
 */
export function isMeaningDisplayableForLanguage(
  language: string,
  meaning: string | null | undefined
): boolean {
  const trimmed = (meaning ?? '').trim();
  if (trimmed === '') return false;
  const script = REQUIRED_SCRIPT[language];
  if (!script) return true; // Latin-script language: nothing to disambiguate
  return script.test(trimmed);
}
