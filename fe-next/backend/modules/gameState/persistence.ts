/**
 * Game State Persistence
 * Redis persistence operations for game state
 */

import type { GameState, RedisClient } from './types';

import logger from '../../utils/logger';
import * as redisClientModule from '../../redisClient';

function getRedisClient(): RedisClient {
  return redisClientModule as unknown as RedisClient;
}

// Debounce timers for persistence
const persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const PERSIST_DEBOUNCE_MS = parseInt(process.env.PERSIST_DEBOUNCE_MS || '200', 10);

export function persistGameState(
  gameCode: string,
  games: Record<string, GameState>
): void {
  if (persistTimers[gameCode]) clearTimeout(persistTimers[gameCode]);

  persistTimers[gameCode] = setTimeout(async () => {
    const game = games[gameCode];
    if (!game) {
      delete persistTimers[gameCode];
      return;
    }

    try {
      await getRedisClient().saveGameState(gameCode, game);
      logger.debug('PERSIST', `Game ${gameCode} persisted to Redis`);
    } catch (error) {
      logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
    }
    delete persistTimers[gameCode];
  }, PERSIST_DEBOUNCE_MS);
}

export async function persistGameStateNow(
  gameCode: string,
  games: Record<string, GameState>
): Promise<void> {
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }

  const game = games[gameCode];
  if (!game) return;

  try {
    await getRedisClient().saveGameState(gameCode, game);
    logger.debug('PERSIST', `Game ${gameCode} immediately persisted to Redis`);
  } catch (error) {
    logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
  }
}

export async function restoreGameFromRedis(
  gameCode: string,
  games: Record<string, GameState>
): Promise<GameState | null> {
  try {
    const redisState = await getRedisClient().getGameState(gameCode);
    if (!redisState) return null;

    logger.info('PERSIST', `Restoring game ${gameCode} from Redis`);

    // Prefer v2 full user objects; fall back to empty if only v1 username list
    const usersV2 = (redisState as any).usersV2;
    const restoredUsers = (usersV2 && typeof usersV2 === 'object' && !Array.isArray(usersV2))
      ? usersV2 as Record<string, any>
      : {};

    // Null out socket IDs — they're stale after crash
    for (const user of Object.values(restoredUsers)) {
      if (user && typeof user === 'object') {
        (user as any).socketId = null;
      }
    }

    const spectators = (redisState as any).spectators;
    const restoredSpectators = (spectators && typeof spectators === 'object' && !Array.isArray(spectators))
      ? spectators as Record<string, any>
      : {};

    games[gameCode] = {
      gameCode,
      hostSocketId: null,
      hostUsername: (redisState as any).hostUsername || null,
      hostPlayerId: (redisState as any).hostPlayerId || undefined,
      roomName: redisState.roomName,
      language: redisState.language || 'en',
      users: restoredUsers,
      spectators: restoredSpectators,
      playerScores: redisState.playerScores || {},
      playerWords: redisState.playerWords || {},
      playerAchievements: redisState.playerAchievements || {},
      playerCombos: (redisState as any).playerCombos || {},
      gameState: redisState.gameState || 'waiting',
      letterGrid: redisState.letterGrid,
      timerSeconds: redisState.timerSeconds || 180,
      remainingTime: redisState.remainingTime ?? undefined,
      gameDuration: (redisState as any).gameDuration ?? undefined,
      minWordLength: (redisState as any).minWordLength ?? undefined,
      difficulty: (redisState as any).difficulty || undefined,
      gameStartedAt: (redisState as any).gameStartedAt ?? undefined,
      tournamentId: redisState.tournamentId,
      reconnectionTimeout: null,
      isRanked: (redisState as any).isRanked ?? false,
      isPrivate: (redisState as any).isPrivate ?? false,
      allowLateJoin: (redisState as any).allowLateJoin ?? true,
      aiApprovedWords: (redisState as any).aiApprovedWords || [],
      peerValidationWord: null,
      peerValidationVotes: (redisState as any).peerValidationVotes || {},
      createdAt: (redisState as any).createdAt || Date.now(),
      lastActivity: (redisState as any).lastActivity || Date.now(),
      restoredFromRedis: true,
      gameSessionId: 0,
      playersReadyForNextGame: {},
      gameMode: (redisState.gameMode as any) || 'classic',
      blastModeState: redisState.blastModeState as any || null,
      wordHuntState: redisState.wordHuntState as any || null,
      chatHistory: (redisState as any).chatHistory || undefined,
      cachedResultsPayload: (redisState as any).cachedResultsPayload || undefined,
    };

    const restored = games[gameCode] as any;

    // Reconstruct Map from serialized entries
    const lpEntries = (redisState as any).letterPositions;
    if (Array.isArray(lpEntries) && lpEntries.length > 0) {
      restored.letterPositions = new Map(lpEntries);
    }

    // Reconstruct Sets from serialized arrays
    const selVocab = (redisState as any).selectedVocabulary;
    if (Array.isArray(selVocab) && selVocab.length > 0) {
      restored.selectedVocabulary = new Set(selVocab);
    }
    const lesVocab = (redisState as any).lessonVocabulary;
    if (Array.isArray(lesVocab) && lesVocab.length > 0) {
      restored.lessonVocabulary = new Set(lesVocab);
    }
    const kicked = (redisState as any).kickedPlayers;
    if (Array.isArray(kicked) && kicked.length > 0) {
      restored.kickedPlayers = new Set(kicked);
    }

    // Reconstruct O(1) lookup Sets from restored word arrays
    restored.playerWordsSet = {};
    for (const [u, words] of Object.entries(restored.playerWords)) {
      restored.playerWordsSet[u] = new Set(words as string[]);
    }

    return games[gameCode];
  } catch (error) {
    logger.error('PERSIST', `Failed to restore game ${gameCode} from Redis`, error);
    return null;
  }
}

