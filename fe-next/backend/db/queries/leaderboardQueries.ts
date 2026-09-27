/**
 * Type-safe leaderboard queries using Drizzle ORM.
 */
import { desc, eq } from 'drizzle-orm';
import { getDrizzleClient } from '../drizzle';
import { profiles, leaderboard, gameResults } from '../schema';

export interface TopPlayersOptions {
  /** Restrict results to a specific season. Omit to query all rows. */
  seasonId?: number;
}

export async function getTopPlayersByScore(
  limit = 20,
  opts: TopPlayersOptions = {}
) {
  const db = getDrizzleClient();
  const baseSelect = db
    .select({
      playerId: leaderboard.playerId,
      username: leaderboard.username,
      displayName: leaderboard.displayName,
      avatarEmoji: leaderboard.avatarEmoji,
      avatarColor: leaderboard.avatarColor,
      totalScore: leaderboard.totalScore,
      gamesPlayed: leaderboard.gamesPlayed,
      gamesWon: leaderboard.gamesWon,
      rankPosition: leaderboard.rankPosition,
      totalXp: leaderboard.totalXp,
      currentLevel: leaderboard.currentLevel,
      seasonId: leaderboard.seasonId,
    })
    .from(leaderboard);

  const filtered = opts.seasonId !== undefined
    ? baseSelect.where(eq(leaderboard.seasonId, opts.seasonId))
    : baseSelect;

  return filtered.orderBy(desc(leaderboard.totalScore)).limit(limit);
}

export async function getTopPlayersByMmr(limit = 20) {
  const db = getDrizzleClient();
  return db
    .select({
      playerId: leaderboard.playerId,
      username: leaderboard.username,
      avatarEmoji: leaderboard.avatarEmoji,
      avatarColor: leaderboard.avatarColor,
      rankedMmr: leaderboard.rankedMmr,
      gamesWon: leaderboard.gamesWon,
    })
    .from(leaderboard)
    .orderBy(desc(leaderboard.rankedMmr))
    .limit(limit);
}

export async function getPlayerStats(userId: string) {
  const db = getDrizzleClient();
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
}

export async function getPlayerRecentGames(userId: string, limit = 10) {
  const db = getDrizzleClient();
  return db
    .select()
    .from(gameResults)
    .where(eq(gameResults.playerId, userId))
    .orderBy(desc(gameResults.createdAt))
    .limit(limit);
}
