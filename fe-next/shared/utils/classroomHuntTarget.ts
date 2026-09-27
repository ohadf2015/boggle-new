/**
 * Teacher-chosen Word Hunt target.
 *
 * Word Hunt normally picks its own target from the solved board. In a classroom
 * game the teacher may pin it to a specific word from their lesson — "today we
 * are hunting NEUTRON" — which is the difference between a word game that
 * happens in a classroom and a lesson that happens to be a game.
 *
 * Both the setup UI and the server import this: the picker only offers what the
 * server will accept, and the server re-validates because a socket payload is
 * never trusted.
 */

import {
  HUNT_TARGET_MIN_LENGTH,
  HUNT_TARGET_MAX_LENGTH,
} from '../constants/wordHuntMultiplayerConstants';

// Re-exported so a picker UI can explain the band without reaching past this
// module for the numbers it enforces.
export { HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH };

/** Letters only — a hyphen or space can't be traced as one path on the board. */
const SINGLE_WORD = /^\p{L}+$/u;

export function isEligibleHuntTarget(word: string): boolean {
  const trimmed = word.trim();
  if (!SINGLE_WORD.test(trimmed)) return false;
  return (
    trimmed.length >= HUNT_TARGET_MIN_LENGTH && trimmed.length <= HUNT_TARGET_MAX_LENGTH
  );
}

/** The lesson words a teacher may pin as the hunted target, deduped. */
export function eligibleHuntTargets(vocabularyWords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of vocabularyWords) {
    const word = raw.trim();
    if (!isEligibleHuntTarget(word)) continue;
    const key = word.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

/**
 * Resolve a teacher's pick against the lesson it must come from.
 * Returns the word as the lesson spells it, or null to mean "pick randomly".
 */
export function resolveTeacherHuntTarget(
  picked: string | undefined | null,
  vocabularyWords: string[]
): string | null {
  if (!picked) return null;
  const key = picked.trim().toUpperCase();
  const match = eligibleHuntTargets(vocabularyWords).find(
    (w) => w.toUpperCase() === key
  );
  return match ?? null;
}
