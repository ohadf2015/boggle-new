/**
 * Pure overtake detection for the live multiplayer leaderboard.
 *
 * "Overtake" means specifically: another player crossed FROM below me TO above
 * me between two snapshots — i.e. my rank degraded *because of them*. This is
 * deliberately narrower than a generic rank-change arrow (which also fires when
 * I gain), so the mobile "{name} passed you!" cue only fires when someone
 * actually passed me. Mirrors the host-side `useTvNotifications` overtake logic.
 */

export interface RankedPlayer {
  username: string;
  score: number;
}

export interface OvertakeResult {
  /** My current 1-based rank, or 0 if I'm not on the board. */
  myRank: number;
  /** Usernames that crossed from below me to above me since the previous snapshot. */
  overtakenBy: string[];
}

/** Map username -> 1-based rank from a best-first ordered leaderboard. */
function rankMap(board: RankedPlayer[]): Map<string, number> {
  const m = new Map<string, number>();
  board.forEach((p, i) => m.set(p.username, i + 1));
  return m;
}

export function detectOvertakes(
  prev: RankedPlayer[],
  next: RankedPlayer[],
  me: string,
): OvertakeResult {
  const nextRanks = rankMap(next);
  const myRank = nextRanks.get(me) ?? 0;

  // Need to be present in the current board to be overtaken.
  if (myRank === 0 || prev.length === 0) {
    return { myRank, overtakenBy: [] };
  }

  const prevRanks = rankMap(prev);
  const myPrevRank = prevRanks.get(me);
  // No previous position for me — can't say anyone crossed.
  if (myPrevRank === undefined) {
    return { myRank, overtakenBy: [] };
  }

  // My rank improved or held — nobody passed me.
  if (myRank <= myPrevRank) {
    return { myRank, overtakenBy: [] };
  }

  const overtakenBy: string[] = [];
  for (const p of next) {
    if (p.username === me) continue;
    const theirNextRank = nextRanks.get(p.username)!;
    // Only those now ABOVE me.
    if (theirNextRank >= myRank) continue;
    const theirPrevRank = prevRanks.get(p.username);
    // Crossed if they were previously below me (worse rank) or weren't present.
    if (theirPrevRank === undefined || theirPrevRank > myPrevRank) {
      overtakenBy.push(p.username);
    }
  }

  return { myRank, overtakenBy };
}
