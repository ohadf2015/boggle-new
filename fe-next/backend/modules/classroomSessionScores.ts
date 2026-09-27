/**
 * Cumulative scores across every round of one classroom session.
 *
 * A classroom rematch restages the same room: `resetGame` → `startGame` on the
 * same `gameCode`, and `resetGameForNewRound` calls
 * `scoreManager.resetScoresForNewRound` (`gameStateManager.ts:332`). That is
 * correct for the board — each round is a fresh race — but it means every
 * round's podium is its own reset-to-zero contest and nothing adds them up. A
 * teacher who ran several rounds in one period reported on 2026-09-14 that "by
 * the end we weren't sure who had actually won"; no screen in the product could
 * have told her, because the number did not exist.
 *
 * Kept PURE, and separate from `classroomGameManager`, so the arithmetic is
 * testable without Redis and so the round-end path owns its own read and write.
 * The totals live on the classroom game's Redis record, which already survives
 * the round boundary — the room in `gameStateManager` does not.
 */

/**
 * Running totals as stored on the classroom game record.
 *
 * Keyed by the NORMALISED username (trimmed, lower-cased) and carrying the
 * display form alongside. Guest students retype their nickname on every join,
 * so "Ana" in round one and "ana" in round two is one child, not two half-
 * scored ones — and `/api/education/guest-name` already treats a roster
 * nickname as case-insensitive, so this is the same rule, not a new one.
 *
 * A student who deliberately RENAMES mid-session (`updateGuestName`,
 * `gameLifecycleHandler.ts:736`) still splits into two rows. Accepted: the room
 * itself is username-keyed (`game.users`), so the podium has the same property,
 * and a teacher-run classroom rarely renames mid-lesson. Re-key on the socket's
 * stable auth id if that ever stops being true.
 */
export type ClassroomSessionScores = Record<string, { name: string; score: number; rounds: number }>;

/** One row of the session leaderboard. */
export interface ClassroomSessionStanding {
  username: string;
  /** Summed across every round this student played. */
  totalScore: number;
  roundsPlayed: number;
  rank: number;
}

interface RoundPlayer {
  username: string;
  totalScore: number;
  isBot?: boolean;
}

const key = (name: string): string => name.trim().toLowerCase();

/**
 * Fold one finished round into the session's running totals.
 *
 * Absent students keep what they had — sitting a round out is normal in a
 * classroom and must not cost a student their session score. A student who
 * joins late starts counting from the round they actually played, which is why
 * `rounds` is per-student rather than a single session counter.
 */
export function accumulateSessionScores(
  previous: ClassroomSessionScores | undefined,
  roundPlayers: RoundPlayer[],
  exclude: string[] = []
): ClassroomSessionScores {
  const excluded = new Set(exclude.map(key));
  const totals: ClassroomSessionScores = { ...(previous ?? {}) };

  for (const player of roundPlayers) {
    // The teacher holds a socket but never plays (classroom rooms force
    // broadcast), and a bot is not a member of the class.
    if (player.isBot || excluded.has(key(player.username))) continue;

    const id = key(player.username);
    const running = totals[id];
    totals[id] = {
      // Keep the FIRST spelling seen: it is the one the class watched win
      // round one, and flipping the wall's spelling between rounds reads as a
      // different child.
      name: running?.name ?? player.username,
      score: (running?.score ?? 0) + (player.totalScore || 0),
      rounds: (running?.rounds ?? 0) + 1,
    };
  }

  return totals;
}

/**
 * The session leaderboard, best first.
 *
 * Ties break by name, not by insertion order: a projector that reshuffles two
 * equal students between renders reads as a bug from the back of a room.
 */
export function toSessionStandings(
  totals: ClassroomSessionScores | undefined
): ClassroomSessionStanding[] {
  return Object.values(totals ?? {})
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(({ name, score, rounds }, index) => ({
      username: name,
      totalScore: score,
      roundsPlayed: rounds,
      rank: index + 1,
    }));
}
