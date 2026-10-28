// Pure data layer for the Blast multiplayer results scene. Kept framework-free
// so the ranking + "where am I" logic is unit-testable without rendering Pixi/GSAP.

import type { Avatar } from '@/shared/types/game';
import { compareBlastStandings, type BlastCollectionScore } from '@/shared/utils/blastCollectionScore';

export interface BlastMpPlayerResult {
  username: string;
  score: number;
  wordsFoundCount: number;
  avatar?: Avatar;
  isCurrentPlayer?: boolean;
  /** Only the local client whose move cleared the shared board carries this. */
  boardCleared?: boolean;
  /** Optional delight stats, threaded from blastPlayerStats when available. */
  bestWord?: string;
  maxCombo?: number;
  coinsCollected?: number;
  diamondsCollected?: number;
  scoreBreakdown?: BlastScoreBreakdown;
}

export type BlastScoreBreakdown = Pick<BlastCollectionScore, 'coinPoints' | 'diamondPoints' | 'total'>;

export interface BlastMpCollectionStats {
  maxCombo?: number;
  bestWord?: string;
  coinsCollected?: number;
  diamondsCollected?: number;
  gemsCollected?: number;
}

export interface RankedBlastPlayer extends BlastMpPlayerResult {
  rank: number;
}

export interface BlastMpRanking {
  ranked: RankedBlastPlayer[];
  winner: RankedBlastPlayer | null;
  runnersUp: RankedBlastPlayer[];
  /** 1-based position of the current player, or null if none is flagged. */
  currentPosition: number | null;
  totalPlayers: number;
}

/** Score entry shape the builder accepts (subset of the results `PlayerScore`). */
interface BlastScoreInput {
  username: string;
  score: number;
  wordsFoundCount?: number;
  avatar?: Avatar;
}

interface BuildOpts {
  boardClearedByLocal: boolean;
  localUsername?: string;
  /** Per-player blast stats keyed by username. */
  playerStats?: Record<string, BlastMpCollectionStats>;
  /** Server-computed collection points per player (`blastSummary.collection`). */
  collection?: Record<string, BlastCollectionScore>;
}

/**
 * Pure mapper: MP scoreboard rows → BlastMpPlayerResult. The board-cleared badge
 * only marks the LOCAL player, since the store flag only flips for the client
 * whose move cleared the shared board.
 */
export function buildBlastMpResults(
  scores: BlastScoreInput[],
  opts: BuildOpts,
): BlastMpPlayerResult[] {
  return scores.map((p) => {
    const stats = opts.playerStats?.[p.username];
    const collection = opts.collection?.[p.username];
    return {
      username: p.username,
      score: p.score,
      wordsFoundCount: p.wordsFoundCount ?? 0,
      avatar: p.avatar,
      isCurrentPlayer: !!opts.localUsername && p.username === opts.localUsername,
      boardCleared: opts.boardClearedByLocal && p.username === opts.localUsername,
      bestWord: stats?.bestWord,
      maxCombo: stats?.maxCombo,
      coinsCollected: stats?.coinsCollected ?? collection?.breakdown.coins.count,
      diamondsCollected: stats?.diamondsCollected ?? collection?.breakdown.diamonds.count ?? stats?.gemsCollected,
      scoreBreakdown: collection,
    };
  });
}

/**
 * Sort by score, assign ranks, and surface the winner + the current player's
 * position. The position is the load-bearing answer to "where did I place?" —
 * computed for everyone, not just the top 3.
 */
export function rankBlastMpPlayers(results: BlastMpPlayerResult[]): BlastMpRanking {
  const ranked: RankedBlastPlayer[] = [...results]
    .sort(compareBlastStandings)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  const winner = ranked[0] ?? null;
  const me = ranked.find((r) => r.isCurrentPlayer) ?? null;

  return {
    ranked,
    winner,
    runnersUp: ranked.slice(1),
    currentPosition: me ? me.rank : null,
    totalPlayers: ranked.length,
  };
}

/** Top collector per category; ties go to the better-placed player, zero counts win nothing. */
export function pickBlastCategoryWinners(ranked: RankedBlastPlayer[]): {
  coinKing: string | null;
  mostDiamonds: string | null;
} {
  const top = (pick: (p: RankedBlastPlayer) => number | undefined) =>
    ranked.reduce<RankedBlastPlayer | null>((best, p) => {
      const v = pick(p) ?? 0;
      return v > 0 && v > (best ? pick(best) ?? 0 : 0) ? p : best;
    }, null)?.username ?? null;
  return { coinKing: top((p) => p.coinsCollected), mostDiamonds: top((p) => p.diamondsCollected) };
}
