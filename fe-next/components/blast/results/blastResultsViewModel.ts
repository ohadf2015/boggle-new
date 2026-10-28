import type { BlastPlayerStats } from '@/shared/types/game';
import type { BlastCollectionScore } from '@/shared/utils/blastCollectionScore';
import type { BlastMpRanking, BlastScoreBreakdown } from '../legacy/blastMpRanking';
import type { BlastResultsData } from '../legacy/types';

export type BlastOutcomeTier = 'low' | 'mid' | 'high' | 'newBest';
export type BlastStatId = 'coins' | 'diamonds' | 'bombs' | 'combo' | 'words' | 'waves';

interface ScoredName { name: string; score: number }

export interface BlastResultsInput {
  score: number;
  coins?: number;
  diamonds?: number;
  bombsPopped?: number;
  maxCombo?: number;
  wordsFound?: readonly string[];
  bestWord?: string;
  longestWord?: string;
  wavesReached?: number;
  personalBest?: number | null;
  rank?: number | null;
  previousRank?: number | null;
  totalPlayers?: number | null;
  rival?: ScoredName | null;
  runnerUp?: ScoredName | null;
  failed?: boolean;
  stars?: 1 | 2 | 3;
  scoreBreakdown?: BlastScoreBreakdown | null;
}

/** Engine fields the SP payload may carry before `BlastResultsData` declares them. */
export interface BlastResultsExtras {
  bombsPopped?: number;
  rank?: number | null;
  previousRank?: number | null;
  totalPlayers?: number | null;
  rival?: ScoredName | null;
}

export type BlastMpStats = BlastPlayerStats;

export type BlastNextGoal =
  | { kind: 'rival'; name: string; gap: number }
  | { kind: 'lead'; name: string; gap: number }
  | { kind: 'personalBest'; gap: number };

export interface BlastStatChip { id: BlastStatId; value: number }

export interface BlastResultsView {
  score: number;
  tier: BlastOutcomeTier;
  isNewBest: boolean;
  pbDelta: number | null;
  stats: BlastStatChip[];
  bestWord: string | null;
  longestWord: string | null;
  rank: { current: number; total: number | null; delta: number | null } | null;
  nextGoal: BlastNextGoal | null;
  nearMiss: boolean;
  collectionBonus: BlastScoreBreakdown | null;
  celebrate: { coins: boolean; diamonds: boolean; confetti: boolean };
}

const SP_ADVANCE_CLEAR_PCT = 90;

function pickTier(input: BlastResultsInput, isNewBest: boolean): BlastOutcomeTier {
  if (input.failed) return 'low';
  if (isNewBest) return 'newBest';
  const best = input.personalBest ?? 0;
  if (best > 0) {
    const ratio = input.score / best;
    return ratio >= 0.8 ? 'high' : ratio >= 0.4 ? 'mid' : 'low';
  }
  if (input.rank && input.totalPlayers && input.totalPlayers > 1) {
    if (input.rank === 1) return 'high';
    return input.rank <= Math.ceil(input.totalPlayers / 2) ? 'mid' : 'low';
  }
  if (input.stars) return input.stars === 3 ? 'high' : input.stars === 2 ? 'mid' : 'low';
  return 'mid';
}

function pickNextGoal(input: BlastResultsInput, isNewBest: boolean): BlastNextGoal | null {
  if (input.rival && input.rival.score >= input.score) {
    return { kind: 'rival', name: input.rival.name, gap: input.rival.score - input.score + 1 };
  }
  if (input.rank === 1 && input.runnerUp) {
    return { kind: 'lead', name: input.runnerUp.name, gap: input.score - input.runnerUp.score };
  }
  const best = input.personalBest ?? 0;
  if (best > 0 && !isNewBest) return { kind: 'personalBest', gap: best - input.score + 1 };
  return null;
}

function bonusOf(b: BlastScoreBreakdown | null | undefined): BlastScoreBreakdown | null {
  const total = (b?.coinPoints ?? 0) + (b?.diamondPoints ?? 0);
  return b && total > 0 ? { coinPoints: b.coinPoints, diamondPoints: b.diamondPoints, total } : null;
}

function longestOf(words: readonly string[]): string | null {
  return words.reduce<string | null>((a, w) => (!a || w.length > a.length ? w : a), null);
}

