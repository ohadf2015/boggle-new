/**
 * Pure model behind the teacher's live class count and "who is idle" chip.
 *
 * Two sources feed it and they resolve at different times (recurring-pitfall
 * Class 1): room MEMBERSHIP arrives on `updateUsers` (join/leave only), live
 * ACTIVITY arrives on `updateLeaderboard` (every accepted word). Membership is
 * authoritative for who is in the room; activity is authoritative for who is
 * playing. The idle verdict is held back by a grace window rather than by the
 * arrival of data — an optimistic "everyone is stuck" first paint would put a
 * red chip on the projector in front of the whole class for no reason, but a
 * class where nobody has scored yet sends no payload at all and still has to
 * be flagged.
 */

/** A student is only called idle after this long with nothing found. */
export const IDLE_GRACE_MS = 45_000;

export interface ActivitySample {
  username: string;
  score?: number;
  wordsFound?: number;
}

export interface ActivityEntry {
  score: number;
  wordsFound: number;
}

export interface ActivityState {
  /** Live per-student totals, keyed by username. */
  byUser: Record<string, ActivityEntry>;
  /** Epoch ms the current round's activity window opened. */
  startedAt: number;
  /** True once any leaderboard payload has arrived. */
  hasData: boolean;
}

export interface RosterMember {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
}

export interface RosterRow {
  username: string;
  score: number;
  wordsFound: number;
  isIdle: boolean;
}

export interface ClassSummary {
  total: number;
  active: number;
  idle: number;
}

export function createActivityState(now: number): ActivityState {
  return { byUser: {}, startedAt: now, hasData: false };
}

/**
 * Fold one `updateLeaderboard` payload into the activity state.
 *
 * An all-zero payload arriving AFTER real play means the server zeroed scores
 * for a fresh round; the window restarts rather than carrying round N-1's
 * "everyone is active" verdict into round N (pitfall Class 2).
 */
export function applyLeaderboard(
  state: ActivityState,
  entries: ActivitySample[],
  now: number,
): ActivityState {
  const hadPlay = Object.values(state.byUser).some((e) => e.wordsFound > 0);
  const allZero = entries.length > 0 && entries.every((e) => (e.wordsFound ?? 0) === 0);
  const isNewRound = hadPlay && allZero;

  const byUser: Record<string, ActivityEntry> = {};
  for (const entry of entries) {
    if (!entry?.username) continue;
    byUser[entry.username] = {
      score: entry.score ?? 0,
      wordsFound: entry.wordsFound ?? 0,
    };
  }

  return {
    byUser,
    startedAt: isNewRound ? now : state.startedAt,
    hasData: true,
  };
}

/**
 * Students only — the teacher's own host seat and every bot are dropped, so the
 * count on the projector is the number of children in the room.
 */
export function buildRoster(
  members: RosterMember[],
  state: ActivityState,
  now: number,
  hostUsername?: string,
): RosterRow[] {
  // Deliberately NOT gated on `state.hasData`: a class where NOBODY has found
  // anything never receives a leaderboard payload, and that whole-class-stuck
  // round is exactly the one the teacher needs flagged. The 45s window is what
  // stops a false "everyone is stuck" on the first paint of a fresh round.
  const pastGrace = now - state.startedAt >= IDLE_GRACE_MS;

  const rows = members
    .filter((m) => m?.username && !m.isHost && !m.isBot && m.username !== hostUsername)
    .map<RosterRow>((m) => {
      const entry = state.byUser[m.username];
      const wordsFound = entry?.wordsFound ?? 0;
      return {
        username: m.username,
        score: entry?.score ?? 0,
        wordsFound,
        isIdle: pastGrace && wordsFound === 0,
      };
    });

  // Idle first (that is the whole point of the list), then quietest, then A-Z.
  return rows.sort((a, b) => {
    if (a.isIdle !== b.isIdle) return a.isIdle ? -1 : 1;
    if (a.wordsFound !== b.wordsFound) return a.wordsFound - b.wordsFound;
    return a.username.localeCompare(b.username);
  });
}

export function summarizeClass(rows: RosterRow[]): ClassSummary {
  const idle = rows.filter((r) => r.isIdle).length;
  return { total: rows.length, active: rows.length - idle, idle };
}
