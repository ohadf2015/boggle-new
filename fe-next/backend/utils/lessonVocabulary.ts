/**
 * Lesson-vocabulary matching — the single source of truth for "did the student
 * just find one of the teacher's target words?".
 *
 * There are two sides to this compare and they live in different files: the Set
 * is built at round start (gameStartHandler) and queried on every accepted word
 * (wordValidationHandler). When each side spelled its own normalization inline,
 * they drifted — a bare `.toUpperCase()` on both sides is only correct for
 * languages whose orthography has no alternate forms, which is English and
 * Swedish and nothing else here:
 *
 *   he — boards carry only regular-form letters (`hebrewLetters` in
 *        backend/utils/gameUtils.ts has no ך ם ן ף ץ), so the sofit spelling a
 *        teacher correctly types can never be traced by a student.
 *   ru — Ё is deliberately absent from the board pool because it folds to Е at
 *        validate time; an unfolded lesson entry was therefore unreachable.
 *   es — whether the match landed depended on the teacher and the board
 *        agreeing about accents.
 *
 * Both helpers below route through the same expression, so the two call sites
 * cannot disagree again. This mirrors `matchKey` in
 * backend/modules/classroomSummary.ts, which already does this for the
 * post-game teacher report — that path was fixed; this one was not.
 *
 * `normalizeWord` is imported from shared/utils (a leaf module) rather than
 * reusing `matchKey`, because pulling backend/modules/* into a handler is the
 * import that passes tsc/vitest/eslint and breaks only `npm run build`.
 */

import type { Language } from '@/shared/types';
import { lessonWordKey } from '@/shared/utils/wordNormalization';

/** The canonical key for one word in a given language — shared with the projector's live count. */
function lessonKey(word: string, language: Language): string {
  return lessonWordKey(word, language);
}

/**
 * Build the round's lesson-vocabulary Set from the teacher's raw word list.
 * Empty and whitespace-only entries are dropped.
 */
export function buildLessonVocabulary(
  words: readonly string[] | undefined,
  language: Language
): Set<string> {
  const vocab = new Set<string>();
  if (!words) return vocab;
  for (const word of words) {
    if (typeof word !== 'string') continue;
    const key = lessonKey(word, language);
    if (key.length > 0) vocab.add(key);
  }
  return vocab;
}

/**
 * Is `word` one of the round's lesson words? Safe to call when the round has no
 * lesson vocabulary (non-classroom games), which is the common case.
 */
export function isLessonWord(
  vocabulary: Set<string> | undefined,
  word: string,
  language: Language
): boolean {
  if (!vocabulary || vocabulary.size === 0) return false;
  if (typeof word !== 'string') return false;
  return vocabulary.has(lessonKey(word, language));
}
