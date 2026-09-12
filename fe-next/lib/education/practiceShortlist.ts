/**
 * practiceShortlist — which practice a student is offered first.
 *
 * The picker used to lay fourteen tiles on the board at once and ask a twelve
 * year old to choose. That is the wrong question: almost every one of those
 * tiles drills the same eight words, so the difference between them matters far
 * less than getting the student *playing*. Fourteen equal choices is also the
 * exact shape of decision fatigue — a screen where nothing is recommended asks
 * the reader to do the ranking the product should have done for them.
 *
 * So the grid is scored here instead. One tile is the recommendation and gets a
 * poster the size of a hand; three more sit beside it; everything else — the
 * skills the lesson has not unlocked yet, the read-only word list, the deep cuts
 * — lives behind a single "more games" disclosure. A student who wants the
 * default taps once and plays. A student who wants the antonym drill is two taps
 * from it, and nobody has to read fourteen names to get to either.
 *
 * The ranking is deliberately boring and deterministic, because a recommendation
 * that moves between renders is worse than no recommendation:
 *
 *  1. **Something you have not played yet** wins. A new game is the most
 *     interesting thing the picker can offer, and it is also what spreads a
 *     student across the lesson's skills instead of leaving them in flashcards.
 *  2. Ties break on a fixed priority list that leads with the loudest modes.
 *     Blitz and the board are games; the word list is a reference sheet.
 *  3. The word list can only ever be recommended when nothing else is ready,
 *     because it awards no XP and drills nothing — it is the empty state, not a
 *     game.
 *
 * Pure and DOM-free on purpose: the picker renders whatever this returns, and
 * the ordering is unit-tested rather than eyeballed in a browser.
 */

import type { PracticeTile } from './practicePicker';

/** How many tiles sit beside the recommendation before "more games" takes over. */
export const SHORTLIST_SIZE = 3;

/**
 * Tie-break order. Games first, loudest first; the read-only list last.
 * Anything absent (the targeted vocabulary skills) sorts after everything named
 * here, which is correct: those are the follow-up drills, not the opener.
 */
const PRIORITY: readonly string[] = [
  'blitz',
  'spelling',
  'matching',
  'word_tower',
  'solo_board',
  'flashcard',
  'warmup',
];

/** The one tile that is a reference sheet rather than a drill. */
const READ_ONLY_TILE_ID = 'word_list';

/**
 * Tiles whose `sessions` count is not tracked.
 *
 * `student_practice_progress` has a column per base mode and none for Word
 * Tower or the targeted vocabulary skills, so `buildPracticeTiles` reports 0 for
 * those rather than inventing a number. Rule 1 below ("something you have not
 * played yet wins") would read that 0 as brand new forever: once a student had
 * played each counted game once, Word Tower would become the recommendation and
 * never give it back. An untracked tile therefore forfeits the new-game bonus
 * and is ranked on priority alone.
 */
function sessionsUntracked(tile: PracticeTile): boolean {
  return tile.variant === 'word_tower' || tile.id.startsWith('vocab_focus');
}

export interface PracticeShortlist {
  /** The single pre-selected tile. Null only when no tile is playable. */
  recommended: PracticeTile | null;
  /** Up to SHORTLIST_SIZE further ready tiles, shown small beside the hero. */
  alsoReady: PracticeTile[];
  /** Everything else — locked tiles, the word list, the deep cuts. */
  rest: PracticeTile[];
}

function priorityIndex(tile: PracticeTile): number {
  const index = PRIORITY.indexOf(tile.id);
  return index === -1 ? PRIORITY.length : index;
}

/**
 * Rank ready tiles: unplayed before played, then the fixed priority order, then
 * the id so the result is stable for two tiles that are equal on both counts.
 */
function compareReady(a: PracticeTile, b: PracticeTile): number {
  const aPlayed = a.sessions > 0 || sessionsUntracked(a) ? 1 : 0;
  const bPlayed = b.sessions > 0 || sessionsUntracked(b) ? 1 : 0;
  if (aPlayed !== bPlayed) return aPlayed - bPlayed;

  const aPriority = priorityIndex(a);
  const bPriority = priorityIndex(b);
  if (aPriority !== bPriority) return aPriority - bPriority;

  return a.id.localeCompare(b.id);
}

/**
 * Split the picker's tiles into hero / beside / behind-more.
 *
 * Every input tile comes back exactly once across the three buckets, so the
 * picker can render all of them without a set-difference of its own.
 */
export function practiceShortlist(tiles: PracticeTile[]): PracticeShortlist {
  const playable = tiles.filter((tile) => tile.ready && tile.id !== READ_ONLY_TILE_ID);
  const ranked = [...playable].sort(compareReady);

  // Nothing to drill: the word list becomes the offer, because "add words to
  // unlock" with no way at all to look at the lesson is a dead end.
  if (ranked.length === 0) {
    const readOnly = tiles.find((tile) => tile.ready && tile.id === READ_ONLY_TILE_ID) ?? null;
    return {
      recommended: readOnly,
      alsoReady: [],
      rest: tiles.filter((tile) => tile !== readOnly),
    };
  }

  const recommended = ranked[0];
  const alsoReady = ranked.slice(1, 1 + SHORTLIST_SIZE);
  const shortlisted = new Set<PracticeTile>([recommended, ...alsoReady]);

  return {
    recommended,
    alsoReady,
    rest: tiles.filter((tile) => !shortlisted.has(tile)),
  };
}
