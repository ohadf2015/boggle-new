/**
 * Game State Persistence
 * Redis persistence operations for game state
 */

import type { GameState, RedisClient } from './types';

const logger = require('../../utils/logger');

// Redis client (lazy loaded to avoid circular dependencies)
let redisClient: RedisClient | null = null;

function getRedisClient(): RedisClient {
  if (!redisClient) {
    try {
      redisClient = require('../../redisClient');
    } catch {
      redisClient = {
        saveGameState: async () => {},
        getGameState: async () => null,
        deleteGameState: async () => {}
      };
    }
  }
  return redisClient as RedisClient;
}

// Debounce timers for persistence
const persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const PERSIST_DEBOUNCE_MS = 1000;

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

    games[gameCode] = {
      gameCode,
      hostSocketId: null,
      hostUsername: null,
      roomName: redisState.roomName,
      language: redisState.language || 'en',
      users: {},
      spectators: {},
      playerScores: redisState.playerScores || {},
      playerWords: redisState.playerWords || {},
      playerAchievements: redisState.playerAchievements || {},
      playerCombos: {},
      gameState: redisState.gameState || 'waiting',
      letterGrid: redisState.letterGrid,
      timerSeconds: redisState.timerSeconds || 180,
      tournamentId: redisState.tournamentId,
      reconnectionTimeout: null,
      isRanked: false,
      allowLateJoin: true,
      aiApprovedWords: [],
      peerValidationWord: null,
      peerValidationVotes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      restoredFromRedis: true,
      gameSessionId: 0,
      playersReadyForNextGame: {}
    };

    return games[gameCode];
  } catch (error) {
    logger.error('PERSIST', `Failed to restore game ${gameCode} from Redis`, error);
    return null;
  }
}

export async function getAllGameCodesFromRedis(): Promise<string[]> {
  try {
    const redis = getRedisClient();
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

export function clearPersistTimer(gameCode: string): void {
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }
}
