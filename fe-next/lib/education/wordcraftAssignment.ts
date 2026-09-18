/**
 * Word Craft as classroom homework (Blooket-Homework shape): a teacher assigns
 * a lesson, the student plays Word Craft solo against the bot from their
 * classroom home, and the teacher sees who finished it.
 *
 * Data path — NO schema change:
 *  - `lesson_assignments` has no mode column and `practice_focus` is CHECK-locked
 *    to 'any' + the six vocab focuses. So the mode rides on `practice_focus`:
 *      NULL        → Word Craft (the recommended default)
 *      'any'       → student picks any game
 *      <vocab focus> → that targeted drill
 *  - `practice_sessions.practice_type` is CHECK-locked too, so a Word Craft round
 *    records as `solo_board` with the unconstrained `mode` column set to
 *    'wordcraft' — the same trick `vocab_focus` uses for its focus.
 *  - Completion stamps `student_lesson_progress.assignment_id/completed_at`,
 *    which is what the teacher's assignment tracking already reads.
 */

import type { Language } from '@/lib/supabase/education/types';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { isPracticeFocusSetting, type PracticeFocusSetting } from './vocabFocus';

/** Value written to `practice_sessions.mode` for a Word Craft round. */
export const WORDCRAFT_SESSION_MODE = 'wordcraft';

export type AssignmentMode = 'wordcraft' | PracticeFocusSetting;

/** What the student is steered to by this assignment; null = not assigned. */
export function readAssignmentMode(assignment: unknown): AssignmentMode | null {
  if (!assignment || typeof assignment !== 'object') return null;
  const focus = (assignment as { practice_focus?: unknown }).practice_focus;
  if (focus === null || focus === undefined) return 'wordcraft';
  return isPracticeFocusSetting(focus) ? focus : 'any';
}

/** The `practice_focus` value that stores this mode. */
export function practiceFocusForMode(mode: AssignmentMode): PracticeFocusSetting | null {
  return mode === 'wordcraft' ? null : mode;
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
