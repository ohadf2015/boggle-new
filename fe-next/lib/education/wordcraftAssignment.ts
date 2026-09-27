/**
 * Word Craft as classroom homework (Blooket-Homework shape): a teacher assigns
 * a lesson, the student plays Word Craft solo against the bot from their
 * classroom home, and the teacher sees who finished it.
 *
 * Data path — NO schema change:
 *  - `lesson_assignments` has no mode column, so the mode rides on
 *    `practice_focus` (CHECK widened by migration
 *    20260918210000_lesson_assignments_practice_focus_wordcraft.sql):
 *      'wordcraft'   → Word Craft (the dialog's recommended default)
 *      NULL / 'any'  → student picks any game (unchanged legacy meaning —
 *                      legacy rows, create-and-assign and duels stay here)
 *      <vocab focus> → that targeted drill
 *  - `practice_sessions.practice_type` is CHECK-locked too, so a Word Craft round
 *    records as `solo_board` with the unconstrained `mode` column set to
 *    'wordcraft' — the same trick `vocab_focus` uses for its focus.
 *  - Completion stamps `student_lesson_progress.assignment_id/completed_at`,
 *    which is what the teacher's assignment tracking already reads.
 */

import type { Language } from '@/lib/supabase/education/types';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { isVocabFocus, type PracticeFocusSetting } from './vocabFocus';

/** Value written to `practice_sessions.mode` for a Word Craft round. */
export const WORDCRAFT_SESSION_MODE = 'wordcraft';

/** `practice_focus` value that marks a Word Craft assignment. */
export const WORDCRAFT_FOCUS = 'wordcraft';

export type AssignmentMode = typeof WORDCRAFT_FOCUS | PracticeFocusSetting;

/** Every value the app may write to `lesson_assignments.practice_focus`. */
export type AssignmentFocusValue = PracticeFocusSetting | typeof WORDCRAFT_FOCUS;

export function isAssignmentFocusValue(value: unknown): value is AssignmentFocusValue {
  return value === WORDCRAFT_FOCUS || value === 'any' || isVocabFocus(value);
}

/** What the student is steered to by this assignment; null = not assigned. */
export function readAssignmentMode(assignment: unknown): AssignmentMode | null {
  if (!assignment || typeof assignment !== 'object') return null;
  const focus = (assignment as { practice_focus?: unknown }).practice_focus;
  if (focus === WORDCRAFT_FOCUS) return 'wordcraft';
  return isVocabFocus(focus) ? focus : 'any';
}

/** The `practice_focus` value that stores this mode ('any' keeps the legacy NULL). */
export function practiceFocusForMode(mode: AssignmentMode): AssignmentFocusValue | null {
  return mode === 'any' ? null : mode;
}

export function wordCraftPracticeHref(locale: string, lessonId: string): string {
  return `/${locale}/student/lessons/${lessonId}?mode=solo_board&variant=${WORDCRAFT_SESSION_MODE}`;
}

/**
 * Lesson words the PLAYER built during a game (bot moves excluded), canonical,
 * each once. Matched through `canonLessonWord` so Hebrew final forms and
 * accents compare equal — a bare toUpperCase() makes them unmatchable.
 */
export function lessonWordsPlayed(
  history: ReadonlyArray<{ who: 'player' | 'bot'; words: readonly string[] }>,
  lessonWords: readonly string[],
  language: Language,
): string[] {
  const targets = new Set(lessonWords.map((w) => canonLessonWord(w, language)));
  const found = new Set<string>();
  for (const move of history) {
    if (move.who !== 'player') continue;
    for (const word of move.words) {
      const canon = canonLessonWord(word, language);
      if (targets.has(canon)) found.add(canon);
    }
  }
  return [...found];
}

/** Does this finished session satisfy an assignment of this mode? */
export function sessionCompletesAssignment(
  mode: AssignmentMode,
  session: { mode?: string | null },
): boolean {
  if (mode === 'wordcraft') return session.mode === WORDCRAFT_SESSION_MODE;
  return true;
}

/**
 * The bar a Word Craft round must clear to count as homework done: at least one
 * lesson word built, or this many distinct valid words. Below it the round is
 * recorded as an attempt — passing straight to the bot's win is not homework.
 */
export const WORDCRAFT_MIN_VALID_WORDS = 3;

export function wordCraftAttemptIsMeaningful(round: {
  lessonWordsFound: readonly string[];
  validWordsFound: readonly string[];
}): boolean {
  if (round.lessonWordsFound.length > 0) return true;
  return new Set(round.validWordsFound.map((w) => w.toUpperCase())).size >= WORDCRAFT_MIN_VALID_WORDS;
}
