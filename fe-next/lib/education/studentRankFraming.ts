import { selectClosestRivals } from '@/lib/leaderboard/selectClosestRivals';

/**
 * What a classroom student is allowed to see about the standings WHILE THE
 * ROUND IS RUNNING.
 *
 * The evidence (see `/tmp/edu-gauntlet/research.md` §1) is specific about what
 * does the damage: an *absolute* leaderboard position, visible continuously.
 * Bottom-ranked students stop trying to close the gap; the effect is mediated
 * by competence frustration caused by the position itself, and it is strong
 * enough to widen the achievement gap rather than narrow it. Personality
 * moderates it hard — the same board that motivates the competitive third of a
 * class demotivates the rest.
 *
 * Points are NOT the problem, and this module does not remove them. What it
 * removes is rank: there is no field here for a position, a total, or a
 * percentile, and the type makes that structural rather than a matter of
 * discipline at the call site.
 *
 * What replaces it is the documented alternative: relative/local rank — one
 * nearby peer instead of the whole room — alongside the student's own score,
 * which is not comparative at all. A student 24th of 28 sees "38 points, 12
 * behind Maya", which is a gap they can actually close in the next word.
 *
 * End-of-round standings are deliberately out of scope: the same research
 * treats bounded, post-hoc exposure as the acceptable form, so
 * `components/education/results/StudentRoundOutcome.tsx` keeps its placing.
 *
 * Pure; the gap arithmetic is delegated to `selectClosestRivals` so there is
 * one implementation of "who is nearest me" shared with the multiplayer rails.
 */

export type StudentRivalDirection = 'ahead' | 'behind' | 'tie';

export interface StudentRivalView {
  /** Display name of the single nearest classmate by score. */
  name: string;
  /** Unsigned points between us — the number a student can act on. */
  gap: number;
  direction: StudentRivalDirection;
}

export interface StudentRankFraming {
  /** My own points. Comparative to nobody. */
  myScore: number;
  /** My nearest neighbour, or null when I am the only one playing. */
  rival: StudentRivalView | null;
}

export function selectStudentRankFraming(
  leaderboard: ReadonlyArray<{ username: string; score: number }>,
  currentUsername: string,
): StudentRankFraming | null {
  const mine = leaderboard.find((entry) => entry.username === currentUsername);
  // Not on the board (spectator, late join before the first score) — the caller
  // renders nothing rather than a zero that looks like a failure.
  if (!mine) return null;

  const view = selectClosestRivals(
    leaderboard.map((entry) => ({
      id: entry.username,
      name: entry.username,
      score: entry.score,
      isMe: entry.username === currentUsername,
    })),
    1,
  );

  // `selectClosestRivals` returns null for a board of one. That is a real state
  // in a class — the first student in before anyone else has scored — and it
  // still deserves a score readout.
  const rivalRow = view?.rows.find((row) => !row.isMe) ?? null;

  return {
    myScore: mine.score,
    rival: rivalRow
      ? {
          name: rivalRow.name,
          gap: Math.abs(rivalRow.deltaToMe),
          direction: rivalRow.direction,
        }
      : null,
  };
}

export default selectStudentRankFraming;
