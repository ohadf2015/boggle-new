/**
 * ELO Rating System
 *
 * 1v1: Glicko-2 inspired ELO with K-factor adaptation.
 * Multiplayer: openskill Weng-Lin algorithm (proper N-player ranking).
 *
 * Key concepts:
 * - Rating: skill estimate (default 1000)
 * - RD (rating deviation): uncertainty in rating (default 350, min 50)
 * - K factor: 40 for new players (<30 games), 32 for veterans
 */
import { rating as osRating, rate as osRate } from 'openskill';

export const DEFAULT_RATING = 1000;
export const DEFAULT_RD = 350;
export const K_FACTOR = 32;
const PROVISIONAL_K_FACTOR = 40;
const PROVISIONAL_THRESHOLD = 30;
const MIN_RD = 50;
const RD_DECAY = 0.97;

export interface PlayerRating {
  rating: number;
  rd: number;
  gamesPlayed: number;
}

export interface RankTier {
  name: string;
  color: string;
  minRating: number;
}

/**
 * Calculate expected win probability for player A vs player B.
 * Standard ELO formula: 1 / (1 + 10^((ratingB - ratingA) / 400))
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Get dynamic K factor based on games played.
 * New players (<30 games) use K=40 for faster convergence.
 */
function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_THRESHOLD ? PROVISIONAL_K_FACTOR : K_FACTOR;
}

/**
 * Calculate new ratings after a 1v1 match.
 *
 * @param winner - Rating info for the winning player
 * @param loser - Rating info for the losing player
 * @returns Updated ratings for both players
 */
export function calculateNewRatings(
  winner: PlayerRating,
  loser: PlayerRating
): { winner: PlayerRating; loser: PlayerRating } {
  const expectedWin = expectedScore(winner.rating, loser.rating);
  const expectedLose = 1 - expectedWin;

  const winnerK = getKFactor(winner.gamesPlayed);
  const loserK = getKFactor(loser.gamesPlayed);

  const newWinnerRating = Math.round(winner.rating + winnerK * (1 - expectedWin));
  const newLoserRating = Math.max(0, Math.round(loser.rating + loserK * (0 - expectedLose)));

  return {
    winner: {
      rating: newWinnerRating,
      rd: Math.max(MIN_RD, Math.round(winner.rd * RD_DECAY * 100) / 100),
      gamesPlayed: winner.gamesPlayed + 1,
    },
    loser: {
      rating: newLoserRating,
      rd: Math.max(MIN_RD, Math.round(loser.rd * RD_DECAY * 100) / 100),
      gamesPlayed: loser.gamesPlayed + 1,
    },
  };
}

// Scale between our rating domain (default 1000) and openskill mu domain (default 25)
const RATING_SCALE = 0.025;

/**
 * Calculate new ratings for a multiplayer game (2-8 players).
 *
 * Uses the openskill Weng-Lin algorithm — a proper N-player ranking model
 * that correctly handles field size and uncertainty reduction.
 *
 * @param players - Array of players with id, current rating, and final placement
 * @returns Map of player id to new rating
 */
export function calculateMultiplayerRatings(
  players: Array<{ id: string; rating: PlayerRating; placement: number }>
): Map<string, PlayerRating> {
  const result = new Map<string, PlayerRating>();

  if (players.length === 0) return result;

  if (players.length === 1) {
    const p = players[0];
    result.set(p.id, { ...p.rating });
    return result;
  }

  // Sort ascending by placement so osRate receives teams in finish order
  const sorted = [...players].sort((a, b) => a.placement - b.placement);

  const teams = sorted.map((p) =>
    [osRating({ mu: p.rating.rating * RATING_SCALE, sigma: Math.max(p.rating.rd * RATING_SCALE, 0.01) })]
  );

  const updated = osRate(teams);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const os = updated[i][0];
    result.set(p.id, {
      rating: Math.max(0, Math.round(os.mu / RATING_SCALE)),
      rd: Math.max(MIN_RD, Math.round(os.sigma / RATING_SCALE)),
      gamesPlayed: p.rating.gamesPlayed + 1,
    });
  }

  return result;
}

/**
 * Rank tier thresholds (descending order for lookup).
 */
const RANK_TIERS: RankTier[] = [
  { name: 'Grandmaster', color: '#FF1493', minRating: 2000 },
  { name: 'Master', color: '#8B5CF6', minRating: 1800 },
  { name: 'Diamond', color: '#00FFFF', minRating: 1600 },
  { name: 'Platinum', color: '#E5E4E2', minRating: 1400 },
  { name: 'Gold', color: '#FFD700', minRating: 1200 },
  { name: 'Silver', color: '#C0C0C0', minRating: 1000 },
  { name: 'Bronze', color: '#CD7F32', minRating: 800 },
];

const UNRANKED_TIER: RankTier = { name: 'Unranked', color: '#666', minRating: 0 };

/**
 * Get the rank tier for a given rating.
 */
export function getRankTier(rating: number): RankTier {
  for (const tier of RANK_TIERS) {
    if (rating >= tier.minRating) return tier;
  }
  return UNRANKED_TIER;
}
