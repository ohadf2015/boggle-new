import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/**
 * Identity-agnostic input for the closest-rivals selector. Each chassis (classic
 * desktop shell, blast stage) normalizes its own leaderboard shape into this and
 * flags exactly one entry with `isMe`, so the selection math never needs to know
 * whether "me" is keyed by userId (classic) or username (blast).
 */
export interface RivalInput {
  /** Stable per-player key (userId in classic, username in blast). */
  id: string;
  /** Display name. */
  name: string;
  score: number;
  isMe: boolean;
  isHost?: boolean;
  wordsFound?: number;
  /** Avatar config passthrough; the panel falls back to a userId-seeded avatar. */
  customAvatar?: CustomAvatarConfig | null;
}

export type RivalDirection = 'ahead' | 'behind' | 'tie';

export interface RivalRow extends RivalInput {
  /** 1-based GLOBAL rank across the whole leaderboard (not slice-local). */
  rank: number;
  /** score - myScore: positive = ahead of me, negative = behind, 0 = tie. */
  deltaToMe: number;
  direction: RivalDirection;
}

export interface ClosestRivalsView {
  /** Display slice (chosen rivals + me), sorted by score descending. */
  rows: RivalRow[];
  /** The "me" row (also present inside `rows`). */
  me: RivalRow;
  /** Total live players in the leaderboard (for "N players" headers). */
  total: number;
}

/**
 * Pick the `n` players whose scores are closest to mine and return a contiguous
 * standings slice (those rivals + me), sorted by score desc, each row carrying
 * its true global rank and a signed delta to me.
 *
 * "Closest" = smallest `|score - myScore|`. In a score-sorted list these are my
 * rank-neighbours; the edge cases (me at top/bottom, ties, tiny lobbies) are what
 * the logic guards. Returns `null` when there is no "me" or no rival to show
 * (single-player / solo) so callers can render nothing.
 *
 * Pure: never mutates the input.
 */
export function selectClosestRivals(players: RivalInput[], n = 3): ClosestRivalsView | null {
  const me = players.find((pl) => pl.isMe);
  if (!me) return null;
  if (players.length <= 1) return null;

  // Global rank: sort by score desc; ties keep input order (stable), so rank is
  // deterministic for equal scores.
  const ranked = [...players]
    .map((pl, inputIdx) => ({ pl, inputIdx }))
    .sort((a, b) => b.pl.score - a.pl.score || a.inputIdx - b.inputIdx);
  const rankById = new Map<string, number>();
  ranked.forEach(({ pl }, idx) => rankById.set(pl.id, idx + 1));

  const myScore = me.score;

  // Choose the n nearest rivals. Tie-break for equal |Δ|: prefer the rival AHEAD
  // of me (the one I'm chasing), then the better global rank, then id for full
  // determinism.
  const rivals = players
    .filter((pl) => !pl.isMe)
    .map((pl) => ({
      pl,
      absDelta: Math.abs(pl.score - myScore),
      ahead: pl.score > myScore,
    }))
    .sort((a, b) => {
      if (a.absDelta !== b.absDelta) return a.absDelta - b.absDelta;
      if (a.ahead !== b.ahead) return a.ahead ? -1 : 1;
      const ra = rankById.get(a.pl.id) ?? Infinity;
      const rb = rankById.get(b.pl.id) ?? Infinity;
      if (ra !== rb) return ra - rb;
      return a.pl.id < b.pl.id ? -1 : 1;
    })
    .slice(0, Math.max(0, n))
    .map((r) => r.pl);

  if (rivals.length === 0) return null;

  const toRow = (pl: RivalInput): RivalRow => {
    const deltaToMe = pl.score - myScore;
    const direction: RivalDirection = pl.isMe
      ? 'tie'
      : deltaToMe > 0
        ? 'ahead'
        : deltaToMe < 0
          ? 'behind'
          : 'tie';
    return { ...pl, rank: rankById.get(pl.id) ?? 0, deltaToMe, direction };
  };

  const rows = [...rivals, me]
    .map(toRow)
    .sort((a, b) => b.score - a.score || a.rank - b.rank);

  return { rows, me: toRow(me), total: players.length };
}
