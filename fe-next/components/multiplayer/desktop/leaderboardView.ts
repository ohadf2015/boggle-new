import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/**
 * Input shape fed into the live leaderboard (mirrors {@link RosterPlayer} in
 * RosterRail). Kept separate so the view-model is testable without React.
 */
export interface RosterPlayerInput {
  userId: string;
  username: string;
  score: number;
  wordCount?: number;
  status: 'connected' | 'disconnected';
  isYou?: boolean;
  customAvatar?: CustomAvatarConfig | null;
}

/** One player's position the previous time the view was built. */
export interface PrevSnapshotEntry {
  rank: number;
  score: number;
}

/** A row enriched with the "live" signals the UI animates on. */
export interface LeaderboardRow extends RosterPlayerInput {
  /** 1-based rank, highest score first. */
  rank: number;
  /** prevRank - rank: positive = climbed, negative = dropped, 0 = same / new. */
  rankDelta: number;
  /** score - prevScore: positive = just scored (drives the pop), 0 = no change / new. */
  scoreDelta: number;
  /** Sole rank-1 player who has actually scored — never a 0-0 game-start tie. */
  isLeader: boolean;
  /** Width of the progress bar, 0..100, relative to the current top score. */
  pctOfMax: number;
}

export interface LeaderboardView {
  rows: LeaderboardRow[];
  /** Snapshot to stash and feed back as `prevById` on the next build. */
  snapshot: Map<string, PrevSnapshotEntry>;
}

/**
 * Pure view-model for the live MP leaderboard. Sorts by score, then derives
 * rank/score deltas against the previous snapshot so the renderer can animate
 * climbs (rankDelta) and score pops (scoreDelta) without holding any logic.
 *
 * Stateless by design: the caller owns the prev snapshot (a ref updated in an
 * effect *after* commit), so render N compares against render N-1.
 */
export function buildLeaderboardView(
  players: RosterPlayerInput[],
  prevById: Map<string, PrevSnapshotEntry>,
): LeaderboardView {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  let maxScore = 1;
  for (const pl of sorted) if (pl.score > maxScore) maxScore = pl.score;

  const rows: LeaderboardRow[] = sorted.map((pl, idx) => {
    const rank = idx + 1;
    const prev = prevById.get(pl.userId);
    return {
      ...pl,
      rank,
      rankDelta: prev ? prev.rank - rank : 0,
      scoreDelta: prev ? pl.score - prev.score : 0,
      isLeader: rank === 1 && pl.score > 0,
      pctOfMax: Math.min(100, (pl.score / maxScore) * 100),
    };
  });

  const snapshot = new Map<string, PrevSnapshotEntry>();
  for (const r of rows) snapshot.set(r.userId, { rank: r.rank, score: r.score });

  return { rows, snapshot };
}
