/**
 * Per-student differentiation.
 *
 * A teacher tags each lesson word with a tier (`VocabularyWord.level`, absent =
 * `core`) and gives each student ONE level on `classroom_memberships.level`.
 * The live Boggle board is shared, so a level cannot change the grid — it
 * decides which tiers the student practises alone (this file) and what
 * scaffolding they get in a live game (`StudentWordBank`).
 *
 * Tier semantics (asked for by a 6th–8th grade special-ed ELA teacher whose
 * one class spans several reading levels):
 *   support   → practises support + core words; sees a word bank live.
 *   core      → default; practises support + core words.
 *   challenge → practises every word incl. challenge; gets a longer-word target.
 *
 * Pure: no React, no I/O — safe to unit-test and to call in render.
 */
import type { VocabularyLevel, VocabularyWord } from '@/lib/supabase/education/types';

export const LEVEL_ORDER: readonly VocabularyLevel[] = ['support', 'core', 'challenge'] as const;

export function isVocabularyLevel(value: unknown): value is VocabularyLevel {
  return typeof value === 'string' && (LEVEL_ORDER as readonly string[]).includes(value);
}

/** A word's tier; absent (older lessons) means core. */
export function wordLevel(word: Pick<VocabularyWord, 'level'>): VocabularyLevel {
  return isVocabularyLevel(word.level) ? word.level : 'core';
}

/**
 * The words a student at `level` should practise, in lesson order.
 *
 * `support` and `core` see the same list on purpose: support is scaffolding,
 * not a smaller vocabulary. Only `challenge` unlocks challenge-tier words.
 * A garbage/undefined level degrades to core, and a lesson that is ALL
 * challenge words is returned whole rather than as an empty practice set.
 */
export function wordsForLevel<W extends Pick<VocabularyWord, 'level'>>(
  words: readonly W[],
  level: VocabularyLevel | null | undefined
): W[] {
  const effective = isVocabularyLevel(level) ? level : 'core';
  if (effective === 'challenge' || words.length === 0) return words as W[];
  const filtered = words.filter((w) => wordLevel(w) !== 'challenge');
  return filtered.length > 0 ? filtered : (words as W[]);
}

/** i18n key for a level's short label (teacher-side namespace). */
export function levelLabelKey(level: VocabularyLevel): string {
  return `teacher.levels.${level}`;
}