export async function getAllGameCodesFromRedis(): Promise<string[]> {
  try {
    const redis = getRedisClient();
    if (redis.getAllGameCodes) return await redis.getAllGameCodes();
    if (redis.getAllGameKeys) return await redis.getAllGameKeys();
    return [];
  } catch (error) {
    logger.error('PERSIST', 'Failed to get game codes from Redis', error);
    return [];
  }
}

export async function deleteGameFromRedis(gameCode: string): Promise<void> {
  try {
    await getRedisClient().deleteGameState?.(gameCode);
  } catch (error) {
    logger.error('PERSIST', `Failed to delete game ${gameCode} from Redis`, error);
  }
}

/**
 * Restore all active games from Redis on server startup.
 * Games that were persisted during graceful shutdown are loaded back into memory
 * so reconnecting players find their game state intact.
 * Games with no players reconnecting within RESTORE_CLEANUP_MS are cleaned up.
 */
const RESTORE_CLEANUP_MS = 2 * 60 * 1000; // 2 minutes

export async function restoreAllGamesFromRedis(
  games: Record<string, GameState>
): Promise<number> {
  try {
    const gameCodes = await getAllGameCodesFromRedis();
    if (gameCodes.length === 0) return 0;

    logger.info('PERSIST', `Found ${gameCodes.length} games in Redis, restoring...`);

    let restored = 0;
    for (const gameCode of gameCodes) {
      try {
        const game = await restoreGameFromRedis(gameCode, games);
        if (game) {
          restored++;
          // Set a cleanup timer — if no players reconnect, clean up the game
          setTimeout(() => {
            const g = games[gameCode];
            if (g && Object.keys(g.users).length === 0) {
              logger.info('PERSIST', `No players reconnected to ${gameCode} within ${RESTORE_CLEANUP_MS / 1000}s, cleaning up`);
              delete games[gameCode];
            }
          }, RESTORE_CLEANUP_MS);
        }
      } catch (error) {
        logger.error('PERSIST', `Failed to restore game ${gameCode}`, error);
      }
    }

    logger.info('PERSIST', `Restored ${restored}/${gameCodes.length} games from Redis`);
    return restored;
  } catch (error) {
    logger.error('PERSIST', 'Failed to restore games from Redis', error);
    return 0;
  }
}

export function clearPersistTimer(gameCode: string): void {
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }
}
