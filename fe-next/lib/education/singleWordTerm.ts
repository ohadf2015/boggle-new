/**
 * Teacher word lists feed the letter board, and the board can only place a
 * single run of letters. "Rely on", "Blood transfusion" or "well-being" can
 * never be found on a grid, so they are rejected before a list is saved —
 * in the editor, in bulk/paste import, in the save helpers and (for new terms)
 * by a database trigger (migration 20261021150000_reject_multi_word_lesson_terms).
 *
 * A term is multi-word when whitespace or a joining mark (hyphen, dash,
 * underscore, slash, middle dot, Hebrew maqaf) sits between two characters. Other characters
 * keep their existing handling (lib/education/library.ts wordIssue): this
 * guard is only about terms that are really two or more words.
 */

export type TermProblem = 'multi_word';

const SEP = '\\s\\-‐‑‒–—_/·־';
/**
 * A separator run between two non-separator characters. Kept in step with the
 * Postgres pattern in migration 20261021150000_reject_multi_word_lesson_terms.
 */
const MULTI_WORD = new RegExp(`[^${SEP}][${SEP}]+[^${SEP}]`, 'u');

/** Why a (trimmed) term cannot be played on the board, or null if it can. */
export function termProblem(term: string): TermProblem | null {
  const t = (term ?? '').trim();
  if (!t) return null; // empty terms are dropped elsewhere
  if (MULTI_WORD.test(t)) return 'multi_word';
  return null;
}

export function isMultiWordTerm(term: string): boolean {
  return termProblem(term) === 'multi_word';
}

export function isSingleWordTerm(term: string): boolean {
  const t = (term ?? '').trim();
  return t.length > 0 && termProblem(t) === null;
}

/** Split terms into the playable ones and the rejected ones (original text kept). */
export function partitionTerms(terms: readonly string[]): { valid: string[]; rejected: string[] } {
  const valid: string[] = [];
  const rejected: string[] = [];
  for (const raw of terms) {
    const t = (raw ?? '').trim();
    if (!t) continue;
    if (termProblem(t)) rejected.push(t);
    else valid.push(t);
  }
  return { valid, rejected };
}

/** Rejected terms in a list of `{ word }` rows (lesson words). */
export function invalidLessonTerms(words: ReadonlyArray<{ word?: string | null }> | null | undefined): string[] {
  if (!Array.isArray(words)) return [];
  return words
    .map((w) => (typeof w?.word === 'string' ? w.word.trim() : ''))
    .filter((w) => w.length > 0 && termProblem(w) !== null);
}

/** Stable error code the save helpers return so the UI can localize it. */
export const INVALID_TERMS_ERROR = 'lesson_terms_not_single_words';

/**
 * Translation key for the rejection message. Takes {{terms}} (see
 * formatRejectedTerms). Present in every locale under teacher.lesson.
 */
export const SINGLE_WORDS_ONLY_KEY = 'teacher.lesson.singleWordsOnly';

/** Short preview of rejected terms for a toast: first three, then "+N". */
export function formatRejectedTerms(terms: readonly string[], max = 3): string {
  const shown = terms.slice(0, max).map((t) => `"${t}"`).join(', ');
  return terms.length > max ? `${shown} +${terms.length - max}` : shown;
}

/**
 * Copy of a word list without its multi-word rows — used when a teacher copies
 * an older public or curriculum list. The source list is left untouched.
 */
export function withoutMultiWordTerms<T extends { word?: string | null }>(words: readonly T[] | null | undefined): T[] {
  if (!Array.isArray(words)) return [];
  return words.filter((w) => !(typeof w?.word === 'string' && isMultiWordTerm(w.word)));
}
