/**
 * Classroom results extras — the podium, and honest misses.
 *
 * `buildClassroomSummary` answers "which lesson words landed". These two pure
 * helpers answer the two questions that come BEFORE that on the screen at the
 * front of the room:
 *
 *  - who won (podium, humans only — a bot on the plinth is not a moment),
 *  - and of the words nobody found, which were never on the board at all.
 *
 * The second one matters because the board generator embeds what fits: a
 * measured 6x6 carried 1 of 9 lesson words (see classroomGameManager). Without
 * the split, a teacher reteaches vocabulary the class was never shown.
 *
 * Kept out of `classroomSummary.ts` and out of `gameScores.ts` so both stay
 * where they are, and so this logic is unit-testable without a live game.
 */

import { matchKey } from './classroomSummary';
import type { Language } from '@/shared/types/game';
import type { ClassroomPodiumEntry, ClassroomPlayerMastery } from '@/shared/types/classroom';

export interface PodiumPlayerInput {
  username: string;
  totalScore: number;
  isBot?: boolean;
}

export interface BuildClassroomPodiumArgs {
  /** Final scores, already sorted best-first by the score calculator. */
  players: PodiumPlayerInput[];
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
  limit?: number;
  /**
   * Names that are in the room but are not contestants — the teacher. A
   * classroom host is forced into broadcast mode yet still holds a socket, so
   * the score calculator ranks their zero, and on a slow round it sorts first:
   * a real projector read "WE HAVE A WINNER! Mr. Gauntlet B — 0" over three
   * children. Dropped BEFORE the slice, because dropping it afterwards costs a
   * three-student class its third plinth.
   */
  exclude?: string[];
}

/**
 * Top N human players, in the order the score calculator ranked them. Rank is
 * position, not a tie-break rule — the server already decided the order and two
 * places in the room must never disagree about it.
 */
export function buildClassroomPodium({
  players,
  masteryByPlayer,
  limit = 3,
  exclude = [],
}: BuildClassroomPodiumArgs): ClassroomPodiumEntry[] {
  const excluded = new Set(exclude.map((n) => n.trim().toLowerCase()));
  return players
    .filter((p) => !p.isBot && !excluded.has(p.username.trim().toLowerCase()))
    .slice(0, limit)
    .map((p, index) => {
      const mastery = masteryByPlayer[p.username];
      const entry: ClassroomPodiumEntry = {
        username: p.username,
        score: p.totalScore,
        rank: index + 1,
      };
      // A late joiner has no mastery row. Omitting the counts renders "no
      // sub-line"; sending 0/N would accuse them of finding nothing.
      if (mastery) {
        entry.wordsFound = mastery.found;
        entry.totalWords = mastery.total;
      }
      return entry;
    });
}

export interface SplitNeverPlacedArgs {
  /** Lesson words nobody in the room found. */
  missedWords: string[];
  /** Lesson words the generator actually embedded in the board, if known. */
  placedWords?: string[];
  language: Language;
}

/**
 * Of the missed words, the ones that were never on the board.
 *
 * An unknown or empty placed list means "we cannot tell" — return nothing, so
 * results fall back to the single reteach list rather than declaring every
 * missed word never-placed.
 *
 * Both sides go through `matchKey`: the board records normalized traces
 * (Hebrew finals collapsed), the lesson holds natural spellings.
 */
export function splitNeverPlacedWords({
  missedWords,
  placedWords,
  language,
}: SplitNeverPlacedArgs): string[] {
  if (!Array.isArray(placedWords) || placedWords.length === 0) return [];
  const placed = new Set(placedWords.map((w) => matchKey(w, language)));
  return missedWords.filter((w) => !placed.has(matchKey(w, language)));
}
