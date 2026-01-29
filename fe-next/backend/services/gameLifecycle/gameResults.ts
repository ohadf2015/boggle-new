/**
 * Game Results Service
 *
 * Handles recording game results to Supabase and emitting XP/engagement events.
 */

import type { Server } from 'socket.io';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../../modules/gameState/types';
import { processGameResults, isSupabaseConfigured } from '../../modules/supabaseServer';
import type { GameResultsOutput } from '../../modules/supabase/gameProcessing';
import type { UserAuthInfo } from '../../modules/supabase/client';
import { getSocketById, safeEmit } from '../../utils/socketHelpers';
import { incrementWordApproval } from '../../redis/wordApproval';
import { processGameEndEngagement, processAchievementEngagement } from '../../handlers/engagementHandler';
import logger from '../../utils/logger';
import type { PlayerResult, UserData } from './types';

/**
 * Record game results to Supabase and emit XP/engagement events
 */
export async function recordGameResultsToSupabase(
  io: Server,
  gameCode: string,
  scoresArray: PlayerResult[],
  game: GameState
): Promise<void> {
  try {
    // Build userAuthMap from game.users
    const userAuthMap: Record<string, UserAuthInfo> = {};

    for (const [username, userData] of Object.entries(game.users || {}) as [
      string,
      UserData
    ][]) {
      userAuthMap[username] = {
        authUserId: userData.authUserId,
        guestTokenHash: userData.guestTokenHash,
        guestSessionId: userData.guestSessionId,
        socketId: userData.socketId,
      };
    }

    // Build gameInfo from game object
    const gameInfo = {
      language: game.language || 'en',
      isRanked: game.isRanked || false,
      timePlayed: game.timerSeconds || 0,
    };

    // Sort scores to calculate placements for stats recording
    const sortedForStats = [...scoresArray].sort(
      (a, b) => b.totalScore - a.totalScore
    );
    const totalPlayersInGame = scoresArray.length;

    // Map PlayerResult[] to PlayerScore[] format expected by processGameResults
    const mappedScores = scoresArray.map((playerResult) => {
      const placement =
        sortedForStats.findIndex((p) => p.username === playerResult.username) + 1;
      const longestWord =
        playerResult.wordDetails?.reduce(
          (max: string, w: WordDetail) =>
            (w.word?.length || 0) > (max?.length || 0) ? w.word : max,
          ''
        ) || '';

      return {
        username: playerResult.username,
        score: playerResult.totalScore || 0,
        wordCount: playerResult.wordDetails?.length || 0,
        longestWord,
        placement,
        achievements: playerResult.achievements?.map((a) => a.key) || [],
        totalPlayers: totalPlayersInGame,
      };
    });

    const results: GameResultsOutput = await processGameResults(
      gameCode,
      mappedScores,
      gameInfo,
      userAuthMap
    );
    logger.info('SUPABASE', `Game ${gameCode} results recorded`);

    // Emit XP events to each player
    emitXpEvents(io, results, game);

    // Emit lifetime achievements to players
    emitLifetimeAchievements(io, results, game);

    // Process engagement events for each player
    await processEngagementEvents(io, scoresArray, game, gameCode);

    // Increment word approval counts for dictionary words
    // OPTIMIZATION: Batch all operations with Promise.all instead of sequential awaits
    // This reduces score processing time from 10+ seconds to ~100ms for typical games
    await incrementWordApprovals(scoresArray, game.language || 'en', gameCode);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('SUPABASE', `Failed to record game results: ${error.message}`);
  }
}

/**
 * Emit XP gained and level up events to players
 */
 
