/** Catch-up ("rubber band") bonus for trailing humans in 3+ human rooms. */

export const CATCH_UP_MAX_PCT = 0.2;
const CATCH_UP_MIN_HUMANS = 3;
const CATCH_UP_FULL_GAP = 300;

/** Fraction of the word score (0..0.2) paid as a catch-up bonus. */
export function computeCatchUpBonus(rank: number, playerCount: number, scoreGapToLeader: number): number {
  if (playerCount < CATCH_UP_MIN_HUMANS || rank <= 1 || scoreGapToLeader <= 0) return 0;
  const rankFactor = Math.min(1, (rank - 1) / (playerCount - 1));
  const gapFactor = Math.min(1, scoreGapToLeader / CATCH_UP_FULL_GAP);
  return Math.round(CATCH_UP_MAX_PCT * rankFactor * gapFactor * 100) / 100;
}

interface CatchUpGame {
  users: Record<string, { isBot?: boolean; isHost?: boolean } | undefined>;
  playerScores?: Record<string, number>;
  isRanked?: boolean;
  isClassroom?: boolean;
  tvMode?: boolean;
}

export interface CatchUpAward {
  bonus: number;
  pct: number;
  rank: number;
}

export function catchUpForPlayer(game: CatchUpGame, username: string, preScore: number, wordScore: number): CatchUpAward | null {
  if (game.isRanked || game.users[username]?.isBot) return null;
  const spectatingHost = game.isClassroom || game.tvMode;
  const humans = Object.entries(game.users)
    .filter(([, u]) => u && !u.isBot && !(spectatingHost && u.isHost))
    .map(([name]) => name);
  if (!humans.includes(username)) return null;

  const scoreOf = (name: string): number => (name === username ? preScore : game.playerScores?.[name] ?? 0);
  const leaderScore = Math.max(...humans.map(scoreOf));
  const rank = 1 + humans.filter((name) => scoreOf(name) > preScore).length;
  const pct = computeCatchUpBonus(rank, humans.length, leaderScore - preScore);
  const bonus = Math.round(wordScore * pct);
  return bonus > 0 ? { bonus, pct, rank } : null;
}
