/**
 * Game Processing Module
 * Orchestrates processing game results for all players
 */

import {
  isSupabaseConfigured,
  GameStats,
  PlayerScore,
  GameInfo,
  UserAuthInfo,
  XpResultWithSocket,
  LifetimeAchievement
} from './client';
import { recordGameResult } from './gameResults';
import { updatePlayerStats } from './playerStats';
import { updateLeaderboardEntry, updateRankedProgress } from './leaderboard';
import { updateGuestStats } from './guestTokens';

const logger = require('../../utils/logger');

// Lazy import for gameSessionLogger
let _logGameSession: ((sessionData: unknown) => Promise<string | null>) | null = null;
function getGameSessionLogger() {
  if (!_logGameSession) {
    _logGameSession = require('../gameSessionLogger').logGameSession;
  }
  return _logGameSession;
}

// Lazy import for lifetime achievement checking
let _checkLifetimeAchievements: ((userStats: unknown, existingAchievements?: string[]) => { key: string; icon: string }[]) | null = null;
function getLifetimeAchievementChecker() {
  if (!_checkLifetimeAchievements) {
    _checkLifetimeAchievements = require('../achievementManager').checkLifetimeAchievements;
  }
  return _checkLifetimeAchievements;
}

// Lazy import for Redis cache invalidation (targeted version)
let _invalidateUserLeaderboardCaches: ((userIds: string[]) => Promise<void>) | null = null;
function getTargetedLeaderboardCacheInvalidator() {
  if (!_invalidateUserLeaderboardCaches) {
    _invalidateUserLeaderboardCaches = require('../../redisClient').invalidateUserLeaderboardCaches;
  }
  return _invalidateUserLeaderboardCaches;
}

export interface PlayerResultOutput {
  username: string;
  xpResult: XpResultWithSocket | null;
  lifetimeAchievements: LifetimeAchievement[];
}

export interface GameResultsOutput {
  xpResults: Record<string, XpResultWithSocket>;
  lifetimeAchievements: Record<string, LifetimeAchievement[]>;
}

/**
 * Process a single player's game results
 * Returns XP info and lifetime achievements for authenticated users
 */
async function processPlayerResult(
  playerScore: PlayerScore,
  gameCode: string,
  gameInfo: GameInfo,
  authInfo: UserAuthInfo,
  totalPlayers: number
): Promise<PlayerResultOutput> {
  const gameStats: GameStats = {
    score: playerScore.score,
    wordCount: playerScore.wordCount || 0,
    longestWord: playerScore.longestWord,
    placement: playerScore.placement,
    achievements: playerScore.achievements || [],
    isRanked: gameInfo.isRanked || false,
    totalPlayers,
    timePlayed: gameInfo.timePlayed || 0
  };

  let xpResult: XpResultWithSocket | null = null;
  let lifetimeAchievements: LifetimeAchievement[] = [];

  try {
    if (authInfo.authUserId) {
      // Authenticated user - run operations in parallel where possible
      logger.debug('SUPABASE', `Recording result for authenticated user: ${playerScore.username}`);

      // Phase 1: Record game result and update profile stats in parallel
      const [gameResultRes, statsRes] = await Promise.all([
        recordGameResult({
          playerId: authInfo.authUserId,
          gameCode,
          ...gameStats,
          language: gameInfo.language
        }),
        updatePlayerStats(authInfo.authUserId, gameStats)
      ]);

      if (gameResultRes.error) {
        logger.error('SUPABASE', `recordGameResult error for ${playerScore.username}`, gameResultRes.error.message);
      }
      if (statsRes.error) {
        logger.error('SUPABASE', `updatePlayerStats error for ${playerScore.username}`, statsRes.error.message);
      }

      // Store XP info for socket emission
      if (statsRes.xpInfo) {
        xpResult = {
          ...statsRes.xpInfo,
          socketId: authInfo.socketId,
        };
        logger.debug('XP', `${playerScore.username} earned ${statsRes.xpInfo.xpEarned} XP`);
      }

      // Check for lifetime achievements based on updated stats
      if (statsRes.updatedStats) {
        const checkLifetimeAchievements = getLifetimeAchievementChecker();
        if (checkLifetimeAchievements) {
          const existingAchievements = playerScore.achievements || [];
          const newLifetimeAchievements = checkLifetimeAchievements(statsRes.updatedStats, existingAchievements);
          if (newLifetimeAchievements.length > 0) {
            lifetimeAchievements = newLifetimeAchievements;
            logger.info('ACHIEVEMENT', `${playerScore.username} earned lifetime achievements: ${newLifetimeAchievements.map(a => a.key).join(', ')}`);
          }
        }
      }

      // Phase 2: Update leaderboard and ranked progress in parallel
      const secondaryOps: Promise<{ data: unknown; error: { message: string } | null }>[] = [
        updateLeaderboardEntry(authInfo.authUserId)
      ];

      if (!gameInfo.isRanked) {
        secondaryOps.push(updateRankedProgress(authInfo.authUserId));
      }

      const secondaryResults = await Promise.all(secondaryOps);

      if (secondaryResults[0]?.error) {
        logger.error('SUPABASE', `updateLeaderboardEntry error for ${playerScore.username}`, secondaryResults[0].error.message);
      }
      if (secondaryResults[1]?.error) {
        logger.error('SUPABASE', `updateRankedProgress error for ${playerScore.username}`, secondaryResults[1].error.message);
      }

    } else if (authInfo.guestTokenHash) {
      // Guest user - update guest token stats
      logger.debug('SUPABASE', `Recording result for guest: ${playerScore.username}`);
      await updateGuestStats(authInfo.guestTokenHash, gameStats);
    }

    // Log game session for ALL players (authenticated and guests) for admin analytics
    if (authInfo.authUserId || authInfo.guestSessionId) {
      try {
        const logGameSession = getGameSessionLogger();
        if (logGameSession) {
          await logGameSession({
            userId: authInfo.authUserId || null,
            guestSessionId: authInfo.guestSessionId || null,
            mode: 'multiplayer',
            language: gameInfo.language || 'en',
            score: gameStats.score || 0,
            wordsFound: [],
            durationSeconds: gameStats.timePlayed || 0,
            completed: true,
            roomCode: gameCode,
            playerCount: totalPlayers,
            finalRank: gameStats.placement || null,
            startedAt: new Date(),
            completedAt: new Date(),
          });
          logger.debug('SUPABASE', `Logged game session for ${playerScore.username}`);
        }
      } catch (sessionError) {
        logger.error('SUPABASE', `Failed to log game session for ${playerScore.username}`, sessionError);
      }
    }
  } catch (error) {
    logger.error('SUPABASE', `Error processing result for ${playerScore.username}`, error);
  }

  return { username: playerScore.username, xpResult, lifetimeAchievements };
}