function emitXpEvents(io: Server, results: any, game: GameState): void {
  if (!results.xpResults) return;

   
  for (const [username, xpInfo] of Object.entries(results.xpResults) as [string, any][]) {
    if (xpInfo.socketId) {
      const playerSocket = getSocketById(io, xpInfo.socketId);
      if (playerSocket) {
        // Emit XP gained event
        safeEmit(playerSocket, 'xpGained', {
          xpEarned: xpInfo.xpEarned,
          xpBreakdown: xpInfo.xpBreakdown,
          newTotalXp: xpInfo.newTotalXp,
          newLevel: xpInfo.newLevel,
        });
        logger.debug('XP', `Emitted xpGained to ${username}: +${xpInfo.xpEarned} XP`);

        // Emit level up event if applicable
        if (xpInfo.leveledUp) {
          safeEmit(playerSocket, 'levelUp', {
            oldLevel: xpInfo.oldLevel,
            newLevel: xpInfo.newLevel,
            levelsGained: xpInfo.levelsGained,
            newTitles: xpInfo.newTitles || [],
          });
          logger.info(
            'XP',
            `Emitted levelUp to ${username}: ${xpInfo.oldLevel} -> ${xpInfo.newLevel}`
          );
        }
      }
    }
  }
}

/**
 * Emit lifetime achievement unlock events
 */
 
function emitLifetimeAchievements(
  io: Server,
  results: any,
  game: GameState
): void {
  if (!results.lifetimeAchievements) return;

   
  for (const [username, achievements] of Object.entries(results.lifetimeAchievements) as [string, any[]][]) {
    if (achievements.length > 0) {
      // Find the user's socket
      const userData = game.users?.[username] as UserData | undefined;
      if (userData?.socketId) {
        const playerSocket = getSocketById(io, userData.socketId);
        if (playerSocket) {
          safeEmit(playerSocket, 'lifetimeAchievementsUnlocked', {
            achievements: achievements,
          });
          logger.info(
            'ACHIEVEMENT',
            `Emitted ${achievements.length} lifetime achievement(s) to ${username}: ${achievements.map((a) => a.key).join(', ')}`
          );
        }
      }
    }
  }
}

/**
 * Process engagement events for each player
 * Handles daily challenges, near-misses, mystery rewards
 */
async function processEngagementEvents(
  io: Server,
  scoresArray: PlayerResult[],
  game: GameState,
  gameCode: string
): Promise<void> {
  const playerCount = scoresArray.length;
  const sortedScores = [...scoresArray].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const winnerUsername = sortedScores[0]?.username;

  for (const playerResult of scoresArray) {
    const userData = game.users?.[playerResult.username] as UserData | undefined;
    if (!userData) continue;

    const playerSocket = getSocketById(io, userData.socketId);
    const playerId = userData.authUserId;

    // Build game stats for engagement processing
    const gameStats = {
      score: playerResult.totalScore || 0,
      wordCount: playerResult.wordDetails?.length || 0,
      longestWord:
        playerResult.wordDetails?.reduce(
          (max: string, w: WordDetail) =>
            (w.word?.length || 0) > (max?.length || 0) ? w.word : max,
          ''
        ) || '',
      isWinner: playerResult.username === winnerUsername && playerCount > 1,
      placement:
        sortedScores.findIndex((p) => p.username === playerResult.username) + 1,
      playerCount,
      achievements: playerResult.achievements?.map((a) => a.key) || [],
    };

    // Process engagement (daily challenges, near-misses, mystery rewards)
    // Mystery rewards are delayed by 15 seconds to avoid overwhelming users
    if (playerSocket && playerId) {
      setTimeout(async () => {
        await processGameEndEngagement(playerSocket, playerId, gameStats, gameCode);

        // Process achievement engagement for mystery rewards
        for (const achievement of playerResult.achievements || []) {
          await processAchievementEngagement(
            playerSocket,
            playerId,
            achievement.key,
            gameCode
          );
        }
      }, 15000); // 15 second delay
    }
  }
}

/**
 * Increment word approval counts for dictionary words
 * Batched for performance
 */
async function incrementWordApprovals(
  scoresArray: PlayerResult[],
  language: string,
  gameCode: string
): Promise<void> {
  const wordApprovalOps: Promise<unknown>[] = [];

  for (const playerResult of scoresArray) {
    for (const wordDetail of playerResult.wordDetails || []) {
      if (wordDetail.validated && wordDetail.inDictionary) {
        wordApprovalOps.push(incrementWordApproval(wordDetail.word, language, gameCode));
      }
    }
  }

  if (wordApprovalOps.length > 0) {
    await Promise.all(wordApprovalOps);
  }
}

export { isSupabaseConfigured };
