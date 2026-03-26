/**
 * Type-safe leaderboard queries using Drizzle ORM.
 */
import { desc, eq, sql } from 'drizzle-orm';
import { getDrizzleClient } from '../drizzle';
import { profiles, leaderboard, gameResults } from '../schema';

export async function getTopPlayersByScore(limit = 20) {
  const db = getDrizzleClient();
  return db
    .select({
      playerId: leaderboard.playerId,
      username: leaderboard.username,
      avatarEmoji: leaderboard.avatarEmoji,
      avatarColor: leaderboard.avatarColor,
      totalScore: leaderboard.totalScore,
      gamesPlayed: leaderboard.gamesPlayed,
      gamesWon: leaderboard.gamesWon,
      rankPosition: leaderboard.rankPosition,
      totalXp: leaderboard.totalXp,
      currentLevel: leaderboard.currentLevel,
    })
    .from(leaderboard)
    .orderBy(desc(leaderboard.totalScore))
    .limit(limit);
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