export function toBlastResultsView(input: BlastResultsInput): BlastResultsView {
  const best = input.personalBest ?? 0;
  const isNewBest = best > 0 && input.score > best;
  const tier = pickTier(input, isNewBest);
  const nextGoal = pickNextGoal(input, isNewBest);
  const words = input.wordsFound ?? [];
  const coins = input.coins ?? 0;
  const diamonds = input.diamonds ?? 0;

  const stats: BlastStatChip[] = [];
  if (input.coins != null) stats.push({ id: 'coins', value: coins });
  stats.push({ id: 'diamonds', value: diamonds });
  if (input.bombsPopped != null) stats.push({ id: 'bombs', value: input.bombsPopped });
  if ((input.maxCombo ?? 0) > 1) stats.push({ id: 'combo', value: input.maxCombo! });
  if (words.length > 0) stats.push({ id: 'words', value: words.length });
  if (input.wavesReached != null) stats.push({ id: 'waves', value: input.wavesReached });

  const target = nextGoal && nextGoal.kind !== 'lead' ? input.score + nextGoal.gap : 0;
  const longest = input.longestWord || longestOf(words);
  const bestWord = input.bestWord ? input.bestWord.toUpperCase() : null;
  const longestUpper = longest ? longest.toUpperCase() : null;

  return {
    score: input.score,
    tier,
    isNewBest,
    pbDelta: isNewBest ? input.score - best : null,
    stats,
    bestWord,
    longestWord: longestUpper && longestUpper !== bestWord ? longestUpper : null,
    rank: input.rank
      ? {
          current: input.rank,
          total: input.totalPlayers ?? null,
          delta: input.previousRank ? input.previousRank - input.rank : null,
        }
      : null,
    nextGoal,
    nearMiss: target > 0 && nextGoal!.gap <= Math.max(25, Math.round(target * 0.1)),
    collectionBonus: bonusOf(input.scoreBreakdown),
    celebrate: { coins: coins > 0, diamonds: diamonds > 0, confetti: tier === 'high' || tier === 'newBest' },
  };
}

export function fromSpResults(r: BlastResultsData & BlastResultsExtras): BlastResultsInput {
  return {
    score: r.finalScore,
    coins: r.sessionCoins,
    diamonds: r.diamondsCollected,
    bombsPopped: r.bombsPopped,
    maxCombo: r.maxCombo,
    wordsFound: r.wordsFound,
    bestWord: r.bestWord,
    wavesReached: r.wavesCompleted,
    personalBest: r.previousBest ?? null,
    rank: r.rank ?? null,
    previousRank: r.previousRank ?? null,
    totalPlayers: r.totalPlayers ?? null,
    rival: r.rival ?? null,
    failed: r.clearPercentage < (r.passPct ?? SP_ADVANCE_CLEAR_PCT),
    stars: r.stars,
  };
}

export function fromMpResults(
  ranking: BlastMpRanking,
  playerStats: Record<string, BlastMpStats>,
  collection: Record<string, BlastCollectionScore> = {},
): BlastResultsInput | null {
  const me = ranking.ranked.find((p) => p.isCurrentPlayer);
  if (!me) return null;
  const stats = playerStats[me.username];
  const above = ranking.ranked[me.rank - 2];
  const below = ranking.ranked[me.rank];
  return {
    score: me.score,
    diamonds:
      stats?.diamondsCollected ?? collection[me.username]?.breakdown.diamonds.count ?? stats?.gemsCollected ?? me.diamondsCollected,
    coins: stats?.coinsCollected ?? collection[me.username]?.breakdown.coins.count ?? me.coinsCollected,
    bombsPopped: stats?.bombsPopped,
    scoreBreakdown: collection[me.username] ?? me.scoreBreakdown ?? null,
    maxCombo: stats?.maxCombo ?? me.maxCombo,
    wordsFound: stats?.wordsFound,
    bestWord: stats?.bestWord ?? me.bestWord,
    rank: me.rank,
    totalPlayers: ranking.totalPlayers,
    rival: above ? { name: above.username, score: above.score } : null,
    runnerUp: me.rank === 1 && below ? { name: below.username, score: below.score } : null,
  };
}