/**
 * Process game results for all players after a game ends
 * Uses parallel processing to reduce database round-trips
 */
export async function processGameResults(
  gameCode: string,
  scores: PlayerScore[],
  gameInfo: GameInfo,
  userAuthMap: Record<string, UserAuthInfo>
): Promise<GameResultsOutput> {
  const xpResults: Record<string, XpResultWithSocket> = {};
  const lifetimeAchievements: Record<string, LifetimeAchievement[]> = {};

  if (!isSupabaseConfigured()) {
    logger.debug('SUPABASE', 'Not configured, skipping game result recording');
    return { xpResults, lifetimeAchievements };
  }

  logger.info('SUPABASE', `Processing game results for ${gameCode}, ${scores.length} players (parallel)`);

  // Filter players with auth info and process all in parallel
  const playerPromises = scores
    .filter(playerScore => userAuthMap[playerScore.username])
    .map(playerScore =>
      processPlayerResult(
        playerScore,
        gameCode,
        gameInfo,
        userAuthMap[playerScore.username],
        scores.length
      )
    );

  // Wait for all players to be processed in parallel
  const results = await Promise.all(playerPromises);

  // Collect XP results and lifetime achievements
  for (const result of results) {
    if (result.xpResult) {
      xpResults[result.username] = result.xpResult;
    }
    if (result.lifetimeAchievements && result.lifetimeAchievements.length > 0) {
      lifetimeAchievements[result.username] = result.lifetimeAchievements;
    }
  }

  // Invalidate leaderboard caches only for players who participated (targeted invalidation)
  try {
    const invalidateUserLeaderboardCaches = getTargetedLeaderboardCacheInvalidator();
    if (invalidateUserLeaderboardCaches) {
      // Extract authenticated user IDs from the auth map
      const userIds = Object.values(userAuthMap)
        .filter(auth => auth.authUserId)
        .map(auth => auth.authUserId as string);

      if (userIds.length > 0) {
        await invalidateUserLeaderboardCaches(userIds);
        logger.debug('SUPABASE', `Leaderboard caches invalidated for ${userIds.length} users`);
      }
    }
  } catch (cacheError) {
    logger.warn('SUPABASE', 'Failed to invalidate leaderboard caches', cacheError);
  }

  return { xpResults, lifetimeAchievements };
}

// CommonJS exports for backward compatibility
module.exports = {
  processGameResults,
};
