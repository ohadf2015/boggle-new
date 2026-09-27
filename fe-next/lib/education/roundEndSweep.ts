/**
 * Did the class sweep the round?
 *
 * WHY THIS IS NOT `classFoundCount >= totalWords`, which is what both surfaces
 * asked before: `classroomSummary` sets `totalWords = canonical.size` — every
 * word in the lesson — but the board generator embeds only as many as fit. A
 * real round's server log reads `Game VHT76G board carries 8/30 lesson words`.
 * The 22 words that never reached the board cannot be found by anyone, so the
 * old comparison could not come out true in any round with a partial board,
 * which is every normal round.
 *
 * That is why the sweep meter has never burst, the sweep chime has never
 * played, and a capture agent asked to "exercise the sweep" was being sent
 * after a state the game could not produce.
 *
 * A sweep is the class finding every lesson word THAT WAS ACTUALLY ON THE
 * BOARD. The server already reports the rest as `neverPlacedWords`.
 *
 * ONE helper, used by the projector and the phone, because the two renderers
 * must never disagree about whether the room swept it (Pitfall Class 3: two
 * renderers computing the same number independently WILL drift).
 */

export interface ClassSweptArgs {
  /** Every word in the lesson, as the server counts them. */
  totalWords: number;
  /** Distinct lesson words at least one student found. */
  classFoundCount: number;
  /**
   * Lesson words the board generator never embedded. `undefined` means the
   * server did not say — NOT that none were missing.
   */
  neverPlacedCount: number | undefined;
}

export function classSwept({
  totalWords,
  classFoundCount,
  neverPlacedCount,
}: ClassSweptArgs): boolean {
  if (totalWords <= 0) return false;

  // Unknown provenance: fall back to the strict rule rather than inventing a
  // celebration. An unknown source is never proof.
  if (typeof neverPlacedCount !== 'number') {
    return classFoundCount >= totalWords;
  }

  const onBoard = totalWords - neverPlacedCount;
  // A board that carried none of the lesson's words has nothing to sweep, and
  // a nonsense count must not underflow into "everything found".
  if (onBoard <= 0) return false;

  return classFoundCount >= onBoard;
}

export default classSwept;
