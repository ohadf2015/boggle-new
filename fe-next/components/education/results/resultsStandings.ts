/**
 * The room's final order, narrowed to what a results card is allowed to know.
 *
 * The results payload's score rows are wide (`wordDetails`, achievements, MMR
 * deltas) and the classroom card needs three fields of them. Narrowing here
 * keeps the 1500-line results shell to one call instead of an inline map, and
 * it pins the contract that matters: the ORDER is the server's and is passed
 * through verbatim. A client that re-sorts is a second ranking, and two
 * rankings drift on the first tie — Class 3 in
 * `.claude/rules/60-recurring-pitfalls.md`.
 *
 * `isBot` rides along because the server's podium counts humans only; a card
 * that ranked a student against the bots would print "#3 of 4" above a podium
 * showing two names.
 */

export interface ResultsStanding {
  username: string;
  score: number;
  /** Bots are in the scores payload but never on the podium. */
  isBot?: boolean;
}

export function toStandings(
  scores: Array<{ username: string; score: number; isBot?: boolean }>
): ResultsStanding[] {
  return scores.map((p) => ({ username: p.username, score: p.score, isBot: p.isBot }));
}

