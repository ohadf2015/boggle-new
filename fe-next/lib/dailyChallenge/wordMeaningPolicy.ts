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
