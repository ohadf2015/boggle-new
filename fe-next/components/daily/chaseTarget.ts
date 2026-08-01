/**
 * chaseTarget — turns a daily leaderboard into a single closable gap.
 *
 * Daily boards here hold 2–8 players, so a percentile ("Top 38%") is noise and a
 * bare rank ("#3") is a verdict. What actually motivates at that size is a person
 * with a name and a number you can close: "42 points behind Maya".
 *
 * Two symmetric cases:
 *   chasing — someone is ahead of you; report who, and what it takes to pass them.
 *   leading — you are first and not alone; report who is closest behind, so the
 *             lead is something to defend rather than a finished result.
 *
 * A board of one produces nothing: being ahead of nobody is not a competitive fact.
 */

export interface ChaseParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  score: number;
  /** Word Hunt boards rank on efficiency rather than raw score. */
  efficiency_score?: number;
  rank_position: number;
}

export interface ChaseTarget {
  mode: 'chasing' | 'leading';
  rank: number;
  totalPlayers: number;
  /** Display name of the player immediately ahead (chasing) or behind (leading). */
  targetName: string;
  /**
   * Point difference to that player, or null when the visible metric cannot
   * explain the ranking (see below) and quoting a number would mislead.
   */
  pointsGap: number | null;
  /** Points required to overtake them; 0 when leading, null when unquotable. */
  pointsToPass: number | null;
}

export interface ChaseIdentity {
  playerId?: string | null;
  guestFingerprint?: string | null;
  /** Full board size when the rows in hand are a paginated slice. */
  totalPlayers?: number;
}

/** Word Hunt boards leave `score` at 0 and rank on efficiency instead. */
function metricOf(entry: ChaseParticipant): number {
  return entry.score || entry.efficiency_score || 0;
}

function isSelf(entry: ChaseParticipant, identity: ChaseIdentity): boolean {
  if (identity.playerId && entry.player_id === identity.playerId) return true;
  if (identity.guestFingerprint && entry.guest_fingerprint === identity.guestFingerprint) return true;
  return false;
}

export function computeChaseTarget(
  participants: ChaseParticipant[],
  identity: ChaseIdentity,
): ChaseTarget | null {
  const me = participants.find((entry) => isSelf(entry, identity));
  if (!me) return null;

  if (participants.length < 2) return null;
  const totalPlayers = Math.max(participants.length, identity.totalPlayers ?? 0);

  const rank = me.rank_position;
  // Look up by rank rather than array index — the API does not guarantee order.
  const neighbourRank = rank === 1 ? rank + 1 : rank - 1;
  const neighbour = participants.find((entry) => entry.rank_position === neighbourRank);
  if (!neighbour) return null;

  // Boards do not all rank on the number they display. daily_word_hunt_leaderboard
  // orders by `solved DESC, efficiency_score DESC, attempts_used, completed_at`, so
  // an unsolved player with a high efficiency score sits below a solved player with
  // a low one. Diffing the visible metric there would tell someone they are "40
  // behind" a player they are in fact beating on the only number on screen. When the
  // metric cannot account for the ranking, report the name without a number rather
  // than a confident wrong one.
  const rawGap = metricOf(neighbour) - metricOf(me);
  const gapExplainsRank = rank === 1 ? rawGap <= 0 : rawGap >= 0;
  const pointsGap = gapExplainsRank ? Math.abs(rawGap) : null;

  if (rank === 1) {
    return {
      mode: 'leading',
      rank,
      totalPlayers,
      targetName: neighbour.display_name,
      pointsGap,
      pointsToPass: pointsGap === null ? null : 0,
    };
  }

  return {
    mode: 'chasing',
    rank,
    totalPlayers,
    targetName: neighbour.display_name,
    pointsGap,
    pointsToPass: pointsGap === null ? null : pointsGap + 1,
  };
}
